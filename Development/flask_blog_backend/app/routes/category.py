import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from app.models.category import Category
from app.models.associations import post_categories
from app.models.post import Post
from app.models.user import User
from app.extensions import db
from app.utils.decorators import role_required

bp = Blueprint("category", __name__, url_prefix="/api/categories")



def get_upload_dir():
    """Builds absolute path for CategoryPics and ensures it exists."""
    base_folder = current_app.config.get("UPLOAD_FOLDER", "static/uploads")
    relative_path = os.path.join(base_folder, "CategoryPics")
    abs_path = os.path.abspath(os.path.join(current_app.root_path, relative_path))
    
    try:
        os.makedirs(abs_path, exist_ok=True)
    except OSError as e:
        current_app.logger.error(f"Directory creation failed: {e}")
        raise
    return abs_path

def allowed_file(filename):
    """Checks if file extension is allowed."""
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    allowed = current_app.config.get("ALLOWED_EXTENSIONS", {"png", "jpg", "jpeg", "gif"})
    return ext in allowed

def save_category_file(file_storage):
    """Saves file with 'cat_' prefix and returns the filename."""
    upload_dir = get_upload_dir()
    # Logic similar to post.py: prefixing to prevent collisions
    filename = "cat_" + secure_filename(file_storage.filename)
    target = os.path.join(upload_dir, filename)
    file_storage.save(target)
    return filename

def get_file_url(filename: str) -> str:
    """Generates the full URL for a category image."""
    if not filename:
        return None
    base = current_app.config.get("IMAGE_BASE_URL", "/media/")
    return f"{base}CategoryPics/{filename}"



# ------------------------------------------------------
# 1. CATEGORY LIST WITH POST COUNT (For Admin/Sidebar)
# ------------------------------------------------------
@bp.route("/with_post_count", methods=["GET"])
def categories_with_post_count():
    # Get pagination parameters from the URL (e.g., /with_post_count?page=1&per_page=10)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    # 1. Build the base query
    query = (
        db.session.query(
            Category.id,
            Category.name,
            Category.image_path,
            db.func.count(post_categories.c.post_id).label("post_count")
        )
        .outerjoin(post_categories, Category.id == post_categories.c.category_id)
        .group_by(Category.id)
        .order_by(Category.name.asc()) # Good practice to sort when paginating
    )

    # 2. Execute pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    base = current_app.config.get("IMAGE_BASE_URL", "/media/")

    # 3. Format the items
    items = [
        {
            "id": cat.id, 
            "name": cat.name, 
            "post_count": cat.post_count,
            "image_url": f"{base}CategoryPics/{cat.image_path}" if cat.image_path else None
        }
        for cat in pagination.items
    ]

    # 4. Return items plus metadata
    return jsonify({
        "items": items,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }), 200

# ------------------------------------------------------
# 2. SIMPLE CATEGORY LIST (For Dropdowns)
# ------------------------------------------------------
@bp.route("/list_categories", methods=["GET"])
def list_categories():
    categories = Category.query.order_by(Category.name.asc()).all()
    return jsonify([
        {"id": cat.id, "name": cat.name}
        for cat in categories
    ]), 200

# ------------------------------------------------------
# 3. CREATE A CATEGORY (admin / superadmin only)
# ------------------------------------------------------
@bp.route("/create_category", methods=["POST"])
@jwt_required()
@role_required("admin", "superadmin")
def create_category():
    name = request.form.get("name")
    image = request.files.get("image")

    if not name or not image:
        return jsonify({"msg": "Category name and image are required"}), 400

    if not allowed_file(image.filename):
        return jsonify({"msg": "Invalid image file type"}), 400

    # Save using the new helper logic
    try:
        filename = save_category_file(image)
        category = Category(name=name, image_path=filename)
        db.session.add(category)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Failed to create category", "error": str(e)}), 500

    return jsonify({
        "msg": "Category created successfully",
        "id": category.id,
        "name": category.name,
        "image_url": get_file_url(filename),
    }), 201



# ------------------------------------------------------
# 4. SEARCH POSTS BY CATEGORY
# ------------------------------------------------------
@bp.route("/search_by_category", methods=["GET"])
def search_by_category():
    category_name = request.args.get("category_name", "").strip()

    if not category_name:
        return jsonify({"message": "Category name is required."}), 400

    # Case-insensitive lookup
    category = Category.query.filter(
        func.lower(Category.name) == category_name.lower()
    ).first()

    if not category:
        return jsonify({"message": f"No category found with name '{category_name}'."}), 404

    # Use joinedload to prevent N+1 query problem for author and ratings
    posts = (
        Post.query
        .options(joinedload(Post.author), joinedload(Post.ratings))
        .filter(Post.categories.any(id=category.id))
        .order_by(Post.created_at.desc())
        .all()
    )

    results = []
    for post in posts:
        # Calculate average rating
        avg = round(sum(r.value for r in post.ratings) / len(post.ratings), 2) if post.ratings else None

        results.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "average_rating": avg,
            "timestamp": post.created_at.isoformat(),
            "author": {
                "id": post.author.id if post.author else None,
                "username": post.author.username if post.author else "Anonymous",
            },
            "image_url": post.image_url,
            "categories": [{"id": cat.id, "name": cat.name} for cat in post.categories],
        })

    return jsonify(results), 200



