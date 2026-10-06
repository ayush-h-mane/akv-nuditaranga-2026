import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from .config import settings
from .database import engine, Base, ensure_schema_migrations
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
    reels,
    attendance,
    working_committee_attendance,
    festival_schedule,
    contact,
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Acharya Kannada Vedike (AKV) and Nuditaranga 2026 Cultural Festival"
)

# Global JSON Exception Handlers: Guarantee API always responds in valid JSON format
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail if isinstance(exc.detail, str) else str(exc.detail)}
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    print(f"[UNHANDLED EXCEPTION] {request.method} {request.url.path}: {exc!r}", flush=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# GZip compression middleware for fast response delivery
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://akv.acharyahabba.com",
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
    allow_origin_regex=r"^https:\/\/(.*\.vercel\.app|(.*\.)?acharyahabba\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
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
app.include_router(attendance.router, prefix=settings.API_PREFIX)
app.include_router(working_committee_attendance.router, prefix=settings.API_PREFIX)
app.include_router(festival_schedule.router, prefix=settings.API_PREFIX)
app.include_router(contact.router, prefix=settings.API_PREFIX)

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
