# Keeps init-time-light objects. We avoid doing heavy connection work here to prevent circular imports.
import os

from flask_migrate import Migrate
from flask_rq2 import RQ
from flask_sqlalchemy import SQLAlchemy
from redis import Redis
from flask import current_app

rq = RQ(default_timeout=86400)  # will be init_app'd inside create_app()
db = SQLAlchemy()
migrate = Migrate()

# Minimal thin wrapper to provide redis client via app config.
class RedisClient:
    def __init__(self):
        self._client = None

    def init_app(self, app):
        url = app.config["RQ_REDIS_URL"] = os.environ.get(
                "RQ_REDIS_URL",
                "redis://redis:6379/0"
            )
        # Parse url if you want to customize; simplest is to create Redis with host/port/db defaults:
        # but redis-py supports url via from_url
        from redis import Redis
        self._client = Redis.from_url(url)

    @property
    def client(self):
        return self._client

redis_client = RedisClient()