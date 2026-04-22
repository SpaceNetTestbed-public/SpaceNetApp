# Provides get_db(), close_db(), and init_db(app) to set up the profile table.
import sqlite3
from flask import g, current_app

def get_db():
    if 'db' not in g:
        db_path = current_app.config.get("DATABASE", "database.db")
        g.db = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        
        # 1. DELETED the entire user table creation block
        
        # 2. Removed user_id and foreign key from experiments
        g.db.execute('''                    
                        CREATE TABLE IF NOT EXISTS experiments
                        (id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        tag TEXT,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                     );''')
                     
        # 3. Removed user_id and foreign key from job_logs
        g.db.execute('''
                        CREATE TABLE IF NOT EXISTS job_logs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            experiment_id INTEGER NOT NULL,
                            logs TEXT,
                            experiment_type INTEGER NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
                        );
                    ''')
                    
        # 4. Removed user_id and foreign key from ground_stations
        g.db.execute('''
            CREATE TABLE IF NOT EXISTS ground_stations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );
        ''')
        
        g.db.execute("PRAGMA foreign_keys = ON;")
        g.db.commit()
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(app):
    # register teardown and ensure initial table creation
    @app.teardown_appcontext
    def _close_db(e=None):
        close_db(e)

    # create table once at startup using app context
    with app.app_context():
        db = get_db()
        db.close()