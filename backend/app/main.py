import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .seed import seed_database
from .auth_deps import init_superadmin
from .routes import (
    events, 
    registrations, 
    checkin, 
    admin, 
    activities, 
    gallery,
    auth,
    student,
    superadmin,
    reels
)

# Ensure schema integrity and automatic migrations for SQLite and PostgreSQL
def ensure_schema_migrations():
    try:
        if engine.dialect.name == "sqlite":
            with engine.connect() as conn:
                # 1. registrations table
                reg_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(registrations)").fetchall()]
                if reg_cols and "user_id" not in reg_cols:
                    print("[MIGRATION] Adding 'user_id' column to 'registrations' table in SQLite...")
                    conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN user_id INTEGER REFERENCES users(id)")

                # 2. users table
                user_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()]
                if user_cols:
                    if "photo_url" not in user_cols:
                        print("[MIGRATION] Adding 'photo_url' column to 'users' table...")
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN photo_url TEXT")
                    if "volunteer_domain" not in user_cols:
                        print("[MIGRATION] Adding 'volunteer_domain' column to 'users' table...")
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN volunteer_domain VARCHAR")
                    if "admin_type" not in user_cols:
                        print("[MIGRATION] Adding 'admin_type' column to 'users' table...")
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN admin_type VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                    if "faculty_id" not in user_cols:
                        print("[MIGRATION] Adding 'faculty_id' column to 'users' table...")
                        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN faculty_id VARCHAR")

                # 3. admins table
                admin_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(admins)").fetchall()]
                if admin_cols:
                    if "admin_type" not in admin_cols:
                        print("[MIGRATION] Adding 'admin_type' column to 'admins' table...")
                        conn.exec_driver_sql("ALTER TABLE admins ADD COLUMN admin_type VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                    if "faculty_id" not in admin_cols:
                        print("[MIGRATION] Adding 'faculty_id' column to 'admins' table...")
                        conn.exec_driver_sql("ALTER TABLE admins ADD COLUMN faculty_id VARCHAR")

                # 4. gallery_items table
                gallery_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(gallery_items)").fetchall()]
                if gallery_cols and "event_date" not in gallery_cols:
                    print("[MIGRATION] Adding 'event_date' column to 'gallery_items' table...")
                    conn.exec_driver_sql("ALTER TABLE gallery_items ADD COLUMN event_date VARCHAR")

                # 5. activities table
                act_cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(activities)").fetchall()]
                if act_cols and "activity_date" not in act_cols:
                    print("[MIGRATION] Adding 'activity_date' column to 'activities' table...")
                    conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN activity_date VARCHAR")

        elif engine.dialect.name == "postgresql":
            with engine.connect() as conn:
                def add_pg_col(table, col, col_type):
                    res = conn.exec_driver_sql(
                        f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{col}'"
                    ).fetchone()
                    if not res:
                        print(f"[MIGRATION] Adding '{col}' column to '{table}' in PostgreSQL...")
                        conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
                        conn.commit()

                add_pg_col("registrations", "user_id", "INTEGER REFERENCES users(id)")
                add_pg_col("users", "photo_url", "TEXT")
                add_pg_col("users", "volunteer_domain", "VARCHAR")
                add_pg_col("users", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("users", "faculty_id", "VARCHAR")
                add_pg_col("admins", "admin_type", "VARCHAR DEFAULT 'WORKING_COMMITTEE'")
                add_pg_col("admins", "faculty_id", "VARCHAR")
                add_pg_col("gallery_items", "event_date", "VARCHAR")
                add_pg_col("activities", "activity_date", "VARCHAR")

    except Exception as e:
        print(f"[MIGRATION NOTICE] {e}")

# Create tables
Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Acharya Kannada Vedike (AKV) and Nuditaranga 2026 Cultural Festival"
)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL:
    clean_frontend = settings.FRONTEND_URL.rstrip("/")
    if clean_frontend and clean_frontend not in allowed_origins:
        allowed_origins.append(clean_frontend)

if settings.ALLOWED_ORIGINS:
    for origin in settings.ALLOWED_ORIGINS.split(","):
        o = origin.strip().rstrip("/")
        if o and o not in allowed_origins:
            allowed_origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup routine
@app.on_event("startup")
def on_startup():
    ensure_schema_migrations()
    seed_database()
    init_superadmin()

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(student.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
app.include_router(superadmin.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
app.include_router(registrations.router, prefix=settings.API_PREFIX)
app.include_router(checkin.router, prefix=settings.API_PREFIX)
app.include_router(activities.router, prefix=settings.API_PREFIX)
app.include_router(gallery.router, prefix=settings.API_PREFIX)
app.include_router(reels.router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "fest": settings.FEST_NAME,
        "version": settings.APP_VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
