import uuid
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models.associations import watched_posts



class User(db.Model):
    """
    User model representing an application user and authentication/account metadata.
    Attributes
    - id (int): Primary key.
    - username (str): Unique user handle, required.
    - email (str): Unique email address, required.
    - password (str | None): Nullable password field to allow OAuth-only accounts; if used it MUST be stored as a secure hash (never plaintext).
    - role (str): User role, e.g. "superadmin", "admin", "author", "commentator". Used for authorization.
    - is_approved (bool): Whether the account has been administratively approved.
    - is_blocked (bool): Whether the account is blocked from normal operation.
    - is_confirmed (bool): Whether the user has completed email/account confirmation.
    - created_at (datetime): Timestamp of account creation (default uses UTC).
    - profile_picture (str | None): Optional URL/path to a profile image.
    OAuth and provider fields
    - auth_provider (str): Authentication provider identifier (default 'email'); used to distinguish OAuth vs local accounts.
    - google_refresh_token (Text | None): Refresh token for Google OAuth (sensitive, treat with care).
    - google_id_token (Text | None): ID token from Google OAuth (sensitive, treat with care).
    Relationships
    - watched (many-to-many -> Post): Posts the user has marked as watched; uses a secondary association table (watched_posts) and exposes Post.watched_by via backref. This relationship is configured lazy="dynamic".
    - posts (one-to-many -> Post): Posts authored by this user; backref "author". Configured with cascade="all, delete-orphan" and passive_deletes=True so deleting a user can remove their posts.
    - comments (one-to-many -> Comment): Comments made by the user; backref "commenter" and same cascade/passive delete behavior as posts.
    - comment_ratings (one-to-many -> CommentRating): Ratings the user has made on comments; uses back_populates on the CommentRating side and cascades deletions.
    - post_ratings (one-to-many -> PostRating): Ratings the user has made on posts; configured with backref "user" and delete cascade so ratings are removed when the user is removed.
    Notes and recommendations
    - Treat OAuth tokens and any plain token fields as sensitive: encrypt at rest and exclude from logs and API responses.
    - Ensure password handling uses a strong hashing algorithm (e.g. bcrypt/argon2) and never returns the password field in serialized output.
    - Role values are used for authorization checks; validate and document allowed roles elsewhere in the application.
    - The model's __repr__ provides a concise representation including id, email, and role for debugging.
    Example (conceptual)
    - user.posts -> list of Post instances authored by the user.
    - user.watched.filter(...).all() -> query watched posts (dynamic relationship).
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    
    # Password nullable for OAuth accounts
    password = db.Column(db.String(300), nullable=True)
    
    role = db.Column(db.String(20), nullable=False)  # superadmin, admin, author, commentator
    is_approved = db.Column(db.Boolean, default=False)
    is_blocked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_confirmed = db.Column(db.Boolean, default=False)

    profile_picture = db.Column(db.String(1024), nullable=True)
    session_token = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), nullable=False)

    # OAuth fields
    auth_provider = db.Column(db.String(50), default='email', nullable=False)
    google_refresh_token = db.Column(db.Text, nullable=True)
    google_id_token = db.Column(db.Text, nullable=True)

    # ------------------------
    # Relationships
    # ------------------------

    watched = db.relationship(
        "Post",
        secondary=watched_posts,
        backref=db.backref("watched_by", lazy="dynamic"),
        lazy="dynamic"
    )

    posts = db.relationship(
        "Post",
        backref="author",
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    comments = db.relationship(
        "Comment",
        backref="commenter",
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    comment_ratings = db.relationship(
        "CommentRating",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # REQUIRED for PostRating
    post_ratings = db.relationship(
        "PostRating",
        backref="user",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def __repr__(self):
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"



class RefreshToken(db.Model):
    """
    RefreshToken model representing a persistent refresh token for a user.

    This SQLAlchemy model stores refresh tokens tied to a specific user and
    tracks their lifecycle (creation time, expiration, and revocation). It is
    intended for use with session or JWT refresh flows where long-lived tokens
    must be revocable and expiry-checked on each use.

    Attributes
    ----------
    id : int
        Primary key for the refresh token record.
    user_id : int
        Foreign key referencing the associated User record (ondelete="CASCADE").
    token_hash : str
        The hashed version of the refresh token value. Stored securely using 
        scrypt or pbkdf2. This column is unique and non-nullable.
    created_at : datetime
        Timestamp for when the refresh token was created. Defaults to a
        timezone-aware UTC datetime.
    expires_at : datetime
        Non-nullable expiration timestamp for the token. A token is considered
        expired when the current UTC time is greater than this value.
    revoked : bool
        Flag indicating whether the token has been revoked. Defaults to False.
    user : User
        SQLAlchemy relationship to the owning User object. Backref name:
        "refresh_tokens".

    Methods
    -------
    set_token(token: str) -> None
        Hashes the raw token string and stores it in the token_hash attribute.
    check_token(token: str) -> bool
        Verifies a raw token string against the stored hash.
    is_valid() -> bool
        Returns True if the token is not revoked and the current UTC time is
        before the token's expires_at; otherwise returns False.

    Notes
    -----
    - created_at uses a timezone-aware UTC timestamp to avoid ambiguity across
      deployments in different timezones.
    - The token is stored as a hash; once set, the original raw token cannot 
      be retrieved from the database.
    - The foreign key uses ON DELETE CASCADE so tokens are removed automatically
      when the associated user is deleted.
    """
    __tablename__ = "refresh_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    token_hash = db.Column(db.String(512), unique=True, nullable=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False)

    user = db.relationship("User", backref="refresh_tokens")

    def set_token(self, token):
        """Hash and set the refresh token."""
        self.token_hash = generate_password_hash(token)

    def check_token(self, token):
        """Verify the raw token against the stored hash."""
        return check_password_hash(self.token_hash, token)

    def is_valid(self):
        """Check if token is not revoked and hasn't expired."""
        return not self.revoked and datetime.now(timezone.utc) < self.expires_at


