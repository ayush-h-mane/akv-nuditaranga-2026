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
        "connect_timeout": 10
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
CURRENT_SCHEMA_VERSION = 8

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
                    try:
                        check_conn.exec_driver_sql("ALTER TABLE _schema_migration_version ENABLE ROW LEVEL SECURITY")
                        check_conn.exec_driver_sql("REVOKE ALL ON TABLE _schema_migration_version FROM anon, authenticated")
                    except Exception as rls_err:
                        logger.debug(f"[RLS SETUP NOTICE] {rls_err}")
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
                if reg_cols:
                    if "user_id" not in reg_cols:
                        conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN user_id INTEGER REFERENCES users(id)")
                    if "instagram_username" not in reg_cols:
                        conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN instagram_username VARCHAR")
                    if "instagram_profile_link" not in reg_cols:
                        conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN instagram_profile_link VARCHAR")

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
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_reg_time ON checkin_logs(registration_id, timestamp DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_timestamp ON checkin_logs(timestamp DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_user_date ON attendance_audit_logs(attendance_date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_date_modified ON attendance_audit_logs(attendance_date, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_user_modified ON attendance_audit_logs(user_id, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_modified_at ON attendance_audit_logs(modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_member_date ON working_committee_audit_logs(attendance_date, working_committee_member_id)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_date_modified ON working_committee_audit_logs(attendance_date, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_member_modified ON working_committee_audit_logs(working_committee_member_id, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_modified_at ON working_committee_audit_logs(modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_action_created ON audit_logs(action, created_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_action_id ON audit_logs(action, id DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_target ON audit_logs(target_type, target_id)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id)"
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
                add_pg_col("registrations", "instagram_username", "VARCHAR")
                add_pg_col("registrations", "instagram_profile_link", "VARCHAR")
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
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_reg_id ON checkin_logs(registration_id)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_reg_time ON checkin_logs(registration_id, timestamp DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_checkin_logs_timestamp ON checkin_logs(timestamp DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_user_date ON attendance_audit_logs(attendance_date, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_date_modified ON attendance_audit_logs(attendance_date, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_user_modified ON attendance_audit_logs(user_id, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_att_audit_modified_at ON attendance_audit_logs(modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_member_date ON working_committee_audit_logs(attendance_date, working_committee_member_id)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_date_modified ON working_committee_audit_logs(attendance_date, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_member_modified ON working_committee_audit_logs(working_committee_member_id, modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_wc_audit_modified_at ON working_committee_audit_logs(modified_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_action_created ON audit_logs(action, created_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_action_id ON audit_logs(action, id DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at DESC)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_target ON audit_logs(target_type, target_id)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id)"
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

        # Ensure INITIAL_EVENTS (strictly Reel Contest) is present in the database
        try:
            from .seed import INITIAL_EVENTS
            with eng.connect() as conn:
                existing_eids = {row[0].upper() for row in conn.exec_driver_sql("SELECT id FROM events").fetchall() if row[0]}
                for ev in INITIAL_EVENTS:
                    if ev["id"].upper() not in existing_eids:
                        cols = ", ".join(ev.keys())
                        placeholders = ", ".join([f":{k}" for k in ev.keys()])
                        conn.exec_driver_sql(f"INSERT INTO events ({cols}) VALUES ({placeholders})", ev)
                        existing_eids.add(ev["id"].upper())
                conn.commit()
        except Exception as event_seed_err:
            logger.debug(f"[EVENT SEED MIGRATION NOTICE] {event_seed_err}")

        # Deduplication & Portal Event Registration Migration:
        # Move registrations from duplicate backend IDs to portal IDs, ensure portal competitions are Open, and delete backend duplicates
        try:
            with eng.connect() as conn:
                portal_competitions = [
                    {
                        "id": "AKV-NT-09",
                        "title_en": "Pottery",
                        "title_kn": "ಮಣ್ಣಿನ ಮಡಕೆ ತಯಾರಿಕೆ",
                        "category": "traditional",
                        "category_kn": "ಸಾಂಪ್ರದಾಯಿಕ",
                        "venue": "I Love Acharya",
                        "venue_kn": "ಐ ಲವ್ ಆಚಾರ್ಯ, ಆವರಣ",
                        "event_date": "November 03, 2026",
                        "event_time": "12:00 PM",
                        "reporting_time": "11:30 AM",
                        "max_slots": 200,
                        "format": "solo",
                        "is_team": False,
                        "is_active": True,
                        "rules_en": "1. Clay and pottery wheel setup provided.\n2. Shape and model within the time limit.\n3. Judge decisions are final.",
                        "rules_kn": "೧. ಜೇಡಿಮಣ್ಣು ಮತ್ತು ಮಡಕೆ ಮಾಡುವ ಸಾಧನಗಳನ್ನು ಒದಗಿಸಲಾಗುತ್ತದೆ.\n೨. ನಿಗದಿತ ಸಮಯದಲ್ಲಿ ಮಡಕೆ ರೂಪಿಸಬೇಕು.\n೩. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ.",
                        "description_en": "Traditional clay pottery craftsmanship contest celebrating indigenous Kannada art.",
                        "description_kn": "ಸಾಂಪ್ರದಾಯಿಕ ಮಣ್ಣಿನ ಮಡಕೆ ತಯಾರಿಕೆಯ ಕಲಾ ಸ್ಪರ್ಧೆ."
                    },
                    {
                        "id": "AKV-NT-10",
                        "title_en": "Mehendi Competition",
                        "title_kn": "ಮೆಹಂದಿ ಸ್ಪರ್ಧೆ (Mehendi)",
                        "category": "traditional",
                        "category_kn": "ಸಾಂಪ್ರದಾಯಿಕ",
                        "venue": "Ana Block, Acharya IT",
                        "venue_kn": "ಅನಾ ಬ್ಲಾಕ್, ಆಚಾರ್ಯ ಐ.ಟಿ",
                        "event_date": "November 03, 2026",
                        "event_time": "2:00 PM",
                        "reporting_time": "01:30 PM",
                        "max_slots": 100,
                        "format": "solo",
                        "is_team": False,
                        "is_active": True,
                        "rules_en": "1. One participant must apply mehendi on hand.\n2. Participants must bring their own organic mehendi cones.\n3. Time limit: 1.5 hours.\n4. Creativity and neatness will be judged.",
                        "rules_kn": "೧. ಒಬ್ಬ ಸ್ಪರ್ಧಿ ಕೈಗೆ ಮೆಹಂದಿ ಹಾಕಬೇಕು.\n೨. ನೈಸರ್ಗಿಕ ಮೆಹಂದಿ ಕೋನ್‌ಗಳನ್ನು ತಾವೇ ತರಬೇಕು.\n೩. ಸಮಯದ ಮಿತಿ: ೧.೫ ಗಂಟೆಗಳು.\n೪. ಕಲಾತ್ಮಕತೆ ಮತ್ತು ಅಚ್ಚುಕಟ್ಟುತನಕ್ಕೆ ಅಂಕಗಳು.",
                        "description_en": "Craft intricate bridal, Arabic, and traditional Kannada floral henna designs.",
                        "description_kn": "ಸಾಂಪ್ರದಾಯಿಕ ನವಿರಾದ ಮೆಹಂದಿ ವಿನ್ಯಾಸಗಳು ಮತ್ತು ಹಬ್ಬದ ಕಲಾತ್ಮಕತೆಯನ್ನು ಬಿಂಬಿಸುವ ಸ್ಪರ್ಧೆ."
                    },
                    {
                        "id": "AKV-NT-11",
                        "title_en": "Painting Competition",
                        "title_kn": "ಚಿತ್ರಕಲೆ ಸ್ಪರ್ಧೆ (Painting)",
                        "category": "fine_arts",
                        "category_kn": "ಲಲಿತಕಲೆ",
                        "venue": "Cya Stairs, Acharya",
                        "venue_kn": "ಸಿಯಾ ಮೆಟ್ಟಿಲುಗಳು, ಆಚಾರ್ಯ",
                        "event_date": "October 28, 2026",
                        "event_time": "2:00 PM",
                        "reporting_time": "01:30 PM",
                        "max_slots": 100,
                        "format": "solo",
                        "is_team": False,
                        "is_active": False,
                        "rules_en": "1. Drawing sheets will be provided; bring your own colors and brushes.\n2. Time limit: 2 hours.\n3. Theme will be provided before commencement.\n4. Cleanliness and originality will be evaluated.",
                        "rules_kn": "೧. ಚಿತ್ರಕಲೆಯ ಹಾಳೆಯನ್ನು ಒದಗಿಸಲಾಗುವುದು; ಬಣ್ಣಗಳು ಮತ್ತು ಕುಂಚಗಳನ್ನು ಸ್ವತಃ ತರಬೇಕು.\n೨. ಸಮಯದ ಮಿತಿ: ೨ ಗಂಟೆಗಳು.\n೩. ವಿಷಯವನ್ನು ಆರಂಭಕ್ಕೂ ಮುನ್ನ ನೀಡಲಾಗುವುದು.\n೪. ಸ್ವಂತಿಕೆ ಮತ್ತು ಕಲಾತ್ಮಕತೆಗೆ ಆದ್ಯತೆ.",
                        "description_en": "Express Karnataka's folk colors and cultural vibrance with water, acrylic, or poster colors on canvas.",
                        "description_kn": "ಕರ್ನಾಟಕದ ಜಾನಪದ ಬಣ್ಣಗಳು ಹಾಗೂ ಸಾಂಸ್ಕೃತಿಕ ಸಿರಿಯನ್ನು ಕ್ಯಾನ್ವಾಸ್ ಮೇಲೆ ಅರಳಿಸುವ ಚಿತ್ರಕಲೆ ಸ್ಪರ್ಧೆ."
                    },
                    {
                        "id": "AKV-NT-12",
                        "title_en": "Rangoli Competition",
                        "title_kn": "ರಂಗೋಲಿ ಸ್ಪರ್ಧೆ (Rangoli)",
                        "category": "traditional",
                        "category_kn": "ಸಾಂಪ್ರದಾಯಿಕ",
                        "venue": "Acharya Streets, Acharya IT",
                        "venue_kn": "ಆಚಾರ್ಯ ರಸ್ತೆಗಳು, ಆಚಾರ್ಯ ಐ.ಟಿ",
                        "event_date": "November 03, 2026",
                        "event_time": "3:00 PM",
                        "reporting_time": "02:30 PM",
                        "max_slots": 100,
                        "format": "solo",
                        "is_team": False,
                        "is_active": True,
                        "rules_en": "1. Space provided per participant.\n2. Bring your own rangoli powders/materials; stencils are not permitted.\n3. Time limit: 2 hours.\n4. Decisions of the judges are final.",
                        "rules_kn": "೧. ಪ್ರತಿ ಸ್ಪರ್ಧಿಗೆ ನಿಗದಿತ ಜಾಗ ನೀಡಲಾಗುತ್ತದೆ.\n೨. ರಂಗೋಲಿ ಬಣ್ಣಗಳನ್ನು ತಾವೇ ತರಬೇಕು; ಯಾವುದೇ ಸ್ಟೆನ್ಸಿಲ್‌ಗಳಿಗೆ ಅನುಮತಿ ಇಲ್ಲ.\n೩. ಸಮಯದ ಮಿತಿ: ೨ ಗಂಟೆಗಳು.\n೪. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ.",
                        "description_en": "Showcase the rich heritage of traditional Kannada patterns, floral designs, and folk motifs using vibrant rangoli powders.",
                        "description_kn": "ಕನ್ನಡ ನಾಡಿನ ಸಾಂಪ್ರದಾಯಿಕ ರಂಗೋಲಿ ವಿನ್ಯಾಸಗಳು ಮತ್ತು ಹೂವಿನ ಚಿತ್ತಾರಗಳನ್ನು ವರ್ಣಮಯವಾಗಿ ಬಿಂಬಿಸುವ ಸ್ಪರ್ಧೆ."
                    },
                    {
                        "id": "AKV-NT-17",
                        "title_en": "Sketching Competition",
                        "title_kn": "ಸ್ಕೆಚಿಂಗ್ ಸ್ಪರ್ಧೆ (Sketching)",
                        "category": "fine_arts",
                        "category_kn": "ಲಲಿತಕಲೆ",
                        "venue": "Admin Stairs",
                        "venue_kn": "ಆಡಳಿತ ಕಚೇರಿ ಮೆಟ್ಟಿಲುಗಳು, ಆಚಾರ್ಯ",
                        "event_date": "October 28, 2026",
                        "event_time": "3:00 PM - 04:00 PM",
                        "reporting_time": "02:30 PM",
                        "max_slots": 100,
                        "format": "solo",
                        "is_team": False,
                        "is_active": False,
                        "rules_en": "1. Sketching paper will be provided; participants must bring their own sketching pencils and erasers.\n2. Time limit: 1 hour.\n3. Theme will be announced at the venue.\n4. Decisions of the judges are final.",
                        "rules_kn": "೧. ಸ್ಕೆಚಿಂಗ್ ಹಾಳೆಯನ್ನು ಆಯೋಜಕರೇ ನೀಡುತ್ತಾರೆ; ಸ್ಪರ್ಧಿಗಳು ತಮ್ಮದೇ ಪೆನ್ಸಿಲ್ ಮತ್ತು ರಬ್ಬರ್ ತರಬೇಕು.\n೨. ಸಮಯದ ಮಿತಿ: ೧ ಗಂಟೆ.\n೩. ವಿಷಯವನ್ನು ಸ್ಥಳದಲ್ಲೇ ಪ್ರಕಟಿಸಲಾಗುವುದು.\n೪. ತೀರ್ಪುಗಾರರ ನಿರ್ಧಾರವೇ ಅಂತಿಮ.",
                        "description_en": "Unleash your pencil sketches capturing the essence of Karnataka's architectural wonders, poets, and historic monuments.",
                        "description_kn": "ಕರ್ನಾಟಕದ ವಾಸ್ತುಶಿಲ್ಪ, ಕವಿಗಳು ಹಾಗೂ ಐತಿಹಾಸಿಕ ಸ್ಮಾರಕಗಳ ವೈಭವವನ್ನು ಬಿಂಬಿಸುವ ಸೃಜನಶೀಲ ಸ್ಕೆಚಿಂಗ್ ಸ್ಪರ್ಧೆ."
                    }
                ]
                existing_eids = {row[0].upper() for row in conn.exec_driver_sql("SELECT id FROM events").fetchall() if row[0]}
                for p_ev in portal_competitions:
                    if p_ev["id"].upper() not in existing_eids:
                        cols = ", ".join(p_ev.keys())
                        placeholders = ", ".join([f":{k}" for k in p_ev.keys()])
                        conn.exec_driver_sql(f"INSERT INTO events ({cols}) VALUES ({placeholders})", p_ev)
                        existing_eids.add(p_ev["id"].upper())
                    else:
                        conn.exec_driver_sql(
                            "UPDATE events SET is_active = :val, title_en = :title, title_kn = :title_kn WHERE UPPER(id) = :eid",
                            {"val": p_ev.get("is_active", False), "title": p_ev["title_en"], "title_kn": p_ev["title_kn"], "eid": p_ev["id"].upper()}
                        )

                # Migrate registrations from backend duplicate IDs to portal canonical IDs
                migration_pairs = [
                    ("AKV-NT-MEHENDI", "AKV-NT-10"),
                    ("AKV-NT-PAINT", "AKV-NT-11"),
                    ("AKV-NT-RANGOLI", "AKV-NT-12"),
                    ("AKV-NT-SKETCH", "AKV-NT-17"),
                ]
                for (backend_id, portal_id) in migration_pairs:
                    conn.exec_driver_sql(
                        "UPDATE registrations SET event_id = :portal_id WHERE UPPER(event_id) = :backend_id",
                        {"portal_id": portal_id, "backend_id": backend_id}
                    )
                    count_row = conn.exec_driver_sql(
                        "SELECT COUNT(*) FROM registrations WHERE UPPER(event_id) = :portal_id",
                        {"portal_id": portal_id}
                    ).fetchone()
                    reg_cnt = count_row[0] if count_row else 0
                    conn.exec_driver_sql(
                        "UPDATE events SET registered_count = :cnt WHERE UPPER(id) = :portal_id",
                        {"cnt": reg_cnt, "portal_id": portal_id}
                    )
                    conn.exec_driver_sql(
                        "DELETE FROM events WHERE UPPER(id) = :backend_id",
                        {"backend_id": backend_id}
                    )

                # Ensure remaining open competitions (Reel Contest, Pottery, Mehendi, Rangoli) are Active
                conn.exec_driver_sql(
                    "UPDATE events SET is_active = :val WHERE UPPER(id) IN ('AKV-NT-REEL', 'AKV-NT-09', 'AKV-NT-10', 'AKV-NT-12')",
                    {"val": True}
                )

                # Explicitly close Painting and Sketching competitions
                conn.exec_driver_sql(
                    "UPDATE events SET is_active = :val WHERE UPPER(id) IN ('AKV-NT-11', 'AKV-NT-17', 'AKV-NT-PAINT', 'AKV-NT-SKETCH')",
                    {"val": False}
                )

                # Close all non-target events (Break Dance, Flag hoist, Open air, etc.)
                conn.exec_driver_sql(
                    "UPDATE events SET is_active = :val WHERE UPPER(id) NOT IN ('AKV-NT-REEL', 'AKV-NT-09', 'AKV-NT-10', 'AKV-NT-12')",
                    {"val": False}
                )

                # Ensure non-null integrity for numeric fields
                conn.exec_driver_sql("UPDATE events SET min_team_size = 1 WHERE min_team_size IS NULL")
                conn.exec_driver_sql("UPDATE events SET max_team_size = 1 WHERE max_team_size IS NULL")
                conn.exec_driver_sql("UPDATE events SET registered_count = 0 WHERE registered_count IS NULL")

                conn.commit()
        except Exception as dedup_err:
            logger.debug(f"[EVENT DEDUPLICATION MIGRATION NOTICE] {dedup_err}")

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
    global _MIGRATIONS_DONE
    if not _MIGRATIONS_DONE:
        try:
            ensure_schema_migrations()
        except Exception as e:
            logger.debug(f"[GET_DB MIGRATION NOTICE] {e}")
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"[DATABASE ERROR] Transaction rolled back due to error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

