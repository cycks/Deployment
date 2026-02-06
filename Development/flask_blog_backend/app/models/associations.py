# app.models.associations.py
from app.extensions import db


# ✅ Many-to-many association table
post_categories = db.Table(
    'post_categories',
    db.Column('post_id', db.Integer, db.ForeignKey('post.id', ondelete="CASCADE"), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('category.id', ondelete="CASCADE"), primary_key=True)
)


watched_posts = db.Table('watched_posts',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete="CASCADE"), primary_key=True),
    db.Column('post_id', db.Integer, db.ForeignKey('post.id', ondelete="CASCADE"), primary_key=True)
)