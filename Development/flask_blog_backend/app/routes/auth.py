# flask_blog_backend/app/routes/auth.py
import os
import logging
import uuid
import cv2
from datetime import timedelta, datetime, timezone
from logging.handlers import RotatingFileHandler


from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token
from flask_mail import Message
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer

from app.extensions import db, mail
from app.models.user import User


bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# ============================================================
# CONFIG & SERIALIZER
# ============================================================

# We use a lambda or property to ensure these pull from the active app config
def get_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

ACCESS_EXPIRES = timedelta(hours=3)

# ============================================================
# LOGGING SETUP
# ============================================================

log_path = os.path.join(os.path.dirname(__file__), "../../logs/email_errors.log")
os.makedirs(os.path.dirname(log_path), exist_ok=True)

logger = logging.getLogger("email_logger")
logger.setLevel(logging.INFO)
handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=3)
handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))

if not logger.handlers:
    logger.addHandler(handler)

# ============================================================
# HELPERS
# ============================================================

def allowed_file(filename: str) -> bool:
    allowed = current_app.config.get("ALLOWED_EXTENSIONS", {"png", "jpg", "jpeg", "gif"})
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed

def cartoonize_image(input_path, username):
    """Processes image and returns a BytesIO object (in-memory file)."""
    img = cv2.imread(input_path)
    if img is None:
        return None

    try:
        # --- Your Processing Logic ---
        smooth = cv2.bilateralFilter(img, 9, 75, 75)
        gray = cv2.cvtColor(smooth, cv2.COLOR_BGR2GRAY)
        edges = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY, 9, 9
        )
        cartoon = cv2.bitwise_and(smooth, smooth, mask=edges)

        # --- The In-Memory Magic ---
        # 1. Encode the image into a JPEG buffer in memory
        success, buffer = cv2.imencode(".jpg", cartoon)
        if not success:
            return None

        # 2. Convert buffer to a BytesIO object (acts like a file)
        memory_file = io.BytesIO(buffer.tobytes())
        memory_file.seek(0)  # Reset pointer to the start of the file

        return memory_file
    except Exception as e:
        # Use your project's logger here
        print(f"OpenCV processing failed for {username}: {e}")
        return None

def send_email(subject: str, recipients: list, html: str) -> bool:
    msg = Message(subject=subject, recipients=recipients, html=html)
    try:
        mail.send(msg)
        logger.info(f"Email sent successfully to {recipients}")
        return True
    except Exception as e:
        logger.exception(f"Email failed for {recipients}: {e}")
        return False

# ============================================================
# AUTH ROUTES
# ============================================================
def get_upload_dir(subfolder="ProfilePics"): # Add the parameter here
    # 1. Get base folder
    base_folder = current_app.config.get("UPLOAD_FOLDER", "static/uploads")

    # 2. Use the subfolder passed to the function
    relative_path = os.path.join(base_folder, subfolder)

    # 3. Join with root_path
    abs_path = os.path.abspath(os.path.join(current_app.root_path, relative_path))

    try:
        os.makedirs(abs_path, exist_ok=True)
    except OSError as e:
        current_app.logger.error(f"Directory creation failed: {e}")
        raise

    return abs_path



