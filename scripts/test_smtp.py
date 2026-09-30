import os
import sys
import smtplib
from email.mime.text import MIMEText

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))
from backend.app.config import settings
from backend.app.services.email_service import get_smtp_relays

def test_smtp_connection(test_recipient: str = None):
    print("=" * 68)
    print("AKV AUTOMATED EMAIL & SMTP CONNECTIVITY TEST")
    print("=" * 68)
    print(f"EMAIL_FROM:      '{settings.EMAIL_FROM}'")
    print(f"EMAIL_FROM_NAME: '{settings.EMAIL_FROM_NAME}'")
    print(f"SMTP_HOST:       '{settings.SMTP_HOST}'")
    print(f"SMTP_PORT:       {settings.SMTP_PORT}")
    print(f"SMTP_USERNAME:   '{settings.SMTP_USERNAME}'")
    print(f"SMTP_PASSWORD:   '{'********' if settings.SMTP_PASSWORD else '(NOT SET)'}'")
    print("-" * 68)

    if not settings.SMTP_PASSWORD or not settings.SMTP_PASSWORD.strip():
        print("\n[NOTICE] SMTP_PASSWORD is not set in .env!")
        print("To send automated emails directly from akv@acharya.ac.in:")
        print("1. Log in to the Google Account for akv@acharya.ac.in (myaccount.google.com).")
        print("2. Ensure 2-Step Verification is turned ON.")
        print("3. Go to Security -> 2-Step Verification -> App Passwords.")
        print("4. Create an app password named 'AKV Nuditaranga'.")
        print("5. Copy the 16-character password (e.g. 'abcd efgh ijkl mnop').")
        print("6. Paste it in your .env file:")
        print('   SMTP_PASSWORD="your-16-character-password"')
        print("7. Re-run: python scripts/test_smtp.py")
        print("=" * 68)
        return False

    recipient = test_recipient or settings.EMAIL_FROM
    print(f"\nAttempting SMTP connection to {settings.SMTP_HOST}:{settings.SMTP_PORT}...")
    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()

        print("[OK] SMTP TLS connection established.")

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            print(f"Authenticating as {settings.SMTP_USERNAME}...")
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            print("[OK] Authentication successful!")

        msg = MIMEText(
            f"This is an automated test email from Acharya Kannada Vedike (AKV) Nuditaranga 2026 sent officially from {settings.EMAIL_FROM}.",
            "plain",
            "utf-8"
        )
        msg["Subject"] = "AKV Live Mail Test – Connection Verified"
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = recipient
        msg["Reply-To"] = settings.EMAIL_FROM

        print(f"Sending test email to {recipient}...")
        server.sendmail(settings.EMAIL_FROM, [recipient], msg.as_string())
        server.quit()
        print(f"\n[SUCCESS] Live automated email successfully delivered to {recipient}!")
        print("=" * 68)
        return True

    except Exception as e:
        print(f"\n[FAILED] SMTP Error: {type(e).__name__}: {e}")
        if "525" in str(e) or "Unauthorized IP" in str(e):
            print("\n-> Brevo IP Restriction Active (525 Unauthorized IP address):")
            print("   In your Brevo dashboard:")
            print("   1. Click top-right profile -> Settings -> Security.")
            print("   2. Go to 'Authorized IPs' -> find 'API keys and SMTP keys'.")
            print("   3. Click 'Deactivate' (so requests from dynamic IPs/Vercel are permitted).")
        elif "Authentication" in str(type(e).__name__) or "535" in str(e):
            print("\n-> Authentication Failed (535):")
            print("   Check your Brevo SMTP key or Google App Password in .env.")
        print("=" * 68)
        return False

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    test_smtp_connection(target)
