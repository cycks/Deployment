# app/routes/watched.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import subqueryload, joinedload

from app.extensions import db
from app.models.user import User
from app.models.post import Post
from app.models.category import Category

bp = Blueprint("watched", __name__, url_prefix="/api/watched")


# ============================================================
# HELPERS
# ============================================================

def compute_average(ratings):
    """Compute average rating from rating objects."""
    if not ratings:
        return None
    values = [r.value for r in ratings]
    return round(sum(values) / len(values), 2)


def serialize_post(post):
    return {
        "id": post.id,
        "title": post.title,
        "author": {
            "id": post.author.id,
            "username": post.author.username
        } if post.author else None,
        "categories": [{"id": c.id, "name": c.name} for c in post.categories],
        "average_rating": compute_average(post.ratings),
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "is_published": post.is_published,
    }


def get_current_user():
    return User.query.get(get_jwt_identity())


# ============================================================
# WATCH / UNWATCH POST
# ============================================================

@bp.route("/posts/<int:post_id>/watch", methods=["POST"])
@jwt_required()
def mark_post_as_watched(post_id):
    user = get_current_user()
    post = Post.query.get(post_id)

    if not post:
        return jsonify({"message": "Post not found"}), 404

    if post in user.watched:
        return jsonify({"message": "Post already marked as watched"}), 200

    user.watched.append(post)
    db.session.commit()

    return jsonify({"message": "Post marked as watched"}), 200


@bp.route("/posts/<int:post_id>/unwatch", methods=["DELETE"])
@jwt_required()
def unmark_post_as_watched(post_id):
    user = get_current_user()
    post = Post.query.get(post_id)

    if not post:
        return jsonify({"message": "Post not found"}), 404

    if post not in user.watched:
        return jsonify({"message": "Post was not marked as watched"}), 200

    user.watched.remove(post)
    db.session.commit()

    return jsonify({"message": "Post unmarked as watched"}), 200


# ============================================================
# WATCHED POSTS (with details)
# ============================================================

@bp.route("/dashboard/watched", methods=["GET"])
@jwt_required()
def get_watched_posts():
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    category_id = request.args.get("category_id", type=int)

    watched_query = user.watched.options(
        joinedload(Post.author),
        subqueryload(Post.categories),
        subqueryload(Post.ratings),
    )

    if category_id:
        watched_query = watched_query.filter(
            Post.categories.any(Category.id == category_id)
        )

    watched_posts = watched_query.all()
    return jsonify({
        "watched": [serialize_post(p) for p in watched_posts],
        "unwatched": []
    }), 200


# ============================================================
# UNWATCHED POSTS (with details)
# ============================================================

@bp.route("/dashboard/unwatched", methods=["GET"])
@jwt_required()
def get_unwatched_posts():
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    category_id = request.args.get("category_id", type=int)
    watched_ids = {p.id for p in user.watched}

    query = Post.query.options(
        joinedload(Post.author),
        subqueryload(Post.categories),
        subqueryload(Post.ratings),
    )

    if watched_ids:
        query = query.filter(~Post.id.in_(watched_ids))

    if category_id:
        query = query.filter(Post.categories.any(Category.id == category_id))

    unwatched_posts = query.all()
    return jsonify({
        "watched": [],
        "unwatched": [serialize_post(p) for p in unwatched_posts]
    }), 200


# ============================================================
# ALL POSTS (Watched + Unwatched)
# ============================================================

@bp.route("/dashboard/all", methods=["GET"])
@jwt_required()
def get_all_posts_with_watch_status():
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    watched_ids = {p.id for p in user.watched}

    posts = Post.query.options(
        joinedload(Post.author),
        subqueryload(Post.categories),
        subqueryload(Post.ratings),
    ).all()

    watched, unwatched = [], []

    for post in posts:
        data = serialize_post(post)
        if post.id in watched_ids:
            watched.append(data)
        else:
            unwatched.append(data)

    return jsonify({
        "watched": watched,
        "unwatched": unwatched
    }), 200

