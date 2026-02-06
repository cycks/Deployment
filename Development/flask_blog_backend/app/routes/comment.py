# app.routes.comment.py

import bleach
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from app.models.comment import Comment
from app.models.user import User
from app.models.post import Post
from app.models.rating import CommentRating
from app.extensions import db
from app.utils.decorators import role_required

bp = Blueprint("comment", __name__, url_prefix="/api/comments")

# ---------------------------------------------------------------------------
# Allowed HTML Tags
# ---------------------------------------------------------------------------
ALLOWED_TAGS = [
    'p', 'b', 'i', 'u', 'em', 'strong', 'a',
    'ul', 'ol', 'li', 'blockquote', 'code',
    'pre', 'br', 'img', 'h1', 'h2', 'h3'
]

ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height']
}

ALLOWED_PROTOCOLS = ['http', 'https', 'data']


def sanitize_html(content: str) -> str:
    """
    Sanitize user HTML input to prevent XSS using bleach.
    """
    return bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True
    )


# ---------------------------------------------------------------------------
# Add Comment
# ---------------------------------------------------------------------------
@bp.route("/add_comment/<int:post_id>", methods=["POST"])
@jwt_required()
def add_comment(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or user.is_blocked:
        return jsonify({"msg": "Account disabled"}), 403

    data = request.get_json() or {}
    content = data.get("content", "").strip()

    if not content:
        return jsonify({"msg": "Content is required"}), 400

    sanitized = sanitize_html(content)

    comment = Comment(
        content=sanitized,
        post_id=post_id,
        user_id=user.id
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify({"msg": "Comment added", "comment_id": comment.id}), 201


# ---------------------------------------------------------------------------
# 1. GET COMMENTS FOR POST
# ---------------------------------------------------------------------------
@bp.route("/posts/<int:post_id>", methods=["GET"])
def get_comments_for_post(post_id):
    if not Post.query.get(post_id):
        return jsonify({"msg": "Post not found"}), 404

    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(50, request.args.get("per_page", 10, type=int))

    # Single query to get comments and their average ratings
    query = (
        db.session.query(
            Comment, 
            func.avg(CommentRating.value).label("avg_rating")
        )
        .outerjoin(CommentRating, Comment.id == CommentRating.comment_id)
        .filter(Comment.post_id == post_id)
        .group_by(Comment.id)
        .order_by(Comment.created_at.desc())
    )

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    results = []
    for c, avg_rating in pagination.items:
        results.append({
            "id": c.id,
            "content": c.content,
            "author": c.commenter.username if c.commenter else "Deleted User",
            "created_at": c.created_at.isoformat(),
            "rating": round(float(avg_rating), 2) if avg_rating else None
        })

    return jsonify({
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "comments": results,
    }), 200

# ---------------------------------------------------------------------------
# Delete Comment
# ---------------------------------------------------------------------------
@bp.route("/delete_comment/<int:comment_id>", methods=["DELETE"])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    comment = Comment.query.get(comment_id)

    if not comment:
        return jsonify({"msg": "Comment not found"}), 404

    user = User.query.get(user_id)

    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    is_owner = comment.user_id == user_id
    is_admin = user.role in ["admin", "superadmin"]

    if not (is_owner or is_admin):
        return jsonify({"msg": "Permission denied"}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({"msg": "Comment deleted"}), 200


# ---------------------------------------------------------------------------
# Rate Comment
# ---------------------------------------------------------------------------
@bp.route("/rate/<int:comment_id>", methods=["POST"])
@jwt_required()
def rate_comment(comment_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    comment = Comment.query.get(comment_id)

    if not user or not comment:
        return jsonify({"msg": "Invalid user or comment"}), 404

    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    data = request.get_json() or {}
    value = data.get("value")

    if value is None or not (1 <= value <= 5):
        return jsonify({"msg": "Rating must be between 1 and 5"}), 400

    rating = CommentRating.query.filter_by(
        user_id=user.id, comment_id=comment_id
    ).first()

    if rating:
        rating.value = value
        msg = "Rating updated"
    else:
        rating = CommentRating(
            user_id=user.id,
            comment_id=comment_id,
            value=value,
        )
        db.session.add(rating)
        msg = "Rating submitted"

    db.session.commit()
    return jsonify({"msg": msg}), 200


# ---------------------------------------------------------------------------
# Edit Comment
# ---------------------------------------------------------------------------
@bp.route("/edit_comment/<int:comment_id>", methods=["PUT"])
@jwt_required()
def edit_comment(comment_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    comment = Comment.query.get_or_404(comment_id)

    if comment.user_id != user_id and user.role not in ["admin", "superadmin"]:
        return jsonify({"msg": "Forbidden"}), 403

    data = request.get_json() or {}
    content = data.get("content", "").strip()

    if not content:
        return jsonify({"msg": "Content is required"}), 400

    comment.content = sanitize_html(content)
    db.session.commit()

    return jsonify({
        "msg": "Comment updated",
        "comment": {
            "id": comment.id,
            "content": comment.content,
            "post_id": comment.post_id,
            "user_id": comment.user_id,
            "created_at": comment.created_at.isoformat(),
        }
    }), 200
