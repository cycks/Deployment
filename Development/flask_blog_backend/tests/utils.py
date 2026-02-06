from datetime import datetime, timezone
from app.extensions import db
from app.models.user import User


def unique_credentials(role):
    timestamp = int(datetime.now().timestamp() * 1000)
    return (
        f"{role}_{timestamp}@test.com",
        f"{role}_user_{timestamp}"
    )


def register_any_user(client, role, approved=False, blocked=False):
    email, username = unique_credentials(role)

    r = client.post("/api/auth/register", json={
        "email": email,
        "username": username,
        "password": "password",
        "role": role,
        "name": f"Test {role.title()}"
    })
    assert r.status_code == 201, f"{role.title()} registration failed: {r.json}"

    user = User.query.filter_by(email=email).first()
    user.is_approved = approved
    user.is_blocked = blocked
    db.session.commit()

    return user, email



def login(client, email):
    return client.post("/api/auth/login", json={
        "email": email,
        "password": "password"
    })

