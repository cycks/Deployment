# app.models.post.py

from datetime import datetime, timezone
from app.extensions import db
from .associations import post_categories
from flask import current_app





class Post(db.Model):
    __tablename__ = 'post'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, unique=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
    is_published = db.Column(db.Boolean, nullable=False, default=False)

    author_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete="CASCADE"),
        nullable=False
    )

    categories = db.relationship(
        "Category",
        secondary=post_categories,
        back_populates="posts",
        lazy="selectin"
    )

    images = db.relationship(
        'Image',
        backref='post',
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Image.created_at"
    )

    ratings = db.relationship(
        'PostRating',
        backref='post',
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    comments = db.relationship(
        'Comment',
        backref='post',
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_published": self.is_published,
            "author_id": self.author_id,
            "image_url": self.image_url,  # This calls your @property
            "categories": [cat.name for cat in self.categories] # Optional: list genre names
        }

    # ---------------------------------
    # Computed Image URL Property
    # ---------------------------------
    @property
    def image_url(self):
        """Return the first image URL or None."""
        if not self.images:
            return None

        base_url = current_app.config.get("IMAGE_BASE_URL", "/static/uploads")
        base_url = f"{base_url.rstrip('/')}/PostPics/"
        return f"{base_url}{self.images[0].file_path}"