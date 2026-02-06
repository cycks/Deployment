# app.models.category.py

from app.extensions import db
from .associations import post_categories

class Category(db.Model):
    __tablename__ = "category"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )

   # Many-to-Many with Post
    posts = db.relationship(
        "Post",
        secondary=post_categories,
        back_populates="categories",
        lazy="selectin",
        passive_deletes=True # ✅ Optimizes deletion by using DB constraints
    )