# ------------------------------------------------------
# 5. LIST AUTHORS
# ------------------------------------------------------
@bp.route("/list_authors", methods=["GET"])
def list_authors():
    authors = User.query.filter_by(role="author").order_by(User.username.asc()).all()
    return jsonify([
        {"id": author.id, "username": author.username}
        for author in authors
    ]), 200



# ------------------------------------------------------
# 6. Delete Category
# ------------------------------------------------------
@bp.route('/delete_category/<int:category_id>', methods=['DELETE'])
@jwt_required()
@role_required("admin", "superadmin")
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    upload_dir = get_upload_dir()

    try:
        if category.image_path:
            file_path = os.path.join(upload_dir, category.image_path)
            if os.path.exists(file_path):
                os.remove(file_path)

        db.session.delete(category)
        db.session.commit()
        return jsonify({"msg": "Category and its cover image deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Failed to delete", "error": str(e)}), 500


# ------------------------------------------------------
# 7. SEARCH CATEGORIES BY NAME
# ------------------------------------------------------
@bp.route("/search_categories", methods=["GET"])
def search_categories():
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({"msg": "Search query 'q' is required"}), 400

    # Search categories and count associated posts
    categories = (
        db.session.query(
            Category.id,
            Category.name,
            Category.image_path,
            db.func.count(post_categories.c.post_id).label("post_count")
        )
        .outerjoin(post_categories, Category.id == post_categories.c.category_id)
        .filter(Category.name.ilike(f"%{query}%"))  # Case-insensitive partial match
        .group_by(Category.id)
        .all()
    )

    base = current_app.config.get("IMAGE_BASE_URL", "/media/")
    
    results = [
        {
            "id": cat.id,
            "name": cat.name,
            "post_count": cat.post_count,
            "image_url": f"{base}CategoryPics/{cat.image_path}" if cat.image_path else None
        }
        for cat in categories
    ]

    return jsonify(results), 200



# ------------------------------------------------------
# 7. SEARCH CATEGORIES BY id
# ------------------------------------------------------
@bp.route('/category_by_id/<int:category_id>', methods=['GET'])
def get_category_by_id(category_id):
    # 1. Get query parameters for pagination
    # default to page 1, 10 items per page
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 10, type=int)

    
    # 2. Find the category or return 404
    category = Category.query.get_or_404(category_id)

    # 3. Fetch paginated posts linked to this category
    # This prevents loading 1000+ posts into memory at once
    paginated_posts = Post.query.join(Post.categories)\
        .filter(Category.id == category_id)\
        .order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    # 4. Construct the response
    return jsonify({
        "category_info": {
            "id": category.id,
            "name": category.name
        },
        "posts": [post.to_dict() for post in paginated_posts.items],
        "pagination": {
            "total_posts": paginated_posts.total,
            "current_page": paginated_posts.page,
            "total_pages": paginated_posts.pages,
            "has_next": paginated_posts.has_next,
            "has_prev": paginated_posts.has_prev
        }
    }), 200



# ------------------------------------------------------
# 8. Edit A Category
# ------------------------------------------------------
@bp.route('/update_category/<int:category_id>', methods=['PUT'])
@jwt_required()
@role_required("admin", "superadmin")
def update_category(category_id):
    category = Category.query.get_or_404(category_id)
    
    new_name = request.form.get('name')
    if new_name:
        category.name = new_name

    image = request.files.get('image')
    if image and allowed_file(image.filename):
        upload_dir = get_upload_dir()

        # Delete old file if it exists (Cleanup logic from post.py)
        if category.image_path:
            old_path = os.path.join(upload_dir, category.image_path)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    current_app.logger.error(f"Error deleting old category image: {e}")

        # Save new file
        filename = save_category_file(image)
        category.image_path = filename

    try:
        db.session.commit()
        return jsonify({
            "msg": "Category updated successfully",
            "category": {
                "id": category.id,
                "name": category.name,
                "image_url": get_file_url(category.image_path)
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Failed to update", "error": str(e)}), 500


# ------------------------------------------------------
# 6. GLOBAL SEARCH FOR POSTS (Paginated)
# ------------------------------------------------------
@bp.route('/search', methods=['GET'])
def search_posts():
    query = request.args.get('q', '', type=str).strip()
    page = max(1, request.args.get('page', 1, type=int))
    per_page = min(100, request.args.get('per_page', 10, type=int))

    if not query:
        return jsonify({"msg": "Search query 'q' is required."}), 400

    # Search across title, content, author username, and category names
    search_filter = or_(
        Post.title.ilike(f"%{query}%"),
        Post.content.ilike(f"%{query}%"),
        User.username.ilike(f"%{query}%"),
        Category.name.ilike(f"%{query}%")
    )

    posts_query = (
        db.session.query(Post)
        .join(User, Post.author_id == User.id)
        .outerjoin(post_categories)
        .outerjoin(Category)
        .filter(search_filter, Post.is_published == True)
        .order_by(Post.created_at.desc())
        .distinct()
    )

    paginated = posts_query.paginate(page=page, per_page=per_page, error_out=False)

    results = [
        {
            "id": post.id,
            "title": post.title,
            "content": post.content[:300] + ("..." if len(post.content) > 300 else ""),
            "created_at": post.created_at.isoformat(),
            "author": post.author.username,
            "author_id": post.author.id,
            "image_url": post.image_url
        }
        for post in paginated.items
    ]

    return jsonify({
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": paginated.page,
        "per_page": paginated.per_page,
        "results": results
    }), 200