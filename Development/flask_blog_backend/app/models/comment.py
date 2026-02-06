# app.models.comment.py
from datetime import datetime, timezone
from app.extensions import db

class Comment(db.Model):
    """
    Represents a user comment on a post.
    This SQLAlchemy model stores a single comment's content, its association to the
    post it belongs to, an optional author (user), creation timestamp, and a
    collection of ratings for the comment.
    Attributes:
        id (int): Primary key.
        content (str): Comment body text. Required (NOT NULL).
        post_id (int): Foreign key referencing post.id. NOT NULL. Database-level
            ON DELETE CASCADE is configured so that when a post is removed, its
            comments are removed as well.
        user_id (int | None): Foreign key referencing user.id. Optional. Database
           -level ON DELETE CASCADE is configured so that when a user is removed,
            their comments are removed as well.
        created_at (datetime): Timestamp when the comment was created. Defaults to
            datetime.utcnow at insertion time.
        ratings (list[CommentRating]): Relationship to CommentRating objects that
            reference this comment. Configured with back_populates="comment",
            cascade="all, delete-orphan" so that rating objects are automatically
            persisted/removed with the parent comment. passive_deletes=True allows
            the database to handle cascade deletes initiated at the DB level.
    Notes:
        - The model relies on both database-level foreign key cascade behavior
          (ondelete="CASCADE") and SQLAlchemy relationship cascade rules to keep
          referential integrity and to properly remove dependent objects.
        - When relying on DB-side cascades, ensure the database and SQLAlchemy
          session are configured to honor ON DELETE actions (passive_deletes=True).
    """
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    
    post_id = db.Column(
        db.Integer,
        db.ForeignKey('post.id', ondelete="CASCADE"),
        nullable=False
    )
    
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete="CASCADE"),
        nullable=True
    )
    
    created_at = created_at = db.Column(
                                        db.DateTime,
                                        default=lambda: datetime.now(timezone.utc)
                                    )
    ratings = db.relationship(
        "CommentRating",
        back_populates="comment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin"
    )

