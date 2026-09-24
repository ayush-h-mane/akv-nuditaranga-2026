import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

import logging

logger = logging.getLogger(__name__)

is_production = bool(os.environ.get("VERCEL") or settings.ENVIRONMENT == "production")
raw_db_url = settings.DATABASE_URL or os.environ.get("DATABASE_URL", "")

if is_production and (not raw_db_url or "sqlite" in raw_db_url.lower()):
    raise RuntimeError(
        "CRITICAL DATABASE CONFIGURATION ERROR: A persistent PostgreSQL connection string (DATABASE_URL) "
        "is required in production. Ephemeral SQLite storage causes data loss across serverless container restarts. "
        "Please set DATABASE_URL (e.g. postgresql://user:pass@host:5432/dbname) in your environment variables."
    )

db_url = raw_db_url if raw_db_url else "sqlite:///./akv_fest.db"

# Normalize postgres:// to postgresql:// for modern SQLAlchemy compatibility
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# SQLite local path resolution
if db_url.startswith("sqlite:///./") and not is_production:
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    abs_db_path = os.path.join(root_dir, db_url.replace("sqlite:///./", "")).replace("\\", "/")
    db_url = f"sqlite:///{abs_db_path}"

# Engine options optimized for serverless PostgreSQL execution
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)
else:
    # Serverless PostgreSQL settings: pre-ping checks health, recycle drops stale idle connections
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_migrations(target_engine=None):
    eng = target_engine or engine
    try:
        if eng.dialect.name == "sqlite":
            with eng.connect() as conn:
                # 1. registrations table
                reg_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(registrations)").fetchall()]
                if reg_cols and "user_id" not in reg_cols:
                    conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN user_id INTEGER REFERENCES users(id)")

                # 2. users table
                user_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()]
                if user_cols:
                    if "photo_url" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN photo_url TEXT")
                    if "volunteer_domain" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN volunteer_domain VARCHAR")
                    if "admin_type" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN admin_type VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                    if "faculty_id" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN faculty_id VARCHAR")
                    if "is_working_committee" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN is_working_committee BOOLEAN DEFAULT 0")
                    if "working_committee_role" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN working_committee_role VARCHAR DEFAULT 'Coordinator'")
                    if "managed_by" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN managed_by VARCHAR")

                # 3. admins table
                admin_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(admins)").fetchall()]
                if admin_cols:
                    if "admin_type" not in admin_cols:
                        conn.exec_driver_sql("ALTER TABLE admins ADD COLUMN admin_type VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                    if "faculty_id" not in admin_cols:
                        conn.exec_driver_sql("ALTER TABLE admins ADD COLUMN faculty_id VARCHAR")

                # 4. gallery_items table
                gallery_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(gallery_items)").fetchall()]
                if gallery_cols and "event_date" not in gallery_cols:
                    conn.exec_driver_sql("ALTER TABLE gallery_items ADD COLUMN event_date VARCHAR")

                # 5. activities table
                act_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(activities)").fetchall()]
                if act_cols and "activity_date" not in act_cols:
                    conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN activity_date VARCHAR")

        elif eng.dialect.name == "postgresql":
            with eng.connect() as conn:
                def add_pg_col(table, col, col_type):
                    res = conn.exec_driver_sql(
                        f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{col}'"
                    ).fetchone()
                    if not res:
                        conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
                        conn.commit()

                add_pg_col("registrations", "user_id", "INTEGER REFERENCES users(id)")
                add_pg_col("users", "photo_url", "TEXT")
                add_pg_col("users", "volunteer_domain", "VARCHAR")
                add_pg_col("users", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("users", "faculty_id", "VARCHAR")
                add_pg_col("users", "is_working_committee", "BOOLEAN DEFAULT FALSE")
                add_pg_col("users", "working_committee_role", "VARCHAR DEFAULT 'Coordinator'")
                add_pg_col("users", "managed_by", "VARCHAR")
                add_pg_col("admins", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("admins", "faculty_id", "VARCHAR")
                add_pg_col("gallery_items", "event_date", "VARCHAR")
                add_pg_col("activities", "activity_date", "VARCHAR")

    except Exception as e:
        print(f"[MIGRATION NOTICE] {e}")

# Run schema migrations automatically on engine initialization
ensure_schema_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"[DATABASE ERROR] Transaction rolled back due to error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

