import os

class Config:
    # Redis / RQ
    RQ_REDIS_URL = os.environ.get("RQ_REDIS_URL", "redis://redis:6379/0")
    # SQLite DB path
    DATABASE = os.environ.get("DATABASE", "database.db")

    # LOCAL FALLBACK
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///spacenet_local.db"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flasgger / Swagger
    SWAGGER = {
        "title": "Spacenet API",
        "uiversion": 3
    }