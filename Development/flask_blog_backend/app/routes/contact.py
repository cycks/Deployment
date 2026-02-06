# app.routes.contact.py

import re
from math import ceil
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload, subqueryload

from app.extensions import db
from app.models.contact import ContactMessage
from app.models.post import Post
from app.models.category import Category
from app.models.user import User
from app.models.rating import PostRating as Rating   # rating model
from app.utils.decorators import role_required

bp = Blueprint("contact", __name__, url_prefix="/api/contact")


# -----------------------------------------------------------
# Helpers
# -----------------------------------------------------------
def sanitize_text(value: str) -> str:
    """Strip HTML + trim whitespace for safe DB storage."""
    if not value:
        return ""
    return re.sub(r"<[^>]*>", "", value).strip()


def is_valid_email(email: str) -> bool:
    """Very basic email validation."""
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))


def serialize_message(msg):
    return {
        "id": msg.id,
        "email": msg.email,
        "subject": msg.subject,
        "message": msg.message,
        "is_read": msg.is_read,
        "is_actioned": msg.is_actioned,
        "created_at": msg.created_at.isoformat()
    }


def paginated_response(pagination):
    return {
        "messages": [serialize_message(m) for m in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }


# Serialize
def serialize_post(post, user):
    avg = None
    if post.ratings:
        vals = [r.value for r in post.ratings]
        avg = round(sum(vals) / len(vals), 2) if vals else None

    watched_ids = {p.id for p in user.watched} if user else set()

    return {
        "id": post.id,
        "title": post.title,
        "average_rating": avg,
        "author": {
            "id": post.author.id,
            "username": post.author.username,
        } if post.author else None,
        "categories": [{"id": c.id, "name": c.name} for c in post.categories],
        "isWatched": post.id in watched_ids,
        "created_at": post.created_at.isoformat(),
    }



# -----------------------------------------------------------
# Admin-only: List All Messages
# -----------------------------------------------------------
@bp.route("/messages", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def list_messages():
    user = User.query.get(get_jwt_identity())
    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = min(50, request.args.get("per_page", 10, type=int))

    pagination = ContactMessage.query \
        .order_by(ContactMessage.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(paginated_response(pagination)), 200


# -----------------------------------------------------------
# Admin-only: List Unread Messages
# -----------------------------------------------------------
@bp.route("/messages/unread", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def list_unread_messages():
    user = User.query.get(get_jwt_identity())
    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = min(50, request.args.get("per_page", 10, type=int))

    pagination = ContactMessage.query.filter_by(is_read=False) \
        .order_by(ContactMessage.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(paginated_response(pagination)), 200


# -----------------------------------------------------------
# Admin-only: List Unactioned Messages
# -----------------------------------------------------------
@bp.route("/messages/unactioned", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def list_unactioned_messages():
    user = User.query.get(get_jwt_identity())
    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = min(50, request.args.get("per_page", 10, type=int))

    pagination = ContactMessage.query.filter_by(is_actioned=False) \
        .order_by(ContactMessage.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(paginated_response(pagination)), 200



@bp.route("/messages/actioned", methods=["GET"])
@jwt_required()
@role_required("admin", "superadmin")
def list_actioned_messages():
    user = User.query.get(get_jwt_identity())
    if user.is_blocked:
        return jsonify({"msg": "Account blocked"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = min(50, request.args.get("per_page", 10, type=int))

    pagination = ContactMessage.query.filter_by(is_actioned=True) \
        .order_by(ContactMessage.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(paginated_response(pagination)), 200


# -----------------------------------------------------------
# Admin-only Mark Read / Unread / Actioned
# -----------------------------------------------------------
@bp.route("/mark_read/<int:msg_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "superadmin")
def mark_message_as_read(msg_id):
    message = ContactMessage.query.get_or_404(msg_id)
    message.is_read = True
    db.session.commit()
    return jsonify({"msg": "Message marked as read"}), 200


@bp.route("/mark_unread/<int:msg_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "superadmin")
def mark_message_as_unread(msg_id):
    message = ContactMessage.query.get_or_404(msg_id)
    message.is_read = False
    db.session.commit()
    return jsonify({"msg": "Message marked as unread"}), 200


@bp.route("/mark_actioned/<int:msg_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "superadmin")
def mark_message_as_actioned(msg_id):
    message = ContactMessage.query.get_or_404(msg_id)
    message.is_actioned = True
    db.session.commit()
    return jsonify({"msg": "Message marked as actioned"}), 200


@bp.route("/mark_unactioned/<int:msg_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "superadmin")
def mark_message_as_unactioned(msg_id):
    message = ContactMessage.query.get_or_404(msg_id)
    message.is_actioned = False
    db.session.commit()
    return jsonify({"msg": "Message marked as unactioned"}), 200



# -----------------------------------------------------------
# Public: Send a Contact Message
# -----------------------------------------------------------
@bp.route("/send_message", methods=["POST"])
def send_message():
    data = request.get_json() or {}

    email = sanitize_text(data.get("email", ""))
    subject = sanitize_text(data.get("subject", ""))
    message = sanitize_text(data.get("message", ""))

    if not all([email, subject, message]):
        return jsonify({"msg": "Email, subject and message are required"}), 400

    if len(subject) > 200:
        return jsonify({"msg": "Subject too long"}), 400

    if len(message) > 2000:
        return jsonify({"msg": "Message too long"}), 400

    if not is_valid_email(email):
        return jsonify({"msg": "Invalid email address"}), 400

    contact_msg = ContactMessage(
        email=email,
        subject=subject,
        message=message
    )

    db.session.add(contact_msg)
    db.session.commit()

    return jsonify({"msg": "Message sent successfully"}), 201


class RejectedRequest(db.Model):
    __tablename__ = 'rejected_requests'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, unique=True, index=True)
    rejected_by = db.Column(db.String(100), nullable=False)  # Username of admin/author
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "rejected_by": self.rejected_by,
            "reason": self.reason,
            "created_at": self.created_at.isoformat()
        }