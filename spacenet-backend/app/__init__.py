from flask import Flask
from flasgger import Swagger
from .config import Config
from .extensions import rq, redis_client
from .db import init_db
from flask_cors import CORS
from .experiments.routes import bp as experiments_bp
from .jobs.routes import bp as jobs_bp
from .utilities.routes import bp as utility_bp
from .configurations.routes import bp as configuration_bp
from .gif.routes import bp as gif_bp
from .logs.routes import bp as log_bp
from .outputs.routes import bp as output_bp
from .gs.routes import bp as gs_bp
from .extensions import db, migrate
import app.models # noqa

def register_routes(app):
    app.register_blueprint(experiments_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(utility_bp)
    app.register_blueprint(configuration_bp)
    app.register_blueprint(gif_bp)
    app.register_blueprint(log_bp)
    app.register_blueprint(output_bp)
    app.register_blueprint(gs_bp)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["SWAGGER"] = {"title": "Auth API", "uiversion": 3}

    CORS(app)  # allow all origins

    # Initialize extensions
    rq.init_app(app)
    redis_client.init_app(app)
    init_db(app)

    db.init_app(app)
    migrate.init_app(app, db)

    
    swagger_template = {
    "title": "User Auth API",
    "uiversion": 3,
}

    # Swagger setup
    Swagger(app, template=swagger_template)

    # Register all blueprints before Swagger
    register_routes(app)

    # Optional: favicon route
    @app.route('/favicon.ico')
    def favicon():
        return '', 204

    return app