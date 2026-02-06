# app/routes/post.py
import os
import bleach
from math import ceil
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
)
from werkzeug.utils import secure_filename
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload, subqueryload

from app.extensions import db
from app.models.user import User
from app.models.post import Post
from app.models.image import Image
from app.models.category import Category
from app.models.comment import Comment
from app.models.rating import PostRating, CommentRating
from app.models.rejections import RejectedRequest
from app.utils.decorators import role_required

bp = Blueprint("post", __name__, url_prefix="/api/posts")

# ---------------------------
# Configuration
# ---------------------------



MAX_PER_PAGE = 50


# ---------------------------
# Utilities
# ---------------------------
ALLOWED_TAGS = [
    "p", "b", "i", "u", "em", "strong", "a",
    "ul", "ol", "li", "blockquote", "code",
    "pre", "br", "img", "h1", "h2", "h3"
]
ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target"],
    "img": ["src", "alt", "title", "width", "height"]
}


def get_upload_dir():
    # 1. Get base folder (defaulting to 'static/uploads')
    base_folder = current_app.config.get("UPLOAD_FOLDER", "static/uploads")

    # 2. Build the relative path
    relative_path = os.path.join(base_folder, "PostPics")

    # 3. Join with root_path to get the absolute path on the server
    abs_path = os.path.abspath(os.path.join(current_app.root_path, relative_path))

    # 4. Create directory if it doesn't exist
    # exist_ok=True prevents an error if the folder was created by another process
    try:
        os.makedirs(abs_path, exist_ok=True)
    except OSError as e:
        # Logs an error if Docker permissions prevent folder creation
        current_app.logger.error(f"Directory creation failed: {e}")
        raise

    return abs_path

def sanitize_html(content: str) -> str:
    if content is None:
        return ""
    return bleach.clean(content, tags=ALLOWED_TAGS,
                         attributes=ALLOWED_ATTRIBUTES,
                           strip=True)


def allowed_file(filename):
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    allowed = current_app.config.get(
        "ALLOWED_EXTENSIONS", {"png", "jpg", "jpeg", "gif"}
    )
    return ext in allowed


def get_image_base_url():
    return current_app.config.get("IMAGE_BASE_URL", "")

def get_allowed_extensions():
    return current_app.config.get("ALLOWED_EXTENSIONS", {"png", "jpg", "jpeg", "gif"})



def save_file(file_storage):
    UPLOAD_DIR = get_upload_dir()
    filename = "post_"+secure_filename(file_storage.filename)
    target = os.path.join(UPLOAD_DIR, filename)
    file_storage.save(target)
    return filename


def file_url(filename: str) -> str:
    if not filename:
        return None
    if filename.startswith("http://") or filename.startswith("https://"):
        return filename
    return f"{get_image_base_url()}PostPics/{filename}"


def avg_rating_for_post(post_id):
    avg = db.session.query(func.avg(PostRating.value)).filter_by(post_id=post_id).scalar()
    return round(avg, 2) if avg is not None else None


def avg_rating_for_comment(comment_id):
    avg = db.session.query(func.avg(CommentRating.value)).filter_by(comment_id=comment_id).scalar()
    return round(avg, 2) if avg is not None else None


def paginate_query(query, page, per_page):
    per_page = max(1, min(per_page, MAX_PER_PAGE))
    page = max(1, page)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return pagination


# ---------------------------
# Routes
# ---------------------------

@bp.route('/check-title', methods=['POST'])
def check_title():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    exists = Post.query.filter(func.lower(Post.title) == title.lower()).first() is not None
    return jsonify({"exists": exists}), 200


