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
    superadmin
)

# Ensure schema integrity and automatic migrations for SQLite and PostgreSQL
def ensure_schema_migrations():
    try:
        if engine.dialect.name == "sqlite":
            with engine.connect() as conn:
                cols = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(registrations)").fetchall()]
                if cols and "user_id" not in cols:
                    print("[MIGRATION] Adding 'user_id' column to 'registrations' table in SQLite...")
                    conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN user_id INTEGER REFERENCES users(id)")
        elif engine.dialect.name == "postgresql":
            with engine.connect() as conn:
                res = conn.exec_driver_sql(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'user_id'"
                ).fetchone()
                if not res:
                    print("[MIGRATION] Adding 'user_id' column to 'registrations' table in PostgreSQL...")
                    conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN user_id INTEGER REFERENCES users(id)")
                    conn.commit()
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
