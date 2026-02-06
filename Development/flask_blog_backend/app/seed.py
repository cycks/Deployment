# app.seed.py
from app.extensions import db
from app.models.user import User
from werkzeug.security import generate_password_hash

def seed_roles_and_superadmin():
    superadmin = User.query.filter_by(role="superadmin").first()
    if not superadmin:
        superadmin = User(
            username="superadmin",
            email="superadmin@example.com",
            password=generate_password_hash("superpassword"),
            role="superadmin",
            is_approved=True
        )
        db.session.add(superadmin)
        db.session.commit()
