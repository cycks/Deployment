# app/utils/file.py
import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]

def save_image(file, username):
    if file and allowed_file(file.filename):
        # 1. Clean the original filename and extract extension
        ext = file.filename.rsplit(".", 1)[1].lower()
        
        # 2. Sanitize the username (removes spaces/special chars)
        clean_username = secure_filename(username)
        
        # 3. Create the unique filename: username_uuid.extension
        unique_id = uuid.uuid4().hex[:8] # Using first 8 chars of UUID for brevity
        new_filename = f"{clean_username}_{unique_id}.{ext}"
        
        # 4. Save to the path
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        path = os.path.join(upload_folder, new_filename)
        file.save(path)
        
        return new_filename  # Return only the filename to store in the DB
    return None