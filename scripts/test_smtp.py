import os
import sys
import smtplib
from email.mime.text import MIMEText

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))
from backend.app.config import settings
from backend.app.services.email_service import get_smtp_relays

def test_smtp_connection(test_recipient: str = None):
    print("=" * 65)
    print("AKV MULTI-RELAY SMTP POOL CONNECTIVITY TEST")
    print("=" * 65)
    print(f"EMAIL_FROM:     '{settings.EMAIL_FROM}'")
    print(f"EMAIL_FROM_NAME:'{settings.EMAIL_FROM_NAME}'")
    
    relays = get_smtp_relays()
    print(f"Active Relays in Pool: {len(relays)}")
    print("-" * 65)

    if not relays:
        print("[STATUS] No SMTP relays configured in .env!")
        print("\nTo activate a Multi-Relay Brevo pool (600 free emails/day):")
        print("1. Sign up for 2 free Brevo accounts (e.g. brevo1@gmail.com and brevo2@gmail.com)")
        print("2. In .env, set:")
        print("   SMTP_HOST=\"smtp-relay.brevo.com\"")
        print("   SMTP_PORT=587")
        print("   SMTP_USERNAME=\"your-brevo-1-login\"")
        print("   SMTP_PASSWORD=\"xsmtpsib-key-1\"")
        print("\n   SMTP_HOST_2=\"smtp-relay.brevo.com\"")
        print("   SMTP_PORT_2=587")
        print("   SMTP_USERNAME_2=\"your-brevo-2-login\"")
        print("   SMTP_PASSWORD_2=\"xsmtpsib-key-2\"")
        return False

    recipient = test_recipient or settings.EMAIL_FROM
    all_ok = True

    for i, relay in enumerate(relays, 1):
        print(f"\n[{i}/{len(relays)}] Testing {relay['name']}: {relay['host']}:{relay['port']} (User: {relay['username']})...")
        try:
            if relay["port"] == 465:
                server = smtplib.SMTP_SSL(relay["host"], relay["port"], timeout=15)
            else:
                server = smtplib.SMTP(relay["host"], relay["port"], timeout=15)
                server.starttls()

            print("  [OK] Server connected and TLS established.")

            if relay["username"] and relay["password"]:
                server.login(relay["username"], relay["password"])
                print("  [OK] Authentication succeeded.")

            msg = MIMEText(
                f"This is an automated test email from Acharya Kannada Vedike (AKV) sent via {relay['name']}.",
                "plain",
                "utf-8"
            )
            msg["Subject"] = f"AKV Mail Pool Test ({relay['name']})"
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
            msg["To"] = recipient
            msg["Reply-To"] = settings.EMAIL_FROM

            print(f"  Sending live test message to {recipient}...")
            server.sendmail(settings.EMAIL_FROM, [recipient], msg.as_string())
            server.quit()
            print(f"  [SUCCESS] {relay['name']} is 100% operational!")

        except Exception as e:
            all_ok = False
            print(f"  [FAILED] {relay['name']} Error: {type(e).__name__}: {e}")

    print("\n" + "=" * 65)
    capacity = len(relays) * 300
    if all_ok:
        print(f"ALL {len(relays)} RELAYS OPERATIONAL! Estimated Pool Capacity: ~{capacity} emails/day.")
    else:
        print(f"TEST COMPLETED WITH ERRORS. Please check invalid credentials.")
    print("=" * 65)
    return all_ok

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    test_smtp_connection(target)
