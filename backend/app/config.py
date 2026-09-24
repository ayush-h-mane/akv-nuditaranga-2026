import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Acharya Kannada Vedike (AKV) API"
    APP_VERSION: str = "2.1.1"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production" if os.environ.get("VERCEL") else "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "" if os.environ.get("VERCEL") else "sqlite:///./akv_fest.db")
    
    # JWT & Security
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET", "akv-kannada-vedike-nuditaranga-secret-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")
    
    # Super Admin credentials
    SUPERADMIN_USERNAME: str = os.getenv("SUPERADMIN_USERNAME", "akv-nt-2026")
    SUPERADMIN_PASSWORD: str = os.getenv("SUPERADMIN_PASSWORD", "akv.nt@2026")
    SUPERADMIN_EMAIL: str = os.getenv("SUPERADMIN_EMAIL", "akv@acharya.ac.in")
    SUPERADMIN_NAME: str = os.getenv("SUPERADMIN_NAME", "AKV Super Administrator")

    # Legacy admin credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "akvadmin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "AcharyaAKV2026")

    # SMTP Mail
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "akv@acharya.ac.in")
    EMAIL_FROM_NAME: str = os.getenv("EMAIL_FROM_NAME", "Acharya Kannada Vedike - Nuditaranga 2026")
    
    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    FEST_NAME: str = "Nuditaranga 2026"
    FEST_DATE: str = "2026-11-01T09:00:00"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

