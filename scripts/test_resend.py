import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))
from backend.app.config import settings
from backend.app.services.email_service import send_via_resend

def test_resend_connection(test_recipient: str = None):
    print("=" * 68)
    print("AKV RESEND AUTOMATED EMAIL DISPATCH TEST")
    print("=" * 68)
    print(f"EMAIL_FROM:      '{settings.EMAIL_FROM}'")
    print(f"EMAIL_FROM_NAME: '{settings.EMAIL_FROM_NAME}'")
    print(f"RESEND_FROM:     '{settings.RESEND_FROM or '(Defaults to EMAIL_FROM)'}'")
    print(f"RESEND_API_KEY:  '{'re_********' if settings.RESEND_API_KEY else '(NOT SET)'}'")
    print("-" * 68)

    if not settings.RESEND_API_KEY or not settings.RESEND_API_KEY.strip():
        print("\n[NOTICE] RESEND_API_KEY is not set in .env!")
        print("To send automated emails using Resend (free 3,000 emails/month):")
        print("1. Go to https://resend.com and sign up with your email (takes 30 seconds).")
        print("2. Navigate to 'API Keys' -> Click 'Create API Key'.")
        print("3. Copy the key (starts with 're_').")
        print("4. Add it to your .env file:")
        print('   RESEND_API_KEY="re_your_api_key_here"')
        print("5. (Optional) If you haven't verified a custom domain on Resend yet,")
        print("   Resend allows sending from onboarding@resend.dev to your signup email:")
        print('   RESEND_FROM="onboarding@resend.dev"')
        print("6. Run: python scripts/test_resend.py your-email@gmail.com")
        print("=" * 68)
        return False

    recipient = test_recipient or settings.EMAIL_FROM
    sender = (settings.RESEND_FROM or settings.EMAIL_FROM).strip()
    from_formatted = f"{settings.EMAIL_FROM_NAME} <{sender}>"

    print(f"Attempting HTTPS dispatch via Resend to {recipient} from {from_formatted}...")
    try:
        res = send_via_resend(
            api_key=settings.RESEND_API_KEY.strip(),
            from_addr=from_formatted,
            to_addrs=[recipient],
            subject="AKV Nuditaranga 2026 – Resend Live Verification",
            html_content="""
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fed7aa; border-radius: 10px;">
                    <h2 style="color: #b91c1c;">ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ (AKV) • ನುಡಿತರಂಗ ೨೦೨೬</h2>
                    <p>This is a live verification email sent via Resend API.</p>
                    <p>Official Sender: <strong>akv@acharya.ac.in</strong></p>
                    <p style="color: #15803d; font-weight: bold;">✔ Resend Email Delivery is 100% OPERATIONAL!</p>
                </div>
            """,
            text_content=f"AKV Nuditaranga 2026 - Resend Live Verification email from {settings.EMAIL_FROM}.",
            reply_to=settings.EMAIL_FROM
        )
        print(f"\n[SUCCESS] Resend dispatched email successfully! Resend ID: {res.get('id', 'ok')}")
        print(f"Delivered to: {recipient}")
        print("=" * 68)
        return True

    except Exception as e:
        print(f"\n[FAILED] Resend Error: {type(e).__name__}: {e}")
        print("=" * 68)
        return False

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    test_resend_connection(target)
