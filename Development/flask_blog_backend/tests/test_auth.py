import pytest
from datetime import datetime, timezone
from flask_jwt_extended import decode_token
from app.models.user import User
from app.extensions import db

from tests.utils import register_any_user, login





def test_admin_login_and_token(client):
    user, email = register_any_user(client, "admin", approved=True, blocked=False)
    r = login(client, email)
    assert r.status_code == 200
    assert "access_token" in r.json



def test_author_registration_and_unapproved_login(client):
    user, email = register_any_user(client, "author", approved=False, blocked=False)
    r = login(client, email)
    assert r.status_code == 403  # not approved
    assert r.json["msg"].lower().startswith("account not approved")



@pytest.mark.parametrize("role", ["admin", "author", "commentator", "superadmin"])
def test_any_unapproved_user_cannot_login(client, role):
    user, email = register_any_user(client, role, approved=False, blocked=False)
    r = login(client, email)
    assert r.status_code == 403
    assert r.json["msg"].lower().startswith("account not approved")


def test_any_blocked_user_cannot_login(client):
    user, email = register_any_user(client, "admin", approved=True, blocked=True)
    r = login(client, email)
    assert r.status_code == 403
    assert r.json["msg"].lower().startswith("account blocked")


def test_superadmin_registration_and_login(client):
    user, email = register_any_user(client, "superadmin", approved=True, blocked=False)
    assert user.role == "superadmin"
    assert user.is_approved
    assert not user.is_blocked

    r = login(client, email)
    assert r.status_code == 200
    token = decode_token(r.json["access_token"])
    assert token["sub"] == str(user.id)


def test_blocked_superadmin_cannot_login(client):
    user, email = register_any_user(client, "superadmin", approved=True, blocked=True)
    r = login(client, email)
    assert r.status_code == 403
    assert r.json["msg"].lower().startswith("account blocked")


def test_commentator_registration_and_login(client):
    user, email = register_any_user(client, "commentator", approved=True, blocked=False)
    assert user.role == "commentator"
    assert not user.is_blocked

    r = login(client, email)
    assert r.status_code == 200
    token = decode_token(r.json["access_token"])
    assert token["sub"] == str(user.id)


def test_blocked_commentator_cannot_login(client):
    user, email = register_any_user(client, "commentator", approved=True, blocked=True)
    r = login(client, email)
    assert r.status_code == 403
    assert r.json["msg"].lower().startswith("account blocked")
