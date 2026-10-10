import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
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

# Engine options optimized for SQLite and serverless PostgreSQL execution
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 20}
    engine = create_engine(db_url, connect_args=connect_args)

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA synchronous = NORMAL")
            cursor.execute("PRAGMA cache_size = -64000")
            cursor.execute("PRAGMA temp_store = MEMORY")
            cursor.execute("PRAGMA mmap_size = 268435456")
            cursor.execute("PRAGMA busy_timeout = 10000")
        except Exception as pragma_err:
            logger.debug(f"[SQLITE PRAGMA NOTICE] {pragma_err}")
        finally:
            cursor.close()
else:
    connect_args = {
        "connect_timeout": 5,
        "options": "-c statement_timeout=15000"
    }

    # In serverless environments or pooled PostgreSQL (Supabase port 6543 / Neon PgBouncer in transaction mode),
    # psycopg 3's automatic prepared statement caching causes:
    # "(psycopg.errors.InvalidSqlStatementName) prepared statement _pg3_1 does not exist".
    # Setting prepare_threshold=None disables prepared statement caching, making queries 100% compatible.
    if "psycopg2" not in db_url:
        try:
            import psycopg
            connect_args["prepare_threshold"] = None
        except ImportError:
            pass

    # Connection pooling strategy:
    # On Vercel serverless, NullPool prevents idle connection accumulation across frozen containers.
    # On persistent servers (Uvicorn / Docker / VPS), QueuePool maintains and reuses active connections.
    if os.environ.get("VERCEL"):
        from sqlalchemy.pool import NullPool
        engine = create_engine(
            db_url,
            poolclass=NullPool,
            pool_pre_ping=True,
            connect_args=connect_args
        )
    else:
        from sqlalchemy.pool import QueuePool
        engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True,
            pool_timeout=15,
            connect_args=connect_args
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

Base = declarative_base()

_MIGRATIONS_DONE = False
CURRENT_SCHEMA_VERSION = 3

