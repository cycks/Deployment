# app.extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_mail import Mail

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
mail = Mail()


@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    from app.models.user import User
    identity = jwt_data.get("sub")

    # Try to coerce to int if possible (primary key in DB is integer)
    try:
        identity_int = int(identity)
    except (TypeError, ValueError):
        identity_int = identity  # fallback: keep original (maybe already int)

    return User.query.get(identity_int)
