from datetime import datetime
from app.extensions import db


class JobLog(db.Model):
    __tablename__ = "job_logs"

    id = db.Column(db.Integer, primary_key=True)

    experiment_id = db.Column(
        db.Integer,
        db.ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False
    )

    logs = db.Column(db.Text, nullable=True)

    experiment_type = db.Column(
        db.Integer,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Optional relationships (recommended)
    experiment = db.relationship("Experiment", backref="job_logs")