import os
import re
import json
import urllib.request
import urllib.error
from typing import Tuple, Dict, Any, List
from ..config import settings

# In-memory log for local testing / unconfigured SMS fallback
DEBUG_SMS_OUTBOX: List[Dict[str, Any]] = []
_LAST_SMS_ERROR: str = ""

def get_last_sms_error() -> str:
    return _LAST_SMS_ERROR

def clean_indian_phone(phone: str) -> str:
    """Extracts a clean 10-digit Indian mobile number."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]
    if len(digits) >= 10:
        return digits[-10:]
    return digits

def mask_phone_number(phone: str) -> str:
    """Masks a phone number for privacy display (e.g., ******3210)."""
    clean = clean_indian_phone(phone)
    if len(clean) == 10:
        return f"******{clean[-4:]}"
    if len(clean) > 4:
        return f"***{clean[-4:]}"
    return clean or "your mobile"

def send_sms_otp(phone_number: str, otp_code: str) -> Tuple[bool, str]:
    """
    Dispatches a 6-digit OTP to the registered Indian mobile number via Fast2SMS.
    Endpoint: https://www.fast2sms.com/dev/bulkV2
    Requires FAST2SMS_API_KEY in environment variables.
    """
    global _LAST_SMS_ERROR

    clean_phone = clean_indian_phone(phone_number)
    if len(clean_phone) != 10:
        err = f"Invalid mobile number format: '{phone_number}'. A 10-digit Indian mobile number is required."
        _LAST_SMS_ERROR = err
        print(f"[SMS WARNING] {err}")
        return False, err

    # Record in debug outbox
    record = {
        "phone": clean_phone,
        "otp": otp_code,
        "api_key_configured": bool(settings.FAST2SMS_API_KEY)
    }
    DEBUG_SMS_OUTBOX.append(record)

    # If FAST2SMS_API_KEY is not configured
    if not settings.FAST2SMS_API_KEY or not settings.FAST2SMS_API_KEY.strip():
        err = "FAST2SMS_API_KEY is not set in Environment Variables. Add FAST2SMS_API_KEY in Vercel Settings > Environment Variables."
        _LAST_SMS_ERROR = err
        print("=" * 65)
        print(f"[FAST2SMS SIMULATION - UNCONFIGURED KEY]")
        print(f"To Mobile: +91 {clean_phone}")
        print(f"OTP Code:  {otp_code}")
        print(f"Notice:    {err}")
        print("=" * 65)
        return False, err

    api_key = settings.FAST2SMS_API_KEY.strip().strip("\"'")
    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": api_key,
        "Content-Type": "application/json",
        "User-Agent": "AKV-Nuditaranga-2026/2.3.5"
    }

    # Attempt 1: Fast2SMS Dedicated 'otp' Route
    otp_payload = {
        "route": "otp",
        "variables_values": str(otp_code),
        "numbers": clean_phone
    }

    try:
        req_data = json.dumps(otp_payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            resp_body = resp.read().decode("utf-8")
            data = json.loads(resp_body)
            if data.get("return") is True:
                print(f"[FAST2SMS DISPATCH SUCCESS] OTP sent to +91 {clean_phone} (ReqID: {data.get('request_id')})")
                return True, "SMS OTP sent successfully"
            else:
                msg = "; ".join(data.get("message", [])) if isinstance(data.get("message"), list) else str(data.get("message", "Fast2SMS error"))
                print(f"[FAST2SMS NOTICE] OTP route returned: {msg}. Trying fallback Quick SMS route...")
    except urllib.error.HTTPError as http_err:
        err_msg = http_err.read().decode("utf-8") if http_err.fp else str(http_err)
        print(f"[FAST2SMS HTTP ERROR] {http_err.code}: {err_msg}")
    except Exception as e:
        print(f"[FAST2SMS ERROR] {type(e).__name__}: {e}")

    # Attempt 2: Fast2SMS Fallback 'q' (Quick SMS) Route
    quick_payload = {
        "route": "q",
        "message": f"Your AKV Nuditaranga 2026 Password Reset OTP is {otp_code}. Valid for 10 minutes. Do not share this code.",
        "language": "english",
        "flash": 0,
        "numbers": clean_phone
    }

    try:
        req_data = json.dumps(quick_payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            resp_body = resp.read().decode("utf-8")
            data = json.loads(resp_body)
            if data.get("return") is True:
                print(f"[FAST2SMS FALLBACK SUCCESS] Quick SMS OTP sent to +91 {clean_phone}")
                return True, "Quick SMS OTP sent successfully"
            else:
                msg = "; ".join(data.get("message", [])) if isinstance(data.get("message"), list) else str(data.get("message", "Fast2SMS error"))
                _LAST_SMS_ERROR = f"Fast2SMS delivery notice: {msg}"
                return False, _LAST_SMS_ERROR
    except Exception as exc:
        _LAST_SMS_ERROR = f"Fast2SMS error: {type(exc).__name__}: {str(exc)}"
        print(f"[FAST2SMS DISPATCH FAILED] {clean_phone}: {_LAST_SMS_ERROR}")
        return False, _LAST_SMS_ERROR
