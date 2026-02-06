# app/routes/user.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import func, or_

from datetime import datetime, timedelta

from app.extensions import db
from app.models.user import User  
from app.models.post import Post  
from app.utils.decorators import role_required

bp = Blueprint("user", __name__, url_prefix="/api/users")

# ============================================================
# HELPERS
# ============================================================

def serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "approved": user.is_approved,
        "blocked": user.is_blocked,
        "created_at": user.created_at.isoformat(),
    }


def get_current_user():
    return User.query.get(get_jwt_identity())


def get_user_or_404(user_id):
    user = User.query.get(user_id)
    if not user:
        return None
    return user


# ============================================================
# APPROVE USER WITH ROLE RULES
# ============================================================

@bp.route("/approve/<role>/<int:user_id>", methods=["PUT"])
@jwt_required()
def approve_user(role, user_id):
    current_user = get_current_user()

    if role not in ["author", "admin", "superadmin"]:
        return jsonify({"msg": "Invalid role"}), 400

    user = get_user_or_404(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if user.role != role:
        return jsonify({"msg": f"User is not a {role}"}), 400

    # Approval hierarchy
    if role == "superadmin":
        if current_user.role != "superadmin":
            return jsonify({"msg": "Only superadmins can approve other superadmins"}), 403

    if role == "admin":
        if current_user.role != "superadmin":
            return jsonify({"msg": "Only superadmins can approve admins"}), 403

    if role == "author":
        if current_user.role not in ["admin", "superadmin"]:
            return jsonify({"msg": "Only admins or superadmins can approve authors"}), 403

    if user.is_approved:
        return jsonify({"msg": f"{role.capitalize()} already approved"}), 204

    user.is_approved = True
    db.session.commit()

    return jsonify({"msg": f"{role.capitalize()} approved"}), 200


# ============================================================
# BLOCK / UNBLOCK USER
# ============================================================

@bp.route("/block/<int:user_id>", methods=["PUT"])
@jwt_required()
def block_user(user_id):
    current_user = get_current_user()
    user = get_user_or_404(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    if user.id == current_user.id:
        return jsonify({"msg": "You cannot block yourself"}), 400

    # 1. HIERARCHY CHECK
    if current_user.role == "admin":
        # Admins can ONLY block commentators.
        if user.role != "commentator":
            return jsonify({"msg": "Access Denied: Admins can only block commentators."}), 403
            
    elif current_user.role == "superadmin":
        # Superadmins cannot block other Superadmins
        if user.role == "superadmin" and user.id != current_user.id:
             return jsonify({"msg": "Hierarchy Protection: You cannot block another superadmin"}), 403
    else:
        # Authors or Commentators hitting this endpoint
        return jsonify({"msg": "Permission denied"}), 403

    user.is_blocked = True
    db.session.commit()
    return jsonify({"msg": f"{user.username} blocked successfully"}), 200


@bp.route("/unblock/<int:user_id>", methods=["PUT"])
@jwt_required()
def unblock_user(user_id):
    current_user = get_current_user()
    user = get_user_or_404(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404
    if not user.is_blocked:
        return jsonify({"msg": "User is not currently blocked"}), 400

    # 1. HIERARCHY CHECK
    if current_user.role == "admin":
        # Admins can ONLY unblock commentators.
        if user.role != "commentator":
            return jsonify({"msg": "Access Denied: Admins can only unblock commentators."}), 403
            
    elif current_user.role == "superadmin":
        # Superadmins can unblock anyone (except themselves, handled above)
        pass 
    else:
        return jsonify({"msg": "Permission denied"}), 403

    user.is_blocked = False
    db.session.commit()
    return jsonify({"msg": f"{user.username} unblocked successfully"}), 200


# ============================================================
# LIST USERS (ADMIN / SUPERADMIN)
# ============================================================

@bp.route("/commentators", methods=["GET"])
@role_required("admin", "superadmin")
def list_commentators():
    # 1. Get query parameters 📥
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("limit", 10, type=int)
    search_query = request.args.get("search", "", type=str).strip()

    # 2. Start with a filtered query 🔍
    # We only want users whose role is exactly 'commentator'
    q = User.query.filter_by(role="commentator")

    # 3. Apply search if provided 🔎
    if search_query:
        search_pattern = f"%{search_query}%"
        q = q.filter(
            (User.username.ilike(search_pattern)) | 
            (User.email.ilike(search_pattern))
        )

    # 4. Sort and Paginate 📊
    q = q.order_by(User.created_at.desc())
    pagination = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "results": [serialize_user(u) for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200


@bp.route("/authors", methods=["GET"])
@role_required("admin", "superadmin")
def list_authors():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search_query = request.args.get("search", "", type=str)

    # 1. Start query - using ilike for case-insensitive role matching if needed
    # or just stick to your standard 'author' string.
    query = User.query.filter(User.role == "author")

    # 2. Add Search functionality (Email or Username)
    if search_query:
        search_filter = f"%{search_query}%"
        query = query.filter(
            (User.username.ilike(search_filter)) | 
            (User.email.ilike(search_filter))
        )

    # 3. Order and Paginate
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "authors": [serialize_user(u) for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }), 200




@bp.route("/admins", methods=["GET"])
@role_required("superadmin")
def list_admins():
    # 1. Capture pagination parameters from the URL
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 10, type=int), 50) # Cap at 50 for safety

    # 2. Query and Paginate
    pagination = User.query.filter_by(role="admin") \
        .order_by(User.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    # 3. Return structured data for the React frontend
    return jsonify({
        "admins": [serialize_user(u) for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200



# ============================================================
# LIST ALL USERS (SECURED & FILTERABLE)
# ============================================================
@bp.route("/all-users", methods=["GET"])
@role_required("admin", "superadmin")
def list_all_users():
    current_user = get_current_user()
    
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search_query = request.args.get("search", "", type=str).strip()
    role_filter = request.args.get("role", "", type=str).strip()

    q = User.query

    # Boundary Logic
    if current_user.role == "admin":
        q = q.filter(User.role.in_(["commentator", "author"]))
    
    if role_filter and role_filter != "all":
        q = q.filter(User.role == role_filter)

    # SEARCH LOGIC: This must use OR to check both columns
    if search_query:
        search_pattern = f"%{search_query}%"
        q = q.filter(
            or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    q = q.order_by(User.created_at.desc())
    pagination = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "results": [serialize_user(u) for u in pagination.items], # Standardized key
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200


@bp.route("/superadmins", methods=["GET"])
@role_required("superadmin")
def list_superadmins():
    # 1. Capture parameters from the URL
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("limit", 10, type=int)  # Note: mapped 'limit' from your URL to per_page
    search_query = request.args.get("search", "", type=str).strip()

    # 2. Base Query
    query = User.query.filter_by(role="superadmin")

    # 3. Apply Search Filter (Username or Email)
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(
            (User.username.ilike(search_pattern)) | 
            (User.email.ilike(search_pattern))
        )

    # 4. Paginate and Sort (Newest first)
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    output_data = {
        "superadmins": [serialize_user(u) for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page
    }
    
    

    # 6. Return structured data
    return jsonify(output_data), 200



# ============================================================
# LIST APPROVED USERS
# ============================================================

@bp.route("/approved", methods=["GET"])
@role_required("admin", "superadmin")
def list_approved():
    current_user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per = request.args.get("per_page", 10, type=int)

    q = User.query.filter_by(is_approved=True)

    # Admins see only blocked commentators
    if current_user.role == "admin":
        q = q.filter_by(role="commentator")

    pagination = q.paginate(page=page, per_page=per, error_out=False)

    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "results": [serialize_user(u) for u in pagination.items]
    }), 200




# ============================================================
# LIST Awaiting Approval USERS
# ============================================================

@bp.route("/awaiting-approval", methods=["GET"])
@role_required("admin", "superadmin")
def list_awaiting_approval():
    current_user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per = request.args.get("per_page", 10, type=int)

    q = User.query.filter_by(is_approved=False)

    # Admins see only blocked commentators
    if current_user.role == "admin":
        q = q.filter_by(role="commentator")

    pagination = q.paginate(page=page, per_page=per, error_out=False)

    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "results": [serialize_user(u) for u in pagination.items]
    }), 200




# ============================================================
# LIST BLOCKED USERS
# ============================================================
@bp.route("/blocked_users", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def list_blocked():
    current_user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search_query = request.args.get("search", "", type=str).strip()

    # 1. Base Query: Only get blocked users
    query = User.query.filter_by(is_blocked=True)

    # 2. Logic: Admins only see Blocked Commentators
    # Superadmins see ALL blocked users (Admins, Authors, etc.)
    if current_user.role == "admin":
        query = query.filter_by(role="commentator")

    # 3. Apply Search Filter (Username or Email)
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(
            (User.username.ilike(search_pattern)) | 
            (User.email.ilike(search_pattern))
        )

    # 4. Paginate and Sort
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "results": [serialize_user(u) for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200


@bp.route("/blocked_admins", methods=["GET"])
@role_required("superadmin")
def list_blocked_admins():
    page = request.args.get("page", 1, type=int)
    per = request.args.get("per_page", 10, type=int)

    q = User.query.filter_by(role="admin", is_blocked=True)
    pagination = q.paginate(page=page, per_page=per, error_out=False)

    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "results": [serialize_user(u) for u in pagination.items]
    }), 200



@bp.route("/stats", methods=["GET"])
@role_required("admin", "superadmin")
def user_stats():
    stats = db.session.query(
        User.role, db.func.count(User.id)
    ).group_by(User.role).all()
    
    awaiting = User.query.filter_by(is_approved=False).count()
    blocked = User.query.filter_by(is_blocked=True).count()
    
    return jsonify({
        "roles": {role: count for role, count in stats},
        "awaiting_approval": awaiting,
        "blocked_total": blocked
    }), 200


@bp.route("/update-role/<int:user_id>", methods=["PATCH"])
@role_required("superadmin")
def update_role(user_id):
    user = get_user_or_404(user_id)
    if not user: return jsonify({"msg": "Not found"}), 404
    
    new_role = request.json.get("role")
    if new_role not in ["commentator", "author", "admin"]:
        return jsonify({"msg": "Invalid role"}), 400
        
    user.role = new_role
    db.session.commit()
    return jsonify({"msg": f"User is now {new_role}"}), 200


@bp.route("/delete/<int:user_id>", methods=["DELETE"])
@role_required("superadmin")
def delete_user(user_id):
    user = get_user_or_404(user_id)
    if not user: return jsonify({"msg": "Not found"}), 404
    
    # Optional: Logic to handle user's posts (delete them or set author to Null)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "User permanently deleted"}), 200


@bp.route("/dashboard-summary", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def get_dashboard_summary():
    """
    Consolidated endpoint for dashboard metrics.
    Renamed to 'get_dashboard_summary' to avoid Flask naming conflicts.
    """
    try:
        # 1. USER STATS
        total_users = User.query.count()
        pending_approvals = User.query.filter_by(is_approved=False).count()
        blocked_users = User.query.filter_by(is_blocked=True).count()
        
        # 2. POST STATS
        total_posts = Post.query.count()
        published_posts = Post.query.filter_by(is_published=True).count()
        drafts = total_posts - published_posts
        
        # 3. RECENT ACTIVITY (Last 5 users)
        recent_users_query = User.query.order_by(User.created_at.desc()).limit(5).all()
        recent_users = [{
            "username": u.username,
            "role": u.role,
            "created_at": u.created_at.strftime("%Y-%m-%d")
        } for u in recent_users_query]

        # 4. CHART DATA (Last 6 Months Trend)
        # Using func.date to truncate timestamps for grouping
        # 4. CHART DATA (PostgreSQL version)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        
        monthly_stats = db.session.query(
            func.to_char(Post.created_at, 'YYYY-MM').label('month'), # 👈 Use to_char for Postgres
            func.count(Post.id).label('post_count')
        ).filter(Post.created_at >= six_months_ago)\
            .group_by('month')\
            .order_by('month').all()

        chart_data = [{"month": s.month, "posts": s.post_count} for s in monthly_stats]

        return jsonify({
            "stats": {
                "users": {
                    "total": total_users,
                    "pending": pending_approvals,
                    "blocked": blocked_users
                },
                "posts": {
                    "total": total_posts,
                    "published": published_posts,
                    "drafts": drafts
                }
            },
            "recent_users": recent_users,
            "chart_data": chart_data
        }), 200

    except Exception as e:
        return jsonify({"msg": "Error generating dashboard data", "error": str(e)}), 500