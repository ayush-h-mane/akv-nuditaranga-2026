import os
import sys
import smtplib
from email.mime.text import MIMEText

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))
from backend.app.config import settings

def test_smtp_connection(test_recipient: str = None):
    print("=" * 60)
    print("AKV SMTP CONFIGURATION & CONNECTIVITY TEST")
    print("=" * 60)
    print(f"SMTP_HOST:     '{settings.SMTP_HOST}'")
    print(f"SMTP_PORT:     {settings.SMTP_PORT}")
    print(f"SMTP_USERNAME: '{settings.SMTP_USERNAME}'")
    print(f"SMTP_PASSWORD: '{'********' if settings.SMTP_PASSWORD else ''}'")
    print(f"EMAIL_FROM:    '{settings.EMAIL_FROM}'")
    print("-" * 60)

    if not settings.SMTP_HOST or not settings.SMTP_HOST.strip():
        print("[STATUS] SMTP_HOST is not set in .env!")
        print("To send live emails to users, please configure the following in .env:")
        print("  SMTP_HOST=\"smtp.gmail.com\"      # or your mail server host")
        print("  SMTP_PORT=587                   # 587 (STARTTLS) or 465 (SSL)")
        print("  SMTP_USERNAME=\"akv@acharya.ac.in\"")
        print("  SMTP_PASSWORD=\"your-app-password\"")
        print("  EMAIL_FROM=\"akv@acharya.ac.in\"")
        return False

    recipient = test_recipient or settings.EMAIL_FROM
    print(f"Attempting live SMTP connection to {settings.SMTP_HOST}:{settings.SMTP_PORT}...")

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            server.starttls()

        print("[OK] SMTP Server connection and TLS handshake established.")

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            print(f"Authenticating as {settings.SMTP_USERNAME}...")
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            print("[OK] Authentication successful!")

        msg = MIMEText("This is a live test email from Acharya Kannada Vedike (AKV) automated mail system.", "plain", "utf-8")
        msg["Subject"] = "AKV Live Mail System Test"
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = recipient

        print(f"Sending test email to {recipient}...")
        server.sendmail(settings.EMAIL_FROM, [recipient], msg.as_string())
        server.quit()

        print(f"[SUCCESS] Email successfully delivered to {recipient}!")
        return True

    except Exception as e:
        print(f"[FAILED] SMTP Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    test_smtp_connection(target)
