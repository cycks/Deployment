import pytest
from app.extensions import db
from app.models.user import User

from tests.utils import register_any_user, login


@pytest.mark.parametrize("approver_role,target_role,expected_status", [
    ("superadmin", "superadmin", 200),
    ("superadmin", "admin", 200),
    ("superadmin", "author", 200),
    ("admin", "author", 200),
    ("admin", "admin", 403),
    ("admin", "superadmin", 403),
    ("commentator", "admin", 403),
    ("commentator", "author", 403),
    ("commentator", "superadmin", 403),   
])
def test_approve_user_by_role(client, approver_role, target_role, expected_status):
    approver, approver_email = register_any_user(client, approver_role, approved=True)
    target, _ = register_any_user(client, target_role, approved=False)

    token = login(client, approver_email).json["access_token"]
    res = client.put(
        f"/api/users/approve/{target_role}/{target.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    # print("Response JSON:", res.get_json())
    assert res.status_code == expected_status



@pytest.mark.parametrize("blocker_role,target_role,expected_status", [
    ("admin", "commentator", 200),         # Admin can block commentator
    ("admin", "author", 403),              # Admin cannot block author
    ("admin", "admin", 403),               # Admin cannot block admin
    ("superadmin", "commentator", 200),    # Superadmin can block commentator
    ("superadmin", "author", 200),         # Superadmin can block author
    ("superadmin", "admin", 200),          # Superadmin can block admin
])
def test_block_user_by_role(client, blocker_role, target_role, expected_status):
    # Register and approve the user to be blocked
    target_user, _ = register_any_user(client, target_role, approved=True)

    # Register and approve the blocker
    blocker, blocker_email = register_any_user(client, blocker_role, approved=True)

    # Login and get token
    login_resp = login(client, blocker_email)
    assert login_resp.status_code == 200
    token = login_resp.json["access_token"]

    # Determine correct endpoint
    if blocker_role == "admin" and target_role == "commentator":
        # Admins use the role-specific route for blocking commentators
        endpoint = f"/api/users/block/commentator/{target_user.id}"
    else:
        # Generic route for superadmins and other roles
        endpoint = f"/api/users/block/{target_role}/{target_user.id}"

    # Send block request
    res = client.put(endpoint, headers={"Authorization": f"Bearer {token}"})

    # Assert response status
    assert res.status_code == expected_status, (
        f"{blocker_role} failed to block {target_role}: "
        f"Expected {expected_status}, got {res.status_code}. Response: {res.get_json()}"
    )

    # If expected to succeed, verify user is actually blocked in DB
    if expected_status == 200:
        refreshed = User.query.get(target_user.id)
        assert refreshed.is_blocked, f"{target_role} should be marked as blocked"




