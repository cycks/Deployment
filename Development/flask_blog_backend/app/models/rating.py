# app.models.rating.py
from app.extensions import db


class PostRating(db.Model):
    """SQLAlchemy model representing a rating that a user assigns to a post.

    Each PostRating row links a user and a post with an integer rating value.
    The model enforces that a user can rate a given post at most once.

    Attributes
    ----------
    id : int
        Primary key for the rating record.
    value : int
        Numerical rating value. Stored as a non-nullable integer column.
    post_id : int
        Foreign key referencing post.id (ondelete="CASCADE"). Identifies the post
        that is being rated and is non-nullable.
    user_id : int
        Foreign key referencing user.id (ondelete="CASCADE"). Identifies the user
        who created the rating and is non-nullable.

    Constraints and behavior
    ------------------------
    - A UniqueConstraint on (post_id, user_id) ensures a single rating per user
      per post.
    - The foreign keys use ON DELETE CASCADE, so removing the referenced post or
      user will automatically remove associated ratings.

    Notes
    -----
    - Validation of the allowed range for `value` (e.g., 1-5) should be implemented
      elsewhere if required; the model only enforces non-nullness and integer type.
    - Typical instantiation: PostRating(value=4, post_id=<post_id>, user_id=<user_id>)
    """
    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.Integer, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )

    post_id = db.Column(
        db.Integer,
        db.ForeignKey('post.id', ondelete="CASCADE"),
        nullable=False
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete="CASCADE"),
        nullable=False
    )

    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='unique_user_post_rating'),
    )


class CommentRating(db.Model):
    """Model representing a user's numeric rating for a comment.

    This SQLAlchemy model records a single numeric rating (e.g., 1-5) that a
    User assigns to a Comment. Each instance maps to a row in the database and
    enforces that a given user may only have one rating per comment.

    Attributes
    ----------
    id : int
        Primary key for the rating row.
    value : int
        Numeric rating value (application-level convention might be 1-5).
    comment_id : int
        Foreign key referencing the associated Comment; non-nullable. On delete
        of the Comment, related ratings are cascaded.
    user_id : int
        Foreign key referencing the User who created the rating; non-nullable. On
        delete of the User, related ratings are cascaded.
    comment : Comment
        SQLAlchemy relationship to the Comment model (back_populates='ratings').
    user : User
        SQLAlchemy relationship to the User model (back_populates='comment_ratings').

    Constraints and behavior
    ------------------------
    - A UniqueConstraint on (comment_id, user_id) ensures a user can have at most
      one rating per comment.
    - Foreign keys use ON DELETE CASCADE semantics so deleting the related Comment
      or User will remove the associated CommentRating rows.
    - Relationships use back_populates to keep bidirectional association in sync
      and passive_deletes=True to rely on database-level cascade behavior.
    """
    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.Integer, nullable=False)  # e.g., 1-5

    comment_id = db.Column(
        db.Integer,
        db.ForeignKey('comment.id', ondelete="CASCADE"),
        nullable=False
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete="CASCADE"),
        nullable=False
    )

    comment = db.relationship("Comment", back_populates="ratings", passive_deletes=True)
    user = db.relationship("User", back_populates="comment_ratings", passive_deletes=True)

    __table_args__ = (
        db.UniqueConstraint('comment_id', 'user_id', name='unique_user_comment_rating'),
    )
