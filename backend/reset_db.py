import os
import shutil
import sqlite3
import datetime
import sys

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.database import engine, Base, SessionLocal
from backend.app.config import settings
from backend.app.seed import seed_database
from backend.app.auth_deps import init_superadmin
from backend.app.models import (
    User, Admin, VolunteerAttendance, PasswordResetToken,
    AuditLog, Event, Registration, CheckInLog, Activity, GalleryItem
)

def erase_and_reset_database():
    print("==================================================")
    print("ACHARYA KANNADA VEDIKE - DATABASE RESET UTILITY")
    print("==================================================")

    # 1. Resolve DB File Path
    db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite:////", "")
    if db_path.startswith("./"):
        db_path = os.path.join(BASE_DIR, db_path[2:])
    elif not os.path.isabs(db_path):
        db_path = os.path.join(BASE_DIR, db_path)

    print(f"Target Database File: {db_path}")

    # 2. Automated Safety Backup
    if os.path.exists(db_path) and os.path.getsize(db_path) > 0:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{db_path}.backup.{timestamp}"
        latest_backup = f"{db_path}.backup"

        try:
            shutil.copy2(db_path, backup_file)
            shutil.copy2(db_path, latest_backup)
            print(f"[BACKUP CREATED] Saved backup to: {backup_file}")
            print(f"[BACKUP UPDATED] Synced latest backup to: {latest_backup}")
        except Exception as e:
            print(f"[WARNING] Could not create backup: {e}")

    # 3. Drop all existing tables cleanly
    print("Erasing all existing tables and records...")
    try:
        # Dispose any open connections from engine pool
        engine.dispose()
        Base.metadata.drop_all(bind=engine)
        print("[SUCCESS] All tables dropped cleanly.")
    except Exception as e:
        print(f"[ERROR] Failed dropping tables via metadata: {e}")
        # Fallback to direct SQLite table dropping
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("PRAGMA foreign_keys = OFF;")
            tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").fetchall()]
            for tbl in tables:
                cur.execute(f"DROP TABLE IF EXISTS {tbl};")
            conn.commit()
            conn.close()
            print(f"[FALLBACK] Manually dropped tables: {tables}")

    # 4. Recreate Schema
    print("Recreating database schema...")
    Base.metadata.create_all(bind=engine)
    print("[SUCCESS] All schema tables recreated successfully.")

    # 5. Reseed initial events and activities
    print("Reseeding initial festival events and activities...")
    seed_database()

    # 6. Initialize default SuperAdmin account
    print("Provisioning Super Administrator credentials...")
    init_superadmin()

    # 7. Execute SQLite VACUUM to reclaim disk space
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.execute("VACUUM;")
            conn.close()
            compacted_size = os.path.getsize(db_path)
            print(f"[SUCCESS] Database vacuumed. Clean file size: {compacted_size / 1024:.2f} KB")
        except Exception as e:
            print(f"[NOTE] Vacuum note: {e}")

    # 8. Verification summary
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        event_count = db.query(Event).count()
        reg_count = db.query(Registration).count()
        act_count = db.query(Activity).count()
        admin_count = db.query(Admin).count()

        print("\n--- DATABASE VERIFICATION SUMMARY ---")
        print(f"Total Users: {user_count} (SuperAdmin configured)")
        print(f"Total Events: {event_count}")
        print(f"Total Activities: {act_count}")
        print(f"Total Registrations: {reg_count}")
        print(f"Total Pending/Approved Admins: {admin_count}")
        print("-------------------------------------")
        print("DATABASE ERASE & RESET COMPLETE! System is ready.")
    finally:
        db.close()

if __name__ == "__main__":
    erase_and_reset_database()