@bp.route("/<int:post_id>/publish", methods=["PUT"])
@jwt_required()
def publish_post(post_id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")

    user = User.query.get(user_id)
    if not user or not user.is_approved or user.is_blocked:
        return jsonify({"msg": "Unauthorized"}), 403

    # Instead of a decorator, check manually to send a custom message
    if role not in ["admin", "superadmin"]:
        return jsonify({
            "status": "restricted",
            "msg": "Authors cannot publish their own posts. Contact an admin."
        }), 403

    post = Post.query.get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404

    if post.is_published:
        return jsonify({"msg": "Post is already published"}), 400

    post.is_published = True
    db.session.commit()

    return jsonify({
        "msg": "Post published successfully",
        "post_id": post.id,
        "is_published": True
    }), 200


@bp.route("/<int:post_id>/unpublish", methods=["PUT"])
@jwt_required()
def unpublish_post(post_id):
    claims = get_jwt()
    role = claims.get("role")

    # Instead of a decorator, check manually to send a custom message
    if role not in ["admin", "superadmin"]:
        return jsonify({
            "status": "restricted",
            "msg": "Authors cannot unpublish their own posts. Contact an admin."
        }), 403

    post = Post.query.get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404

    post.is_published = False
    db.session.commit()

    return jsonify({
        "msg": "Post reverted to draft",
        "post_id": post.id,
        "is_published": False
    }), 200



@bp.route("/create_post", methods=["POST"])
@jwt_required()
def create_post():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")
    user = User.query.get(user_id)

    if not user or not user.is_approved or user.is_blocked:
        return jsonify({"msg": "Unauthorized"}), 403

    if role not in ["author", "admin", "superadmin"]:
        return jsonify({"msg": "Not allowed to create posts"}), 403

    # Accept multipart/form-data (form fields + files)
    title = sanitize_html(request.form.get("title"))
    raw_content = request.form.get("content")
    content = sanitize_html(raw_content)
    category_ids_raw = request.form.getlist("categories")
    main_image = request.files.get("main_image")

    if not title or not content or not main_image:
        return jsonify({"msg": "Title, content and one main image are required"}), 400

    # Duplicate title check
    if Post.query.filter(func.lower(Post.title) == title.lower()).first():
        return jsonify({"msg": "A post with this title already exists"}), 400
    
    # --- IMAGE SIZE CHECK (1MB Limit) ---
    if main_image:
        # Move cursor to the end of the file to see the size
        main_image.seek(0, 2)
        file_size = main_image.tell()
        # Move cursor back to the start so we can still save it later
        main_image.seek(0)

        if file_size > 1 * 1024 * 1024:  # 1MB in bytes
            return jsonify({
                "msg": "Image too large. Maximum size is 1MB.",
                "error_code": "FILE_TOO_LARGE"
            }), 413

    # Cast category ids
    category_ids = []
    if category_ids_raw:
        try:
            category_ids = [int(cid) for cid in category_ids_raw]
        except ValueError:
            return jsonify({"msg": "Invalid category ID format"}), 400

    categories = Category.query.filter(Category.id.in_(category_ids)).all() if category_ids else []

    # Save post (flush to get id)
    post = Post(title=title, content=content, author_id=user_id)
    if categories:
        post.categories = categories

    db.session.add(post)
    db.session.flush()

    # save main image
    if not allowed_file(main_image.filename):
        db.session.rollback()
        return jsonify({"msg": "Invalid main image file type"}), 400

    filename = save_file(main_image)
    img = Image(file_path=filename, post_id=post.id)
    db.session.add(img)

    db.session.commit()

    return jsonify({
        "msg": "Post created",
        "post_id": post.id,
        "categories": [c.name for c in post.categories],
        "main_image": file_url(filename)
    }), 201


@bp.route("/<int:post_id>", methods=["DELETE"])
@role_required("admin", "superadmin")
def delete_post(post_id):
    post = Post.query.options(subqueryload(Post.images)).get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404
    UPLOAD_DIR = get_upload_dir()
    # Attempt to delete image files (best-effort)
    for image in getattr(post, "images", []):
        try:
            path = os.path.join(UPLOAD_DIR, image.file_path)
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            # Log in real app
            pass

    db.session.delete(post)
    db.session.commit()
    return jsonify({"msg": "Post deleted"}), 200


@bp.route("", methods=["GET"])
def list_posts():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    per_page = max(1, min(per_page, MAX_PER_PAGE))

    query = Post.query.filter_by(is_published=True).order_by(Post.created_at.desc())
    pagination = paginate_query(query, page, per_page)

    posts = []
    for p in pagination.items:
        first_img = p.images[0].file_path if p.images else None
        posts.append({
            "id": p.id,
            "title": p.title,
            "content": (p.content[:300] + ("..." if len(p.content) > 300 else "")),
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "author": p.author.username if p.author else None,
            "categories": [{"id": c.id, "name": c.name} for c in p.categories],
            "images": [file_url(img.file_path) for img in p.images],
            "rating": avg_rating_for_post(p.id)
        })

    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page,
        "posts": posts
    }), 200


