from app import create_app, db
from app.models.user import User
from werkzeug.security import generate_password_hash
from datetime import datetime, timezone


SUPERADMIN_EMAIL = "superadmin@loftiermovies.com"
SUPERADMIN_USERNAME = "wycliffe1"
SUPERADMIN_PASSWORD = "Superadmin@LoftierMovies.1234"

def create_superadmin():
    app = create_app()

    with app.app_context():
        # Check if superadmin already exists
        existing_user = User.query.filter_by(email=SUPERADMIN_EMAIL).first()

        if existing_user:
            print(f"⚠️ Superadmin already exists: {existing_user.email}")
            return

        # Create superadmin user
        superadmin = User(
            username=SUPERADMIN_USERNAME,
            email=SUPERADMIN_EMAIL,
            password=generate_password_hash(SUPERADMIN_PASSWORD),
            role="superadmin",
            is_approved=True,
            is_blocked=False,
            is_confirmed=True,
            auth_provider="email",
            created_at=datetime.now(timezone.utc),
        )

        db.session.add(superadmin)
        db.session.commit()

        print("✅ Superadmin created successfully")
        print(f"   Email: {SUPERADMIN_EMAIL}")
        print("   Role: superadmin")
        print("   ⚠️ Change the password after first login!")


if __name__ == "__main__":
    create_superadmin()