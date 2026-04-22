from app.extensions import db
from datetime import datetime

class GroundStationFile(db.Model):
    __tablename__ = "ground_station_files"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(150), nullable=False)

    def __repr__(self):
        return f"<Ground Station File {self.name}>"