@bp.route("/posts_by_category", methods=["GET"])
def list_posts_by_category():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    per_page = max(1, min(per_page, MAX_PER_PAGE))

    search_query = request.args.get("q", "").strip()
    category_id = request.args.get("category_id", type=int)

    query = Post.query.filter(Post.is_published.is_(True)).order_by(Post.created_at.desc())

    if category_id:
        query = query.filter(Post.categories.any(Category.id == category_id))

    if search_query:
        pat = f"%{search_query}%"
        query = query.filter(or_(Post.title.ilike(pat), Post.content.ilike(pat)))

    pagination = paginate_query(query, page, per_page)

    result = []
    for p in pagination.items:
        # Get first image file path or None
        first_image = p.images[0].file_path if p.images else None
        result.append({
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "image_url": file_url(p.image_url),            # ✅ NEW FIELD
            "images": [file_url(img.file_path) for img in p.images],
            "rating": avg_rating_for_post(p.id)
        })

    return jsonify({
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
        "posts": result
    }), 200

@bp.route("/by_category/<int:category_id>", methods=["GET"])
@jwt_required()
def get_posts_by_category(category_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    per_page = max(1, min(per_page, MAX_PER_PAGE))

    query = (
        Post.query.filter(Post.categories.any(Category.id == category_id))
        .order_by(Post.created_at.desc())
        .options(
            joinedload(Post.author),
            subqueryload(Post.categories),
            subqueryload(Post.ratings)
        )
    )

    pagination = paginate_query(query, page, per_page)
    watched_ids = {p.id for p in user.watched}

    watched_data, unwatched_data = [], []

    for p in pagination.items:
        avg_rating = (
            round(sum([r.value for r in p.ratings]) / len(p.ratings), 2)
            if p.ratings else None
        )

        data = {
            "id": p.id,
            "title": p.title,
            "image": p.image,                     # ✅ ADD IMAGE
            "is_published": p.is_published,
            "author": {
                "id": p.author.id,
                "username": p.author.username
            } if p.author else None,
            "categories": [
                {"id": c.id, "name": c.name} for c in p.categories
            ],
            "average_rating": avg_rating,
            "created_at": p.created_at.isoformat(),  # optional helpful field
            "isWatched": p.id in watched_ids          # optional for frontend
        }


        if p.id in watched_ids:
            watched_data.append(data)
        else:
            unwatched_data.append(data)

    return jsonify({
        "watched": watched_data,
        "unwatched": unwatched_data,
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages
    }), 200



@bp.route("/rate/<int:post_id>", methods=["POST"])
@jwt_required()
def rate_post(post_id):
    user_id = get_jwt_identity()
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404

    data = request.get_json() or {}
    value = data.get("value")
    try:
        value_int = int(value)
    except Exception:
        return jsonify({"msg": "Rating must be an integer between 1 and 5"}), 400

    if not (1 <= value_int <= 5):
        return jsonify({"msg": "Rating must be between 1 and 5"}), 400

    existing = PostRating.query.filter_by(post_id=post_id, user_id=user_id).first()
    if existing:
        existing.value = value_int
        msg = "Rating updated"
    else:
        db.session.add(PostRating(post_id=post_id, user_id=user_id, value=value_int))
        msg = "Rating added"

    db.session.commit()

    avg = avg_rating_for_post(post_id)
    return jsonify({"msg": msg, "user_rating": value_int, "rating": avg}), 200


@bp.route("/<int:post_id>", methods=["GET"])
def get_post_detail(post_id):
    # Allow optional JWT
    verify_jwt_in_request(optional=True)
    user_id = get_jwt_identity()

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 5, type=int)
    per_page = max(1, min(per_page, MAX_PER_PAGE))

    post = Post.query.options(subqueryload(Post.images),
                                 subqueryload(Post.categories),
                                 subqueryload(Post.ratings)).get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404

    images = [file_url(img.file_path) for img in post.images]
    avg_post_rating = avg_rating_for_post(post.id)

    user_post_rating = None
    if user_id:
        r = PostRating.query.filter_by(post_id=post.id, user_id=user_id).first()
        user_post_rating = r.value if r else None

    comment_pagination = paginate_query(
        Comment.query.filter_by(post_id=post.id).order_by(Comment.created_at.desc()),
        page, per_page
    )

    comments_data = []
    for c in comment_pagination.items:
        avg_comment_rating = avg_rating_for_comment(c.id)
        user_comment_rating = None
        can_delete = False
        can_edit = False
        if user_id:
            user = User.query.get(user_id)
            cr = CommentRating.query.filter_by(comment_id=c.id, user_id=user_id).first()
            user_comment_rating = cr.value if cr else None
            is_owner = (c.user_id == user_id)
            is_admin = (user.role in ["admin", "superadmin"])
            can_delete = is_owner or is_admin
            can_edit = is_owner or is_admin

        comments_data.append({
            "id": c.id,
            "content": c.content,
            "author": c.commenter.username if c.commenter else "Deleted User",
            "author_id": c.user_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "rating": avg_comment_rating,
            "user_rating": user_comment_rating,
            "can_delete": can_delete,
            "can_edit": can_edit
        })

    return jsonify({
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "author": post.author.username if post.author else None,
        "is_published": post.is_published,
        "categories": [{"id": c.id, "name": c.name} for c in post.categories],
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "images": images,
        "rating": avg_post_rating,
        "user_rating": user_post_rating,
        "can_delete": bool(user_id and User.query.get(user_id).role == "superadmin"),
        "comments": {
            "total": comment_pagination.total,
            "page": comment_pagination.page,
            "per_page": comment_pagination.per_page,
            "pages": comment_pagination.pages,
            "items": comments_data
        }
    }), 200


