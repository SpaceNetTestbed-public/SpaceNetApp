from app.extensions import db
from datetime import datetime

class CustomTLE(db.Model):
    __tablename__ = "custom_tles"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(150), nullable=False)

    description = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<Custom TLE{self.name}>"