def ensure_schema_migrations(target_engine=None):
    global _MIGRATIONS_DONE
    if _MIGRATIONS_DONE and not target_engine:
        return
    eng = target_engine or engine
    try:
        # Fast-path check: if target migration version has already been applied, skip all DDL immediately!
        try:
            with eng.connect() as check_conn:
                check_conn.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS _schema_migration_version ("
                    "id INTEGER PRIMARY KEY, version INTEGER NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    ")"
                )
                if eng.dialect.name == "postgresql":
                    check_conn.commit()
                row = check_conn.exec_driver_sql("SELECT version FROM _schema_migration_version WHERE id = 1").fetchone()
                if row and row[0] >= CURRENT_SCHEMA_VERSION:
                    _MIGRATIONS_DONE = True
                    return
        except Exception as ver_check_err:
            logger.debug(f"[SCHEMA VERSION CHECK NOTICE] {ver_check_err}")

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
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN admin_type VARCHAR")
                    if "faculty_id" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN faculty_id VARCHAR")
                    if "is_working_committee" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN is_working_committee BOOLEAN DEFAULT 0")
                    if "working_committee_role" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN working_committee_role VARCHAR")
                    if "managed_by" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN managed_by VARCHAR")
                    if "profile_edited_once" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN profile_edited_once BOOLEAN DEFAULT 0")
                    if "profile_edited_at" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN profile_edited_at TIMESTAMP")
                    if "first_time_setup_required" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN first_time_setup_required BOOLEAN DEFAULT 0")
                    if "plain_password" not in user_cols:
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN plain_password VARCHAR")

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

                # High performance indexes for SQLite
                perf_indexes = [
                    "CREATE INDEX IF NOT EXISTS ix_attendance_date_user ON attendance_records(attendance_date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_att_rec_date_status ON attendance_records(attendance_date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_attendance_date_user ON working_committee_attendance(attendance_date, working_committee_member_id)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_rec_date_status ON working_committee_attendance(attendance_date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_user_id ON registrations(user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_user_created ON registrations(user_id, created_at)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_event_id ON registrations(event_id)",
                    "CREATE INDEX IF NOT EXISTS ix_users_role_status ON users(role, account_status)",
                    "CREATE INDEX IF NOT EXISTS ix_vol_att_date_user ON volunteer_attendance(date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_users_auid ON users(auid)",
                    "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)",
                    "CREATE INDEX IF NOT EXISTS ix_users_phone ON users(phone)",
                    "CREATE INDEX IF NOT EXISTS ix_users_reg_id ON users(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_users_wc_role ON users(is_working_committee, role)",
                    "CREATE INDEX IF NOT EXISTS ix_users_volunteer_domain ON users(volunteer_domain)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_auid ON registrations(auid)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_usn ON registrations(usn)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_event_status ON registrations(event_id, status)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_reg_id ON registrations(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_events_active_cat ON events(is_active, category)",
                    "CREATE INDEX IF NOT EXISTS ix_events_type ON events(event_type)",
                    "CREATE INDEX IF NOT EXISTS ix_vol_att_date_status ON volunteer_attendance(date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_att_date_status ON working_committee_attendance(attendance_date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_auid ON checkin_logs(auid)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_reg_id ON checkin_logs(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_user_date ON attendance_audit_logs(attendance_date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_member_date ON working_committee_audit_logs(attendance_date, working_committee_member_id)"
                ]
                for idx_sql in perf_indexes:
                    try:
                        conn.exec_driver_sql(idx_sql)
                    except Exception:
                        pass

        elif eng.dialect.name == "postgresql":
            with eng.connect() as conn:
                # These tables are managed through the backend API. Enable RLS
                # so direct PostgREST roles have no row access unless explicit
                # policies are added. The table-owner role retains backend access.
                for table in (
                    "audit_logs",
                    "checkin_logs",
                    "admins",
                    "attendance_records",
                    "activities",
                    "volunteer_attendance",
                    "users",
                    "gallery_items",
                    "password_reset_tokens",
                    "events",
                    "social_posts",
                    "registrations",
                    "attendance_day_sessions",
                    "attendance_audit_logs",
                    "festival_event_dates",
                    "working_committee_attendance",
                    "working_committee_day_sessions",
                    "working_committee_audit_logs",
                    "karunada_schedule_days",
                ):
                    try:
                        conn.exec_driver_sql(
                            f"ALTER TABLE IF EXISTS public.{table} ENABLE ROW LEVEL SECURITY"
                        )
                        conn.commit()
                    except Exception as rls_err:
                        conn.rollback()
                        print(f"[PG MIGRATE RLS NOTICE] public.{table}: {rls_err}")

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
                add_pg_col("users", "admin_type", "VARCHAR")
                add_pg_col("users", "faculty_id", "VARCHAR")
                add_pg_col("users", "is_working_committee", "BOOLEAN DEFAULT FALSE")
                add_pg_col("users", "working_committee_role", "VARCHAR")
                add_pg_col("users", "managed_by", "VARCHAR")
                add_pg_col("users", "profile_edited_once", "BOOLEAN DEFAULT FALSE")
                add_pg_col("users", "profile_edited_at", "TIMESTAMP")
                add_pg_col("users", "first_time_setup_required", "BOOLEAN DEFAULT FALSE")
                add_pg_col("users", "plain_password", "VARCHAR")
                add_pg_col("admins", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("admins", "faculty_id", "VARCHAR")
                add_pg_col("gallery_items", "event_date", "VARCHAR")
                add_pg_col("activities", "activity_date", "VARCHAR")
                add_pg_col("activities", "title_kn", "VARCHAR DEFAULT ''")
                add_pg_col("activities", "desc_kn", "TEXT DEFAULT ''")
                add_pg_col("activities", "tag_kn", "VARCHAR DEFAULT ''")

                # High performance composite and search indexes for PostgreSQL
                for pg_idx_sql in [
                    "CREATE INDEX IF NOT EXISTS ix_attendance_date_user ON attendance_records(attendance_date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_att_rec_date_status ON attendance_records(attendance_date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_attendance_date_user ON working_committee_attendance(attendance_date, working_committee_member_id)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_rec_date_status ON working_committee_attendance(attendance_date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_user_id ON registrations(user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_user_created ON registrations(user_id, created_at)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_event_id ON registrations(event_id)",
                    "CREATE INDEX IF NOT EXISTS ix_users_role_status ON users(role, account_status)",
                    "CREATE INDEX IF NOT EXISTS ix_vol_att_date_user ON volunteer_attendance(date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_users_auid ON users(auid)",
                    "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)",
                    "CREATE INDEX IF NOT EXISTS ix_users_phone ON users(phone)",
                    "CREATE INDEX IF NOT EXISTS ix_users_reg_id ON users(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_users_wc_role ON users(is_working_committee, role)",
                    "CREATE INDEX IF NOT EXISTS ix_users_volunteer_domain ON users(volunteer_domain)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_auid ON registrations(auid)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_usn ON registrations(usn)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_event_status ON registrations(event_id, status)",
                    "CREATE INDEX IF NOT EXISTS ix_registrations_reg_id ON registrations(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_events_active_cat ON events(is_active, category)",
                    "CREATE INDEX IF NOT EXISTS ix_events_type ON events(event_type)",
                    "CREATE INDEX IF NOT EXISTS ix_vol_att_date_status ON volunteer_attendance(date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_att_date_status ON working_committee_attendance(attendance_date, status)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_auid ON checkin_logs(auid)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_reg_id ON checkin_logs(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_user_date ON attendance_audit_logs(attendance_date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_member_date ON working_committee_audit_logs(attendance_date, working_committee_member_id)"
                ]:
                    try:
                        conn.exec_driver_sql(pg_idx_sql)
                        conn.commit()
                    except Exception:
                        pass

        # Purge legacy preloaded dummy accounts (akv-nt-2026, AKV-SUPERADMIN, akv@acharya.ac.in)
        try:
            with eng.connect() as conn:
                conn.exec_driver_sql("DELETE FROM admins WHERE username IN ('akv-nt-2026', 'superadmin', 'akvadmin')")
                conn.exec_driver_sql("DELETE FROM users WHERE email = 'akv@acharya.ac.in' OR auid = 'AKV-SUPERADMIN' OR registration_id = 'AKV-SA-0001'")
                # Clean up legacy default working_committee_role and admin_type from users who are not working committee
                conn.exec_driver_sql("""
                    UPDATE users 
                    SET working_committee_role = NULL 
                    WHERE (is_working_committee IS NULL OR is_working_committee = 0)
                      AND (volunteer_domain != 'Working Committee' OR volunteer_domain IS NULL)
                      AND role != 'WORKING_COMMITTEE'
                """)
                conn.exec_driver_sql("""
                    UPDATE users 
                    SET admin_type = NULL 
                    WHERE (is_working_committee IS NULL OR is_working_committee = 0)
                      AND role NOT IN ('ADMIN', 'WORKING_COMMITTEE')
                """)
                conn.exec_driver_sql("""
                    UPDATE users 
                    SET working_committee_role = NULL, admin_type = NULL 
                    WHERE role = 'SUPERADMIN' AND (is_working_committee IS NULL OR is_working_committee = 0)
                """)
                conn.commit()
        except Exception as cleanup_err:
            print(f"[CLEANUP NOTICE] {cleanup_err}")

        # Record migration version completion so future boots are instantaneous
        try:
            with eng.connect() as conn:
                if eng.dialect.name == "postgresql":
                    conn.exec_driver_sql(
                        "INSERT INTO _schema_migration_version (id, version, updated_at) "
                        "VALUES (1, :v, CURRENT_TIMESTAMP) "
                        "ON CONFLICT (id) DO UPDATE SET version = :v, updated_at = CURRENT_TIMESTAMP",
                        {"v": CURRENT_SCHEMA_VERSION}
                    )
                    conn.commit()
                else:
                    conn.exec_driver_sql(
                        "INSERT OR REPLACE INTO _schema_migration_version (id, version, updated_at) "
                        "VALUES (1, ?, CURRENT_TIMESTAMP)",
                        (CURRENT_SCHEMA_VERSION,)
                    )
                    conn.commit()
        except Exception as ver_write_err:
            print(f"[SCHEMA VERSION WRITE NOTICE] {ver_write_err}")

        _MIGRATIONS_DONE = True
    except Exception as e:
        print(f"[MIGRATION NOTICE] {e}")

# Migrations are safely executed during FastAPI on_startup, not at module import time.

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