@bp.route("/author/posts", methods=["GET"])
@jwt_required()
def get_posts_by_author():
    # 1. Get all potential filter/sort parameters from the URL
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    per_page = max(1, min(per_page, MAX_PER_PAGE))
    
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "all")
    category_name = request.args.get("category", "").strip()
    sort_by = request.args.get("sort_by", "created_at")
    order = request.args.get("order", "desc")

    user_id = get_jwt_identity()
    author = User.query.get(user_id)
    if not author:
        return jsonify({"msg": "Author not found"}), 404

    # 2. Start the base query
    query = Post.query.filter_by(author_id=author.id)

    # 3. Apply SEARCH filter (if provided)
    if search:
        query = query.filter(Post.title.ilike(f"%{search}%"))

    # 4. Apply STATUS filter
    if status == "published":
        query = query.filter(Post.is_published == True)
    elif status == "draft":
        query = query.filter(Post.is_published == False)

    # 5. Apply CATEGORY filter (joining the categories table)
    if category_name:
        query = query.join(Post.categories).filter(Category.name.ilike(f"%{category_name}%"))

    # 6. Apply DYNAMIC SORTING
    sort_column = getattr(Post, sort_by, Post.created_at)
    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # 7. Paginate the filtered query
    pagination = paginate_query(query, page, per_page)

    results = []
    for p in pagination.items:
        first_image = p.images[0].file_path if p.images else None
        results.append({
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "is_published": p.is_published,
            "categories": [{"id": c.id, "name": c.name} for c in p.categories],
            "file_path": file_url(first_image),
            # Add average_rating here if your model supports it so it shows in dashboard
            "average_rating": getattr(p, 'average_rating', 0) 
        })

    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page,
        "results": results
    }), 200


@bp.route("edit_post/<int:post_id>", methods=["PUT"])
@jwt_required()
def edit_post(post_id):
    user_id = get_jwt_identity()
    post = Post.query.get(post_id)
    user = User.query.get(user_id)

    if not post:
        return jsonify({"msg": "Post not found"}), 404
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # 1. Permissions Check
    is_owner = int(post.author_id) == int(user_id)
    is_admin = user.role in ["admin", "superadmin"]

    if not (is_owner or is_admin):
        return jsonify({"msg": "You don't have permission to edit this post"}), 403

    # 2. Text Content (Match keys with React: "title", "content")
    title = sanitize_html(request.form.get("title"))
    content = sanitize_html(request.form.get("content"))

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    post.title = title
    post.content = content

    # 3. Categories (Match key with React: "categories")
    # React sends multiple entries for the same key in FormData
    category_ids_raw = request.form.getlist("categories") 
    if category_ids_raw:
        category_ids = [int(cid) for cid in category_ids_raw]
        categories = Category.query.filter(Category.id.in_(category_ids)).all()
        post.categories = categories
    else:
        # If user cleared all categories, empty the relationship
        post.categories = []

    # 4. Image Replacement (Match key with React: "main_image")
    new_file = request.files.get("main_image")
    UPLOAD_DIR = get_upload_dir()

    if new_file and allowed_file(new_file.filename):
        # Remove existing image(s) from disk and DB
        if post.images:
            for old_img in post.images:
                old_path = os.path.join(UPLOAD_DIR, old_img.file_path)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception as e:
                        print(f"File system error: {e}")
                db.session.delete(old_img)
            
            # Flush to ensure old images are removed before adding new one
            db.session.flush() 

        # Save new image
        try:
            filename = save_file(new_file)
            new_image_obj = Image(file_path=filename, post=post)
            db.session.add(new_image_obj)
        except Exception as e:
            return jsonify({"msg": f"Failed to save image: {str(e)}"}), 500

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Database error", "error": str(e)}), 500

    # 5. Build Response
    main_image = None
    if post.images:
        img = post.images[0]
        main_image = {
            "id": img.id,
            "file_url": file_url(img.file_path)
        }

    return jsonify({
        "msg": "Post updated successfully",
        "post": {
            "id": post.id,
            "title": post.title,
            "is_published": post.is_published,
            "categories": [{"id": c.id, "name": c.name} for c in post.categories],
            "image": main_image
        }
    }), 200


