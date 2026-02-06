import pytest
from datetime import datetime, timezone
from flask_jwt_extended import decode_token
from app.models.contact import ContactMessage
from app.extensions import db

from tests.utils import register_any_user, login



def test_list_messages_pagination(client):
    # Register and approve admin user
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Create 12 contact messages
    for i in range(12):
        msg_data = {
            "email": f"user{i}@example.com",
            "subject": f"Subject {i}",
            "message": f"Message content {i}"
        }
        response = client.post("/api/contact", json=msg_data)
        assert response.status_code == 201

    # Call the list endpoint with pagination
    response = client.get(
        "/api/contact/messages?page=1&per_page=10",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.get_json()

    # Check pagination metadata
    assert data["page"] == 1
    assert data["per_page"] == 10
    assert data["total"] >= 12
    assert isinstance(data["messages"], list)
    assert len(data["messages"]) <= 10  # per_page

    # Check structure of first message
    msg = data["messages"][0]
    assert "id" in msg
    assert "email" in msg
    assert "subject" in msg
    assert "message" in msg
    assert "is_read" in msg
    assert "is_actioned" in msg
    assert "created_at" in msg



def test_list_unread_messages(client):
    # Register and approve a superadmin
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    superadmin_token = login(client, superadmin_email).json["access_token"]

    # Create a few unread contact messages
    messages_data = [
        {"email": "user1@example.com", "subject": "Subject 1", "message": "Message 1"},
        {"email": "user2@example.com", "subject": "Subject 2", "message": "Message 2"},
    ]

    for msg in messages_data:
        response = client.post("/api/contact", json=msg)
        assert response.status_code == 201

    # Call the unread messages endpoint as superadmin
    response = client.get(
        "/api/contact/messages/unread",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert isinstance(data["messages"], list)
    assert data["total"] >= 2  # At least the two we added
    assert all(not msg["is_read"] for msg in data["messages"])  # Ensure all are unread



def test_list_unactioned_messages(client):
    # Register and approve a superadmin
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    superadmin_token = login(client, superadmin_email).json["access_token"]

    # Send unactioned messages
    messages_data = [
        {"email": "person1@example.com", "subject": "Unactioned 1", "message": "Needs action"},
        {"email": "person2@example.com", "subject": "Unactioned 2", "message": "Still pending"},
    ]

    for msg in messages_data:
        resp = client.post("/api/contact", json=msg)
        assert resp.status_code == 201

    # Mark one message as actioned
    all_messages = ContactMessage.query.all()
    actioned_msg = all_messages[0]
    actioned_msg.is_actioned = True
    db.session.commit()

    # Call unactioned messages endpoint
    response = client.get(
        "/api/contact/messages/unactioned",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert isinstance(data["messages"], list)
    assert data["total"] >= 1  # Only one should be unactioned
    assert all(msg["is_actioned"] is False for msg in data["messages"])




def test_mark_message_as_read(client):
    # Register and approve a superadmin
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    superadmin_token = login(client, superadmin_email).json["access_token"]

    # Send a contact message
    msg_data = {
        "email": "user@example.com",
        "subject": "Read Test",
        "message": "Please mark this as read."
    }
    send_resp = client.post("/api/contact", json=msg_data)
    assert send_resp.status_code == 201

    # Get the message ID
    message = ContactMessage.query.order_by(ContactMessage.id.desc()).first()
    assert message is not None
    assert message.is_read is False  # Should be unread initially

    # Mark the message as read
    mark_resp = client.put(
        f"/api/contact/mark_read/{message.id}",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )

    assert mark_resp.status_code == 200
    assert mark_resp.get_json()["msg"] == "Message marked as read"

    # Verify in database
    db.session.refresh(message)
    assert message.is_read is True




def test_mark_message_as_unread(client):
    # Register and approve a superadmin
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    superadmin_token = login(client, superadmin_email).json["access_token"]

    # Send a contact message
    msg_data = {
        "email": "test@example.com",
        "subject": "Unread Test",
        "message": "Please mark this as unread"
    }
    send_resp = client.post("/api/contact", json=msg_data)
    assert send_resp.status_code == 201

    # Get the latest message from the database
    from app.models.contact import ContactMessage
    from app.extensions import db

    message = ContactMessage.query.order_by(ContactMessage.id.desc()).first()
    assert message is not None

    # Mark the message as read first
    message.is_read = True
    db.session.commit()
    assert message.is_read is True

    # Now mark the message as unread via the endpoint
    mark_resp = client.put(
        f"/api/contact/mark_unread/{message.id}",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )

    assert mark_resp.status_code == 200
    assert mark_resp.get_json()["msg"] == "Message marked as unread"

    # Confirm in the database
    db.session.refresh(message)
    assert message.is_read is False




def test_send_message_missing_fields(client):
    response = client.post("/api/contact", json={"email": "test@example.com"})

    assert response.status_code == 400
    assert "msg" in response.get_json()


def test_send_message_success(client):
    # Define the contact message payload
    payload = {
        "email": "user@example.com",
        "subject": "Support Request",
        "message": "I need help with my account."
    }

    # Send POST request to /api/contact
    response = client.post("/api/contact", json=payload)

    # Assert response status and body
    assert response.status_code == 201
    json_data = response.get_json()
    assert "msg" in json_data
    assert json_data["msg"] == "Message sent successfully"

    # Optionally verify it was saved in the database
    from app.models.contact import ContactMessage
    from app.extensions import db

    saved = ContactMessage.query.order_by(ContactMessage.id.desc()).first()
    assert saved.email == payload["email"]
    assert saved.subject == payload["subject"]
    assert saved.message == payload["message"]




def test_search_messages(client):
    # Register and approve an admin user
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Send messages
    messages_to_send = [
        {"email": "jane@example.com", "subject": "Feedback",
         "message": "Great platform!"},
        {"email": "john@example.com", "subject": "Bug Report",
         "message": "Found a bug in the dashboard"},
        {"email": "test@example.com", "subject": "Support",
         "message": "I need help with registration"},
    ]

    for msg in messages_to_send:
        resp = client.post("/api/contact", json=msg)
        assert resp.status_code == 201

    # Search using the term "bug"
    search_resp = client.get(
        "/api/contact/messages/search?q=bug",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(search_resp.get_json())
    assert search_resp.status_code == 200
    data = search_resp.get_json()

    assert "messages" in data
    assert data["total"] >= 1
    assert any("bug" in m["subject"].lower() or "bug" in m["message"].lower() for m in data["messages"])