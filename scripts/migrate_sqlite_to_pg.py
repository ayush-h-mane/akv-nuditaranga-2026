"""
Database Migration Script: SQLite -> PostgreSQL
================================================
Migrates existing data from local SQLite (akv_fest.db) to target PostgreSQL (e.g. Supabase, Neon).
Preserves all primary keys, foreign keys, timestamps, and relationships.
Automatically synchronizes PostgreSQL SERIAL sequences after data insertion.

Usage:
    python scripts/migrate_sqlite_to_pg.py --pg-url "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
    
    Or set DATABASE_URL environment variable:
    set DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
    python scripts/migrate_sqlite_to_pg.py
"""

import os
import sys
import argparse
import datetime
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import Base
import backend.app.models as models

# Ordered list of tables to ensure foreign keys are satisfied
MIGRATION_TABLE_ORDER = [
    ("events", models.Event),
    ("users", models.User),
    ("admins", models.Admin),
    ("volunteer_attendance", models.VolunteerAttendance),
    ("password_reset_tokens", models.PasswordResetToken),
    ("audit_logs", models.AuditLog),
    ("registrations", models.Registration),
    ("checkin_logs", models.CheckInLog),
    ("activities", models.Activity),
    ("gallery_items", models.GalleryItem),
]

def migrate(sqlite_path: str, pg_url: str):
    if not os.path.exists(sqlite_path):
        print(f"[ERROR] SQLite database file not found at: {sqlite_path}")
        sys.exit(1)

    # Normalize Postgres URL
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    if not pg_url.startswith("postgresql://"):
        print(f"[ERROR] Destination URL must be a PostgreSQL connection string (postgresql://...), got: {pg_url}")
        sys.exit(1)

    print(f"[*] Source SQLite: {sqlite_path}")
    print(f"[*] Destination PostgreSQL: {pg_url.split('@')[-1] if '@' in pg_url else 'configured'}")

    # SQLite Engine & Session
    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}")
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # PostgreSQL Engine & Session
    pg_engine = create_engine(pg_url, pool_pre_ping=True)
    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    try:
        # Step 1: Ensure all destination tables exist in PostgreSQL
        print("[*] Creating destination tables if not present in PostgreSQL...")
        Base.metadata.create_all(bind=pg_engine)
        print("[✓] Destination tables verified.")

        # Step 2: Migrate table by table
        total_migrated = 0
        for table_name, model_class in MIGRATION_TABLE_ORDER:
            src_records = sqlite_session.query(model_class).all()
            if not src_records:
                print(f"[-] {table_name}: 0 records in SQLite, skipped.")
                continue

            migrated_count = 0
            for record in src_records:
                # Extract dictionary of column values
                record_data = {col.name: getattr(record, col.name) for col in model_class.__table__.columns}
                
                # Check if record already exists in destination
                pk_col = model_class.__table__.primary_key.columns.values()[0].name
                pk_val = record_data[pk_col]
                
                existing = pg_session.query(model_class).filter(getattr(model_class, pk_col) == pk_val).first()
                if existing:
                    # Update fields or skip
                    continue

                # Insert into PostgreSQL
                new_record = model_class(**record_data)
                pg_session.add(new_record)
                migrated_count += 1

            pg_session.commit()
            total_migrated += migrated_count
            print(f"[✓] {table_name}: Migrated {migrated_count}/{len(src_records)} records.")

            # Step 3: Advance PostgreSQL SERIAL sequences for integer primary key tables
            pk_col_obj = model_class.__table__.primary_key.columns.values()[0]
            if pk_col_obj.type.python_type is int:
                try:
                    seq_query = text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table_name}', '{pk_col_obj.name}'),
                            COALESCE(MAX({pk_col_obj.name}), 1),
                            MAX({pk_col_obj.name}) IS NOT NULL
                        ) FROM {table_name};
                    """)
                    pg_session.execute(seq_query)
                    pg_session.commit()
                except Exception as seq_err:
                    # Non-fatal if sequence doesn't match standard naming
                    pg_session.rollback()

        print(f"\n==========================================")
        print(f"[SUCCESS] Migration complete! Total records inserted: {total_migrated}")
        print(f"==========================================")

    except Exception as e:
        pg_session.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        sqlite_session.close()
        pg_session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate SQLite data to PostgreSQL for AKV Nuditaranga 2026")
    parser.add_argument("--sqlite-path", default="akv_fest.db", help="Path to local SQLite database file")
    parser.add_argument("--pg-url", default=os.getenv("DATABASE_URL"), help="PostgreSQL connection string")
    args = parser.parse_args()

    if not args.pg_url:
        print("[ERROR] Please provide --pg-url or set the DATABASE_URL environment variable.")
        sys.exit(1)

    migrate(args.sqlite_path, args.pg_url)
