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
    # Optimized PostgreSQL settings: pre-ping ensures healthy connections, pool size prevents exhaustion
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
        connect_args={"connect_timeout": 10}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_MIGRATIONS_DONE = False

def ensure_schema_migrations(target_engine=None):
    global _MIGRATIONS_DONE
    if _MIGRATIONS_DONE and not target_engine:
        return
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
                    if "profile_edited_once" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN profile_edited_once BOOLEAN DEFAULT 0")
                    if "profile_edited_at" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN profile_edited_at TIMESTAMP")
                    if "first_time_setup_required" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN first_time_setup_required BOOLEAN DEFAULT 0")

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
                if act_cols:
                    if "activity_date" not in act_cols:
                        conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN activity_date VARCHAR")
                    if "title_kn" not in act_cols:
                        conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN title_kn VARCHAR DEFAULT ''")
                    if "desc_kn" not in act_cols:
                        conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN desc_kn TEXT DEFAULT ''")
                    if "tag_kn" not in act_cols:
                        conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN tag_kn VARCHAR DEFAULT ''")

                # Fast indexes
                try:
                    conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_attendance_date_user ON attendance_records(attendance_date, user_id)")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_wc_attendance_date_user ON working_committee_attendance(attendance_date, working_committee_member_id)")
                except Exception:
                    pass

        elif eng.dialect.name == "postgresql":
            with eng.connect() as conn:
                # 1 single query to fetch all existing columns across target tables
                target_tables = ("registrations", "users", "admins", "gallery_items", "activities")
                query_sql = (
                    "SELECT table_name, column_name FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name IN ('registrations', 'users', 'admins', 'gallery_items', 'activities')"
                )
                try:
                    existing_cols = {(row[0].lower(), row[1].lower()) for row in conn.exec_driver_sql(query_sql).fetchall()}
                except Exception:
                    existing_cols = set()

                def add_pg_col(table, col, col_type):
                    if (table.lower(), col.lower()) not in existing_cols:
                        try:
                            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}")
                            conn.commit()
                        except Exception as col_err:
                            print(f"[PG MIGRATE COL NOTICE] {table}.{col}: {col_err}")

                add_pg_col("registrations", "user_id", "INTEGER REFERENCES users(id)")
                add_pg_col("users", "photo_url", "TEXT")
                add_pg_col("users", "volunteer_domain", "VARCHAR")
                add_pg_col("users", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("users", "faculty_id", "VARCHAR")
                add_pg_col("users", "is_working_committee", "BOOLEAN DEFAULT FALSE")
                add_pg_col("users", "working_committee_role", "VARCHAR DEFAULT 'Coordinator'")
                add_pg_col("users", "managed_by", "VARCHAR")
                add_pg_col("users", "profile_edited_once", "BOOLEAN DEFAULT FALSE")
                add_pg_col("users", "profile_edited_at", "TIMESTAMP")
                add_pg_col("users", "first_time_setup_required", "BOOLEAN DEFAULT FALSE")
                add_pg_col("admins", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("admins", "faculty_id", "VARCHAR")
                add_pg_col("gallery_items", "event_date", "VARCHAR")
                add_pg_col("activities", "activity_date", "VARCHAR")
                add_pg_col("activities", "title_kn", "VARCHAR DEFAULT ''")
                add_pg_col("activities", "desc_kn", "TEXT DEFAULT ''")
                add_pg_col("activities", "tag_kn", "VARCHAR DEFAULT ''")

                # High performance composite indexes
                try:
                    conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_attendance_date_user ON attendance_records(attendance_date, user_id)")
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_wc_attendance_date_user ON working_committee_attendance(attendance_date, working_committee_member_id)")
                    conn.commit()
                except Exception:
                    pass

        _MIGRATIONS_DONE = True
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