@bp.route("/authors/get_all_authors", methods=["GET"])
def get_all_authors():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    # 1. Capture the search query
    search_query = request.args.get("search", "").strip() 
    
    per_page = max(1, min(per_page, 20)) # Assuming MAX_PER_PAGE is 20

    # 2. Base Query
    query = (
        db.session.query(
            User,
            func.count(Post.id).label("post_count"),
            func.max(Post.created_at).label("latest_post_date")
        )
        .join(Post, User.id == Post.author_id)
        .filter(User.role == "author", Post.is_published == True)
    )

    # 3. Apply Search Filter
    if search_query:
        # ilike handles case-insensitive partial matches
        query = query.filter(User.username.ilike(f"%{search_query}%"))

    # 4. Grouping and Ordering
    authors_with_counts = query.group_by(User.id).order_by(func.count(Post.id).desc())

    pagination = paginate_query(authors_with_counts, page, per_page)
    
    result = []
    for author, post_count, latest_post_date in pagination.items:
        # Optimization: We already have latest_post_date, just find that specific post title
        latest_post = Post.query.filter_by(
            author_id=author.id, 
            is_published=True, 
            created_at=latest_post_date
        ).first()

        avatar_url = f"https://api.dicebear.com/9.x/adventurer/svg?seed={author.email}"
        
        result.append({
            "id": author.id,
            "username": author.username,
            "email": author.email,
            "avatar_url": avatar_url,
            "post_count": post_count,
            "latest_post": latest_post.title if latest_post else None,
            "latest_post_date": latest_post_date.isoformat() if latest_post_date else None
        })

    return jsonify({
        "authors": result,
        "pagination": {
            "page": pagination.page,
            "total": pagination.total,
            "pages": pagination.pages
        }
    }), 200


@bp.route("/search_by_author", methods=["GET"])
@jwt_required(optional=True)
def search_by_author():
    author_name = request.args.get("author_name", "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 5, type=int)
    per_page = max(1, min(per_page, MAX_PER_PAGE))

    if not author_name:
        return jsonify({"message": "Author name is required"}), 400

    author = User.query.filter(func.lower(User.username) == author_name.lower()).first()
    if not author:
        return jsonify({"message": f"No author found with name '{author_name}'"}), 404

    pagination = paginate_query(
        Post.query.filter_by(author_id=author.id).order_by(Post.created_at.desc()),
        page, per_page
    )

    posts = []
    for post in pagination.items:
        avg = avg_rating_for_post(post.id)
        posts.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "average_rating": avg,
            "timestamp": post.created_at.strftime("%Y-%m-%d %H:%M:%S") if post.created_at else None,
            "author": {"id": author.id, "username": author.username},
            "categories": [{"id": cat.id, "name": cat.name} for cat in post.categories],
            "images": [file_url(img.file_path) for img in post.images] if post.images else []
        })
    return jsonify({
        "author": {"id": author.id, "username": author.username},
        "posts": posts,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total_pages": pagination.pages,
            "total_items": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        }
    }), 200


@bp.route("/authors/<int:author_id>/posts", methods=["GET"])
def get_author_posts(author_id):

    page = request.args.get("page", 1, type=int)
    per_page = 10
    pagination = paginate_query(
        Post.query.filter_by(author_id=author_id, is_published=True).order_by(Post.created_at.desc()),
        page, per_page
    )

    author = User.query.get(author_id)
    author_name = author.username if author else None

    results = []
    for post in pagination.items:
        image_url = file_url(post.images[0].file_path) if post.images and post.images[0].file_path else None
        results.append({
            "id": post.id,
            "title": post.title,
            "content": (post.content[:200] + "...") if post.content else "",
            "created_at": post.created_at.isoformat() if post.created_at else None,
            "author_name": author_name,
            "categories": [c.name for c in post.categories],
            "image_url": image_url
        })

    return jsonify({
        "author_name": author_name,
        "results": results,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page
    }), 200



