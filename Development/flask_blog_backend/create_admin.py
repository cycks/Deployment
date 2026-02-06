from app import create_app, db
from app.models.user import User
from werkzeug.security import generate_password_hash
from datetime import datetime, timezone


ADMIN_EMAIL = "admin@loftiermovies.com"
ADMIN_USERNAME = "wycliffe"
ADMIN_PASSWORD = "admin@LoftierMovies.1234"

def create_admin():
    app = create_app()

    with app.app_context():
        # Check if admin already exists
        existing_user = User.query.filter_by(email=ADMIN_EMAIL).first()

        if existing_user:
            print(f"⚠️ admin already exists: {existing_user.email}")
            return

        # Create admin user
        admin = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password=generate_password_hash(ADMIN_PASSWORD),
            role="admin",
            is_approved=True,
            is_blocked=False,
            is_confirmed=True,
            auth_provider="email",
            created_at=datetime.now(timezone.utc),
        )

        db.session.add(admin)
        db.session.commit()

        print("✅ admin created successfully")
        print(f"   Email: {ADMIN_EMAIL}")
        print("   Role: admin")
        print("   ⚠️ Change the password after first login!")


if __name__ == "__main__":
    create_admin()