@bp.route("/register", methods=["POST"])
def register():
    data = request.form
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([username, email, password, role]):
        return jsonify({"msg": "All fields are required"}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({"msg": "User already exists"}), 400

    db_profile_path = None


    
    if role in ["author", "admin", "superadmin"]:
        pic = request.files.get("profile_picture")
        if not pic or not allowed_file(pic.filename):
            return jsonify({"msg": "Valid profile picture required"}), 400

        # 1. Prepare filenames and directories
        ext = pic.filename.rsplit('.', 1)[1].lower()
        final_filename = f"profile_picture_{secure_filename(username)}_{uuid.uuid4().hex[:8]}.{ext}"
        
        # Get your local absolute path (creates folder if missing)
        # Assuming you modified get_upload_dir to accept a subfolder or changed it to ProfilePics
        upload_dir = get_upload_dir("ProfilePics") 
        final_save_path = os.path.join(upload_dir, final_filename)

        # 2. Save incoming file to temp for OpenCV
        temp_path = os.path.join("/tmp", f"raw_{uuid.uuid4().hex}.{ext}")
        pic.save(temp_path)

        

        try:
            # 3. Process image (Cartoonize)
            processed_mem_file = cartoonize_image(temp_path, username)
            
            if processed_mem_file:
                # 4. Save the IN-MEMORY cartoon image to local disk
                with open(final_save_path, 'wb') as f:
                    f.write(processed_mem_file.getbuffer())
            else:
                # Fallback: Copy original if processing fails
                import shutil
                shutil.copy(temp_path, final_save_path)

            # 5. Store the relative path in DB for URL generation later
            # Typically: "ProfilePics/filename.jpg"
            db_profile_path = os.path.join("ProfilePics", final_filename)

        except Exception as e:
            current_app.logger.error(f"Image processing failed: {e}")
            return jsonify({"msg": "Image processing error"}), 500
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # 6. Create User
    user = User(
        username=username,
        email=email,
        password=generate_password_hash(password),
        role=role,
        is_approved=(role == "commentator"),
        profile_picture=db_profile_path,
        is_confirmed=False
    )
    db.session.add(user)
    db.session.commit()

    # Generate Confirmation Email
    ts = get_serializer()
    token = ts.dumps(email, salt="email-confirm-salt")
    frontend_url = current_app.config.get("FRONTEND_URL",
                                          "http://localhost:3000")
    confirm_link = f"{frontend_url}/confirm?token={token}"

    email_html = f"""
    <h2>Welcome to the Blog, {username}!</h2>
    <p>Please confirm your account by clicking the link below:</p>
    <a href="{confirm_link}">Confirm Account</a>
    """

    send_email("Confirm Your Email", [email], email_html)

    return jsonify({"msg": "Registration successful. Check your email to confirm."}), 201



@bp.route("/confirm/<token>", methods=["GET"])
def confirm(token):
    ts = get_serializer()
    try:
        email = ts.loads(token, salt="email-confirm-salt", max_age=3600)
    except:
        return jsonify({"msg": "Invalid or expired token"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    user.is_confirmed = True
    db.session.commit()
    return jsonify({"msg": "Email confirmed successfully"}), 200



@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"msg": "Invalid credentials"}), 401

    if not user.is_confirmed:
        return jsonify({"msg": "Please confirm your email first"}), 403

    if not user.is_approved:
        return jsonify({"msg": "Your account is pending admin approval"}), 403

    if user.is_blocked:
        return jsonify({"msg": "Your account has been blocked"}), 403

    # Create token with role claim for our role_required decorator
    access_token = create_access_token(
    identity=str(user.id),
    additional_claims={
        "role": user.role,
        "session_token": user.session_token
    },
    expires_delta=ACCESS_EXPIRES
)

    # Build full URL for profile picture
    base_url = current_app.config.get("IMAGE_BASE_URL", "/static/uploads/")
    pic_url = f"{base_url}{user.profile_picture}" if user.profile_picture else None

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "profile_picture": pic_url
        }
    }), 200


@bp.route("/reset-password/request", methods=["POST"])
def request_reset():
    data = request.get_json()
    email = data.get("email")
    user = User.query.filter_by(email=email).first()

    # Even if user doesn't exist, we return 200 to prevent user enumeration
    if user:
        ts = get_serializer()
        token = ts.dumps(email, salt="password-reset-salt")
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        html = f"<p>Click to reset your password: <a href='{reset_link}'>Reset Now</a></p>"
        send_email("Password Reset Request", [email], html)

    return jsonify({"msg": "If the account exists, a reset email has been sent."}), 200


@bp.route("/reset-password/confirm", methods=["POST"])
def confirm_reset():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("new_password")

    if not new_password:
        return jsonify({"msg": "New password is required"}), 400

    ts = get_serializer()
    try:
        # Load the email from the token
        email = ts.loads(token, salt="password-reset-salt", max_age=3600)
    except:
        return jsonify({"msg": "Invalid or expired token"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # 1. Update the password
    user.password = generate_password_hash(new_password)
    
    # 2. Rotate the session_token
    # This changes the "key" stored in the DB. Existing JWTs will still have 
    # the OLD session_token in their claims, making them fail validation.
    user.session_token = str(uuid.uuid4())
    
    try:
        db.session.commit()
        return jsonify({
            "msg": "Password has been reset successfully. All active sessions have been logged out."
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "An error occurred while resetting the password."}), 500