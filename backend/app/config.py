import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Acharya Kannada Vedike (AKV) API"
    APP_VERSION: str = "2.3.4"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production" if os.environ.get("VERCEL") else "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "" if os.environ.get("VERCEL") else "sqlite:///./akv_fest.db")
    
    # JWT & Security
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET", "akv-kannada-vedike-nuditaranga-secret-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")
    
    # Super Admin credentials (configured securely via environment variables / .env)
    SUPERADMIN_USERNAME: str = os.getenv("SUPERADMIN_USERNAME", "")
    SUPERADMIN_PASSWORD: str = os.getenv("SUPERADMIN_PASSWORD", "")
    SUPERADMIN_EMAIL: str = os.getenv("SUPERADMIN_EMAIL", "")
    SUPERADMIN_NAME: str = os.getenv("SUPERADMIN_NAME", "AKV Super Administrator")

    # Resend API (Recommended - Instant HTTPS email dispatch, no 2FA/App Password required)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM: str = os.getenv("RESEND_FROM", "")

    # Fast2SMS Gateway (Mobile OTP for registered Indian phone numbers)
    FAST2SMS_API_KEY: str = (
        os.getenv("FAST2SMS_API_KEY")
        or os.getenv("FAST2SMS_KEY")
        or os.getenv("SMS_API_KEY")
        or ""
    ).strip().strip("\"'")

    # SMTP Mail (Primary Relay - Brevo Relay with official sender akv@acharya.ac.in)
    SMTP_HOST: str = (os.getenv("SMTP_HOST") or os.getenv("BREVO_HOST") or "smtp-relay.brevo.com").strip().strip("\"'")
    SMTP_PORT: int = int((os.getenv("SMTP_PORT") or "587").strip().strip("\"'") or 587)
    SMTP_USERNAME: str = (os.getenv("SMTP_USERNAME") or os.getenv("BREVO_USERNAME") or os.getenv("BREVO_USER") or "bb08a0001@smtp-brevo.com").strip().strip("\"'")
    SMTP_PASSWORD: str = (
        os.getenv("SMTP_PASSWORD")
        or os.getenv("BREVO_SMTP_KEY")
        or os.getenv("BREVO_KEY")
        or os.getenv("MAIL_PASSWORD")
        or ""
    ).strip().strip("\"'")

    # Multi-Relay Pool (Optional Relays 2 & 3 for failover)
    SMTP_HOST_2: str = (os.getenv("SMTP_HOST_2") or "").strip().strip("\"'")
    SMTP_PORT_2: int = int((os.getenv("SMTP_PORT_2") or "587").strip().strip("\"'") or 587)
    SMTP_USERNAME_2: str = (os.getenv("SMTP_USERNAME_2") or "").strip().strip("\"'")
    SMTP_PASSWORD_2: str = (os.getenv("SMTP_PASSWORD_2") or "").strip().strip("\"'")

    SMTP_HOST_3: str = (os.getenv("SMTP_HOST_3") or "").strip().strip("\"'")
    SMTP_PORT_3: int = int((os.getenv("SMTP_PORT_3") or "587").strip().strip("\"'") or 587)
    SMTP_USERNAME_3: str = (os.getenv("SMTP_USERNAME_3") or "").strip().strip("\"'")
    SMTP_PASSWORD_3: str = (os.getenv("SMTP_PASSWORD_3") or "").strip().strip("\"'")

    EMAIL_FROM: str = (os.getenv("EMAIL_FROM") or "akv@acharya.ac.in").strip().strip("\"'")
    EMAIL_FROM_NAME: str = (os.getenv("EMAIL_FROM_NAME") or "Acharya Kannada Vedike - Nuditaranga 2026").strip().strip("\"'")
    
    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://akv.acharyahabba.com" if os.environ.get("VERCEL") else "http://localhost:5173")

    FEST_NAME: str = "Nuditaranga 2026"
    FEST_DATE: str = "2026-11-01T09:00:00"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()