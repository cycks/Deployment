# app/__init__.py
import os, click, re
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask.cli import with_appcontext
from datetime import timedelta
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from .extensions import db, jwt, migrate, mail
from .seed import seed_roles_and_superadmin
from .routes import auth, category, comment, contact, post, user, watched, google_auth
from .error import bp as errors
from .models.user import User  # Import User model for lookup

def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    app.config["IMAGE_BASE_URL"] = os.getenv(
        "IMAGE_BASE_URL",
        "http://localhost:5000/static/uploads/"
    )

    # --- JWT Configuration ---
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "supersecretkey")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=3)
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # --- CORS Configuration ---
    CORS(app, resources={r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
    }}, supports_credentials=True)

    # --- init extensions ---
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    register_commands(app)

    # ============================================================
    # 🔐 JWT CUSTOM LOADERS & SECURITY CHECKS
    # ============================================================

    @jwt.user_identity_loader
    def user_identity_lookup(user):
        # Allow passing either the user object or the ID directly
        return user.id if hasattr(user, 'id') else user

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """
        Automatically loads the user from the DB on every protected request.
        The identity (sub) is the user ID.
        """
        identity = jwt_data["sub"]
        user = User.query.get(identity)
        
        # 🛡️ THE SECURITY KICK:
        # If user is blocked, this returns None or we can handle it in the 
        # unauthorized loader. However, checking it here is most efficient.
        if user and user.is_blocked:
            return None # This triggers the @jwt.unauthorized_loader
            
        return user

    # --- JWT Error Handlers ---
    @jwt.unauthorized_loader
    def unauthorized_response(err):
        if request.method == "OPTIONS":
            return jsonify(message="Preflight OK"), 200
        # This will be returned if user_lookup_loader returns None (blocked user)
        return jsonify({
            "msg": "Unauthorized or account blocked",
            "error": "blocked_or_missing"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_response(err):
        if request.method == "OPTIONS":
            return jsonify(message="Preflight OK"), 200
        return jsonify(message="Invalid token signature"), 401

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.models.user import User
        user_id = jwt_payload["sub"]
        token_session = jwt_payload.get("session_token")
        
        user = User.query.get(user_id)
        
        # If user doesn't exist OR the token's session doesn't match the DB, revoke access
        if not user or user.session_token != token_session:
            return True # Returns True to indicate the token is revoked/invalid
        return False

    # --- Preflight handler ---
    @app.before_request
    def check_preflight():
        if request.method == "OPTIONS":
            return jsonify({"message": "Preflight OK"}), 200

    # --- Register Blueprints ---
    app.register_blueprint(auth.bp)
    app.register_blueprint(category.bp)
    app.register_blueprint(comment.bp)
    app.register_blueprint(contact.bp)
    app.register_blueprint(errors)
    app.register_blueprint(google_auth.bp)
    app.register_blueprint(post.bp)
    app.register_blueprint(user.bp)
    app.register_blueprint(watched.bp)

    # --- Database setup ---
    # with app.app_context():
    #     db.create_all()
    #     seed_roles_and_superadmin()

    return app


def register_commands(app):
    """Registers custom CLI commands for the Loftier Movies application."""

    @app.cli.command("create-admin")
    @click.argument("username")
    @click.argument("email")
    @click.password_option()
    @click.option("--role", default="admin", help="User role: admin or superadmin")
    @with_appcontext
    def create_admin(username, email, password, role):
        """Creates or updates an admin. Email must end in @loftiermovies.com"""
        from app.models.user import User
        from app.extensions import db
        from sqlalchemy import or_

        # 1. Sanitize and Normalize
        username = username.strip()
        email = email.strip().lower()
        password = password.strip()

        # 2. Domain Validation
        REQUIRED_DOMAIN = "@loftiermovies.com"
        if not email.endswith(REQUIRED_DOMAIN):
            click.echo(f"Error: Access denied. Admin emails must end with {REQUIRED_DOMAIN}")
            return

        # 3. Basic Validation
        if not all([username, email, password]):
            click.echo("Error: Username, email, and password are all required.")
            return

        # 4. Conflict Check (Email or Username)
        existing_user = User.query.filter(or_(User.email == email, User.username == username)).first()

        if existing_user:
            if existing_user.email == email:
                click.echo(f"User {email} exists. Synchronizing permissions...")
                existing_user.username = username
            else:
                click.echo(f"Error: Username '{username}' is already taken by {existing_user.email}.")
                return

            existing_user.role = role
            existing_user.password = generate_password_hash(password)
            existing_user.is_approved = True
            existing_user.is_confirmed = True
        else:
            # 5. Create New Admin
            new_user = User(
                username=username,
                email=email,
                password=generate_password_hash(password),
                role=role,
                is_approved=True,
                is_confirmed=True,
                auth_provider="email",
                session_token=str(uuid.uuid4())
            )
            db.session.add(new_user)

        try:
            db.session.commit()
            click.echo(f"Successfully set up {role}: {username} ({email})")
        except Exception as e:
            db.session.rollback()
            click.echo(f"Database Error: {str(e)}")

