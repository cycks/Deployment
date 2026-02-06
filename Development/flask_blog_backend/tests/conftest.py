import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))



import tempfile
import pytest
from app import create_app, db


@pytest.fixture
def app():
    os.environ["DATABASE_URI"] = "postgresql://sikolia:new_strong_password@localhost:5432/loftier_db"
    app = create_app()
    with app.app_context():
        db.create_all()
    yield app

@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    yield
    db.session.rollback()
    db.drop_all()
    db.create_all()