#app.models.contact.py
from datetime import datetime, timezone
from app.extensions import db


class ContactMessage(db.Model):
    """
    SQLAlchemy model representing a contact form message.

    This model stores messages submitted via the application's contact form and
    tracks basic processing state.

    Attributes:
        id (int): Primary key identifier for the message.
        email (str): Sender's email address (max length 120). Required.
        subject (str): Message subject (max length 200). Required.
        message (str): Full message body stored as text. Required.
        is_read (bool): Flag indicating whether the message has been read. Defaults to False.
        is_actioned (bool): Flag indicating whether any required follow-up or action has been performed on the message. Defaults to False.
        created_at (datetime): UTC timestamp when the message was created. Defaults to datetime.utcnow.

    Notes:
        - Instances are persisted via SQLAlchemy's session (e.g., db.session.add(...); db.session.commit()).
        - Use is_read and is_actioned to drive admin inbox behavior (filtering, sorting, and workflow).
    """
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    is_actioned = db.Column(db.Boolean, default=False)  # <-- NEW FIELD
    created_at = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )