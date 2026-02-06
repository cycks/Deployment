# app.config.py
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.environ.get("SQLALCHEMY_DATABASE_URI")
    GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
    GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=3)   # default is 15m
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)  
    MAIL_SERVER = 'das111.truehost.cloud'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False 
    MAIL_USERNAME = 'info@loftiermovies.com'
    MAIL_PASSWORD = '*info@Loftier.1899'
    MAIL_DEFAULT_SENDER = 'info@loftiermovies.com'
    UPLOAD_FOLDER = "static/uploads"
    IMAGE_BASE_URL = os.environ.get("IMAGE_BASE_URL", "/static/uploads/")
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 5 MB max upload
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
    

