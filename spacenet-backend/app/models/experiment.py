from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON  # optional if using Postgres

class Experiment(db.Model):
    __tablename__ = "experiments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    
    # Tags stored as JSON array of strings
    tags = db.Column(db.JSON, nullable=True, default=list)  

    description = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<Experiment {self.name}>"
