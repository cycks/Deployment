# app/routes/google_auth.py

import os
import re
import requests
import secrets
import io
from datetime import timedelta, datetime, timezone
from urllib.parse import urlencode

from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from cryptography.fernet import Fernet

from app.extensions import db
from app.models.user import User, RefreshToken
from dotenv import load_dotenv

load_dotenv()

bp = Blueprint("google_auth", __name__, url_prefix="/api/auth")

# ===============================================================
# CONFIG & ENCRYPTION SETUP
# ===============================================================

FRONTEND_URL = os.getenv("FRONTEND_URL")
REDIRECT_URI = os.getenv("REDIRECT_URI")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

GOOGLE_AUTH_URL = os.getenv("GOOGLE_AUTH_URL", "https://accounts.google.com/o/oauth2/v2/auth")
GOOGLE_TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token")
GOOGLE_USERINFO_URL = os.getenv("GOOGLE_USERINFO_URL", "https://www.googleapis.com/oauth2/v3/userinfo")

# Encryption for Google Refresh Tokens
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "").encode()
cipher_suite = Fernet(ENCRYPTION_KEY) if ENCRYPTION_KEY else None

# ===============================================================
# HELPERS
# ===============================================================

def encrypt_token(token: str) -> str:
    """Encrypts a string for reversible storage."""
    if not token or not cipher_suite:
        return token
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(token: str) -> str:
    """Decrypts a string to retrieve the raw Google token."""
    if not token or not cipher_suite:
        return token
    return cipher_suite.decrypt(token.encode()).decode()

def sanitize_username(name: str) -> str:
    """Cleans up names from social providers."""
    if not name:
        return "User"
    clean = re.sub(r"[^\w\s@.-]", "", name)
    return clean.strip() or "User"

def safe_redirect(url: str):
    """Basic protection against open redirect vulnerabilities."""
    if not url.startswith("http"):
        return FRONTEND_URL
    return url

# ===============================================================
# GOOGLE LOGIN (REDIRECT)
# ===============================================================

@bp.route("/google_login")
def google_login():
    """Redirect user to Google's OAuth 2.0 consent page."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return redirect(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")

# ===============================================================
# GOOGLE CALLBACK
# ===============================================================

@bp.route("/google_callback")
def google_callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"msg": "Missing authorization code"}), 400

    # 1. Exchange Code for Tokens
    try:
        token_response = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10
        )
        token_json = token_response.json()
    except Exception as e:
        return jsonify({"msg": "Google token exchange failed", "error": str(e)}), 500

    access_token = token_json.get("access_token")
    google_refresh = token_json.get("refresh_token")
    
    if not access_token:
        return jsonify({"msg": "Failed to obtain Google access token"}), 400

    # 2. Fetch User Profile
    userinfo = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10
    ).json()

    email = userinfo.get("email")
    if not email:
        return jsonify({"msg": "Google account missing email"}), 400

    # 3. Encrypt Google Refresh Token
    encrypted_google_token = encrypt_token(google_refresh) if google_refresh else None

    # 4. Check/Create User
    user = User.query.filter_by(email=email).first()

    if user:
        if user.is_blocked:
            return jsonify({"msg": "Account blocked"}), 403
        
        # Update details
        if encrypted_google_token:
            user.google_refresh_token = encrypted_google_token
        
        # ENSURE session_token exists (Fix for 401 errors)
        if not user.session_token:
            user.session_token = secrets.token_hex(16)
            
        user.auth_provider = "google"
    else:
        # Create new social user
        user = User(
            username=sanitize_username(userinfo.get("name")),
            email=email,
            role="commentator",
            is_approved=True,
            is_confirmed=True,
            profile_picture=userinfo.get("picture"),
            auth_provider="google",
            google_refresh_token=encrypted_google_token,
            session_token=secrets.token_hex(16) # Initialize session_token
        )
        db.session.add(user)
    
    db.session.commit()

    # 5. Handle App-Level Refresh Token
    app_raw_refresh = secrets.token_urlsafe(64)
    new_refresh_record = RefreshToken(
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    new_refresh_record.set_token(app_raw_refresh)
    
    db.session.add(new_refresh_record)
    db.session.commit()

    # 6. Generate Short-lived Access JWT (MATCHING auth.py claims)
    jwt_access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=1),
        additional_claims={
            "role": user.role,
            "session_token": user.session_token # Crucial fix for 401
        }
    )

    # 7. Redirect to Frontend
    redirect_url = safe_redirect(
        f"{FRONTEND_URL}/google-callback?token={jwt_access_token}&refresh={app_raw_refresh}"
    )
    return redirect(redirect_url)

# ===============================================================
# GET AUTHENTICATED USER PROFILE
# ===============================================================
@bp.route("/user/me", methods=["GET"])
@jwt_required()
def user_profile():
    # Identity is stored as a string, cast to int for DB query
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({"msg": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_approved": user.is_approved,
        "profile_picture": user.profile_picture,
        "auth_provider": user.auth_provider
    }), 200

# ===============================================================
# LOGOUT
# ===============================================================

@bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    user = User.query.get(int(get_jwt_identity()))
    
    if user and user.google_refresh_token:
        raw_token = decrypt_token(user.google_refresh_token)
        requests.post(
            "https://oauth2.googleapis.com/revoke",
            params={"token": raw_token},
            timeout=5
        )
        user.google_refresh_token = None

    # Revoke session_token to invalidate current JWTs
    if user:
        user.session_token = secrets.token_hex(16)
        RefreshToken.query.filter_by(user_id=user.id).update({"revoked": True})
    
    db.session.commit()
    return jsonify({"msg": "Logged out successfully"}), 200