# app.models.image.py
import os
from flask import current_app
from sqlalchemy import event
from app.extensions import db

class Image(db.Model):
    # ... (Keep your existing Image class definition here) ...
    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(300), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )
    
    post_id = db.Column(
        db.Integer,
        db.ForeignKey('post.id', ondelete="CASCADE"),
        nullable=False
    )

# --- SQLAlchemy Event Listeners ---

@event.listens_for(Image, 'after_delete')
def receive_after_delete(mapper, connection, target):
    """
    Automatically deletes the physical file from the disk 
    when an Image record is deleted from the database.
    """
    if target.file_path:
        # Since file_path might just be the filename (e.g., 'admin_123.jpg'), 
        # we join it with the UPLOAD_FOLDER config
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'static/uploads')
        
        # Build the full system path
        full_path = os.path.join(upload_folder, target.file_path)
        
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
                print(f"Successfully deleted file: {full_path}")
        except Exception as e:
            print(f"Error deleting physical file: {e}")


@event.listens_for(Image, 'after_update')
def receive_after_update(mapper, connection, target):
    # Logic to find the 'old' file_path and delete it 
    # only if the file_path has actually changed.
    pass