@bp.route('/admin_list', methods=['GET'])
@jwt_required()
@role_required("admin", "superadmin")
def admin_list_posts():
    # 1. Get query params
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '').strip()
    author_search = request.args.get('author', '').strip() # 🔹 Get author param
    category_id = request.args.get('category_id', type=int)
    status = request.args.get('status', '')

    # Start query and join Author (User table)
    query = Post.query.join(Post.author).options(
        joinedload(Post.author), 
        joinedload(Post.categories)
    )

    # 2. Apply filters
    if search:
        query = query.filter(Post.title.ilike(f"%{search}%"))
    
    # 🔹 Apply Author Filter
    if author_search:
        query = query.filter(User.username.ilike(f"%{author_search}%"))

    if status == 'published':
        query = query.filter(Post.is_published == True)
    elif status == 'draft':
        query = query.filter(Post.is_published == False)
    
    if category_id:
        query = query.filter(Post.categories.any(id=category_id))

    # 3. Paginate
    pagination = query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "results": [{
            "id": p.id,
            "title": p.title,
            "is_published": p.is_published,
            "average_rating": avg_rating_for_post(p.id),
            "created_at": p.created_at.isoformat(),
            "author": {"username": p.author.username},
            "categories": [{"id": c.id, "name": c.name} for c in p.categories]
        } for p in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200


@bp.route('/get_post/<int:post_id>', methods=['GET'])
def get_post(post_id):
    # joinedload categories AND images
    post = Post.query.options(
        joinedload(Post.categories),
        joinedload(Post.images) 
    ).get_or_404(post_id)

    # Get the filename from the first related image object
    # This matches the logic you used in list_posts
    main_image_path = post.images[0].file_path if post.images else None

    return jsonify({
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "is_published": post.is_published,
        # Use your helper function 'file_url' to build the full path
        "image_url": file_url(main_image_path), 
        "created_at": post.created_at.isoformat(),
        "categories": [
            {"id": cat.id, "name": cat.name} for cat in post.categories
        ]
    }), 200

@bp.route('/user_dashboard', methods=['GET'])
@jwt_required()
def user_dashboard_list():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # 1. Capture Query Parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    sort_by = request.args.get('sort_by', 'rating')  # 'rating', 'created_at', 'title'
    order = request.args.get('order', 'desc')        # 'asc', 'desc'
    
    search = request.args.get('search', '').strip()
    author_name = request.args.get('author', '').strip()
    # In your Flask user_dashboard route
    category_text = request.args.get('category', '').strip()
    watch_status = request.args.get('watch_status', 'all') # 'all', 'watched', 'unwatched'

    # 2. Base Query with Joins
    # We join User (author) and Category to filter by them
    query = Post.query.join(User, Post.author_id == User.id).filter(Post.is_published == True)

    # 3. Apply Filters
    if search:
        query = query.filter(Post.title.ilike(f"%{search}%"))
    
    if author_name:
        query = query.filter(User.username.ilike(f"%{author_name}%"))
        
    if category_text:
        query = query.filter(Post.categories.any(Category.name.ilike(f"%{category_text}%")))

    # 4. Handle Watch Status Filtering
    # We get the IDs of posts the user has watched to filter the main query
    watched_ids = [p.id for p in user.watched]

    if watch_status == 'watched':
        query = query.filter(Post.id.in_(watched_ids)) if watched_ids else query.filter(False)
    elif watch_status == 'unwatched':
        if watched_ids:
            query = query.filter(~Post.id.in_(watched_ids))

    # 5. Sorting Logic
    if sort_by == 'rating':
        # Outer join with PostRating to calculate average without excluding unrated posts
        query = query.outerjoin(PostRating).group_by(Post.id)
        avg_col = func.avg(PostRating.value)
        query = query.order_by(avg_col.desc() if order == 'desc' else avg_col.asc())
    elif sort_by == 'created_at':
        query = query.order_by(Post.created_at.desc() if order == 'desc' else Post.created_at.asc())
    elif sort_by == 'title':
        query = query.order_by(Post.title.desc() if order == 'desc' else Post.title.asc())

    # 6. Pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    # 7. Serialize Response
    results = []
    for p in pagination.items:
        # Check if this specific post ID is in the user's watched list
        is_watched = p.id in watched_ids
        
        results.append({
            "id": p.id,
            "title": p.title,
            "author": {
                "id": p.author.id,
                "username": p.author.username
            },
            "created_at": p.created_at.isoformat(),
            "average_rating": avg_rating_for_post(p.id), # Uses your existing helper
            "categories": [{"id": c.id, "name": c.name} for c in p.categories],
            "isWatched": is_watched
        })

    return jsonify({
        "results": results,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page
    }), 200


# -----------------------------------------------------------
# Admin-only: Search Messages
# -----------------------------------------------------------
@bp.route("/messages/search", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def search_messages():
    user = User.query.get(get_jwt_identity())
    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    query = sanitize_text(request.args.get("q", ""))
    if not query:
        return jsonify({"msg": "Search query cannot be empty"}), 400

    page = request.args.get("page", default=1, type=int)
    per_page = min(50, request.args.get("per_page", default=10, type=int))

    pagination = ContactMessage.query.filter(
        or_(
            ContactMessage.email.ilike(f"%{query}%"),
            ContactMessage.subject.ilike(f"%{query}%"),
            ContactMessage.message.ilike(f"%{query}%")
        )
    ).order_by(ContactMessage.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(paginated_response(pagination)), 200


# -----------------------------------------------------------
# Apply Filters to Posts on the commentors dashboard
# -----------------------------------------------------------
@bp.route("/filter", methods=["GET"])
@jwt_required(optional=True)
def filter_posts():
    # ----------------------------
    # Query params
    # ----------------------------
    author_name = request.args.get("author_name", type=str)
    author_id = request.args.get("author_id", type=int)
    category_name = request.args.get("category_name", type=str)
    category_id = request.args.get("category_id", type=int)
    watched_param = request.args.get("watched", type=str)  # "true" / "false" or None

    # Sorting: support either `sort` OR `sort_by` + `sort_dir` (the latter takes precedence)
    sort = request.args.get("sort", type=str)
    sort_by = request.args.get("sort_by", type=str)
    sort_dir = (request.args.get("sort_dir", "desc") or "desc").lower()

    # Pagination
    page = max(1, request.args.get("page", default=1, type=int))
    per_page = min(50, request.args.get("per_page", default=10, type=int))  # HARD LIMIT = 50

    user_id = get_jwt_identity()
    user = User.query.get(user_id) if user_id else None

    # ----------------------------
    # Base filtered query (no ordering yet)
    # Eager-load relations
    # ----------------------------
    base_q = Post.query.options(
        joinedload(Post.author),
        subqueryload(Post.categories),
        subqueryload(Post.ratings),
    )

    # --- author filters
    if author_name:
        base_q = base_q.join(User).filter(func.lower(User.username) == author_name.lower())

    if author_id:
        base_q = base_q.filter(Post.author_id == author_id)

    # --- category filters
    if category_name:
        category = Category.query.filter(func.lower(Category.name) == category_name.lower()).first()
        if not category:
            return jsonify({
                "posts": [],
                "count": 0,
                "pagination": {"page": page, "per_page": per_page, "pages": 0, "total_items": 0}
            }), 200
        base_q = base_q.filter(Post.categories.any(Category.id == category.id))

    if category_id:
        base_q = base_q.filter(Post.categories.any(Category.id == category_id))

    # --- watched filter
    if watched_param is not None:
        if not user:
            return jsonify({"message": "Login required for watched filter"}), 401

        watched_ids = {p.id for p in user.watched} if user.watched else set()

        if watched_param.lower() == "true":
            if not watched_ids:
                return jsonify({
                    "posts": [],
                    "count": 0,
                    "pagination": {"page": page, "per_page": per_page, "pages": 0, "total_items": 0}
                }), 200
            base_q = base_q.filter(Post.id.in_(watched_ids))

        elif watched_param.lower() == "false":
            if watched_ids:
                base_q = base_q.filter(~Post.id.in_(watched_ids))
            # else: all posts are unwatched for this user → no extra filter

    # ----------------------------
    # Compute totals BEFORE ordering/pagination
    # ----------------------------
    try:
        total = base_q.order_by(None).count()
    except Exception:
        # fallback if DB refuses count on joined query
        total = len(base_q.all())

    pages = ceil(total / per_page) if per_page else 1

    # ----------------------------
    # Determine ordering
    # ----------------------------
    # Priority: sort_by + sort_dir > sort > default (date_desc)
    final_sort_by = None
    final_sort_dir = None

    if sort_by:
        final_sort_by = sort_by
        final_sort_dir = sort_dir
    elif sort:
        # Accept strings like "date_desc", "rating_asc", "title_asc"
        s = sort.lower()
        if s.startswith("date_"):
            final_sort_by = "created_at"
            final_sort_dir = s.split("_", 1)[1]
        elif s.startswith("rating_"):
            final_sort_by = "rating"
            final_sort_dir = s.split("_", 1)[1]
        elif s.startswith("title_"):
            final_sort_by = "title"
            final_sort_dir = s.split("_", 1)[1]
        else:
            final_sort_by = "created_at"
            final_sort_dir = "desc"
    else:
        final_sort_by = "created_at"
        final_sort_dir = "desc"

    final_sort_dir = (final_sort_dir or "desc").lower()
    # ----------------------------
    # Apply ordering to a new query object `ordered_q`
    # ----------------------------
    ordered_q = base_q

    if final_sort_by in ("created_at", "date"):
        ordered_q = base_q.order_by(Post.created_at.desc() if final_sort_dir == "desc" else Post.created_at.asc())

    elif final_sort_by in ("title",):
        ordered_q = base_q.order_by(Post.title.desc() if final_sort_dir == "desc" else Post.title.asc())

    elif final_sort_by in ("rating", "avg_rating"):
        # aggregate average rating per post in subquery
        rating_subq = (
            db.session.query(
                Rating.post_id.label("post_id"),
                func.avg(Rating.value).label("avg_rating")
            )
            .group_by(Rating.post_id)
            .subquery()
        )
        # left outer join so posts without ratings are included; use coalesce to treat NULL as 0
        if final_sort_dir == "desc":
            ordered_q = base_q.outerjoin(rating_subq, Post.id == rating_subq.c.post_id) \
                .order_by(func.coalesce(rating_subq.c.avg_rating, 0).desc(), Post.created_at.desc())
        else:
            ordered_q = base_q.outerjoin(rating_subq, Post.id == rating_subq.c.post_id) \
                .order_by(func.coalesce(rating_subq.c.avg_rating, 0).asc(), Post.created_at.desc())

    else:
        # fallback
        ordered_q = base_q.order_by(Post.created_at.desc())

    # ----------------------------
    # Pagination
    # ----------------------------
    offset = (page - 1) * per_page
    posts = ordered_q.offset(offset).limit(per_page).all()
    # print(serialize_post(posts[0], user) if posts else "No posts found")

    # ----------------------------
    # Response: include pagination object
    # ----------------------------
    return jsonify({
        "posts": [serialize_post(p, user) for p in posts],
        "count": total,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "pages": pages,
            "total_items": total,
            "has_next": page < pages,
            "has_prev": page > 1,
        }
    }), 200



# -----------------------------------------------------------
# Admin-only: Rejections
# -----------------------------------------------------------

@bp.route('/check_existence', methods=['POST'])
@jwt_required()
@role_required("author", "admin", "superadmin")
def is_check_title_rejected():
    data = request.get_json()
    title = data.get('title')

    if not title:
        return jsonify({"msg": "Title is required", "exists": False}), 400

    # Search for the title
    exists = RejectedRequest.query.filter(RejectedRequest.title.ilike(title)).first()

    if exists:
        return jsonify({
            "msg": "Title already exists in the database", 
            "exists": True,
            "rejected": True # Added this to match your React logic
        }), 200
    
    # Change the status code from 404 to 200
    return jsonify({
        "msg": "Title not found in database. Proceed with rejection.", 
        "exists": False,
        "rejected": False
    }), 200 # <--- THIS IS THE KEY CHANG


@bp.route('/reject', methods=['POST'])
@jwt_required()
@role_required("author", "admin", "superadmin")
def add_rejected_request():
    data = request.get_json()
    title = data.get('title')
    
    if not title:
        return jsonify({"msg": "Title is required"}), 400

    # 1. Check if this title is already in the rejection list
    already_rejected = RejectedRequest.query.filter(RejectedRequest.title.ilike(title)).first()
    
    if already_rejected:
        return jsonify({
            "msg": f"The title '{title}' has already been recorded as rejected."
        }), 409 # Conflict

    # 2. Insert new rejection
    current_user = get_jwt_identity() # Assuming this returns the username/identity
    
    new_rejection = RejectedRequest(
        title=title,
        rejected_by=current_user,
        reason=data.get('reason', 'No reason provided')
    )

    try:
        db.session.add(new_rejection)
        db.session.commit()
        return jsonify({"msg": "Request rejection recorded successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Failed to record rejection", "error": str(e)}), 500


