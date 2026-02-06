from app.extensions import db
from datetime import datetime, timezone

class RejectedRequest(db.Model):
    __tablename__ = 'rejected_requests'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, index=True)
    rejected_by = db.Column(db.String(100), nullable=False)  # Username of admin/author
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "rejected_by": self.rejected_by,
            "reason": self.reason,
            "created_at": self.created_at.isoformat()
        }