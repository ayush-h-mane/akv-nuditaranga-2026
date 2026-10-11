#!/usr/bin/env python3
"""
==============================================================================
ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026
CLI SCRIPT: GOOGLE SPREADSHEET ATTENDANCE & VOLUNTEER SYNC
==============================================================================
Usage:
    python scripts/sync_google_sheets.py --dry-run
    python scripts/sync_google_sheets.py --webhook https://script.google.com/macros/s/.../exec
    python scripts/sync_google_sheets.py --dump-payload sync_payload.json
==============================================================================
"""

import sys
import os
import json
import argparse

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import SessionLocal
from backend.app.services.google_sheets_service import (
    get_google_sheets_config,
    save_google_sheets_config,
    build_google_sheets_payload,
    sync_to_google_sheets,
    DEFAULT_SPREADSHEET_ID,
    DEFAULT_SPREADSHEET_URL
)

def main():
    parser = argparse.ArgumentParser(description="Synchronize AKV Nuditaranga volunteers & attendance to Google Spreadsheet.")
    parser.add_argument("--webhook", type=str, default="", help="Google Apps Script Web App URL")
    parser.add_argument("--base-url", type=str, default="", help="Public base URL for volunteer photos (default: https://akv.acharyahabba.com)")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and display payload without sending HTTP request")
    parser.add_argument("--dump-payload", type=str, default="", help="File path to save the generated JSON payload")
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("🎭 AKV NUDITARANGA 2026 — GOOGLE SPREADSHEET SYNC ENGINE")
    print("=" * 70)
    print(f"Spreadsheet ID  : {DEFAULT_SPREADSHEET_ID}")
    print(f"Spreadsheet URL : {DEFAULT_SPREADSHEET_URL}")

    db = SessionLocal()
    try:
        cfg = get_google_sheets_config()
        webhook_url = args.webhook or cfg.get("webhook_url") or os.getenv("GOOGLE_SHEETS_WEBHOOK_URL", "")

        print("\n[1/3] Building roster and attendance payload from database...")
        payload = build_google_sheets_payload(db, base_url=args.base_url or None)

        vol_count = len(payload["volunteers"])
        wc_count = len(payload["working_committee"])
        dates = payload["dates"]
        att_keys = len(payload["attendance_records"])

        print(f"  • Total Volunteers Found       : {vol_count}")
        print(f"  • Working Committee Members    : {wc_count}")
        print(f"  • Configured Festival Dates    : {', '.join(dates)}")
        print(f"  • Attendance Record Mappings   : {att_keys}")

        if args.dump_payload:
            dump_file = os.path.abspath(args.dump_payload)
            with open(dump_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            print(f"\n✅ Payload dumped successfully to: {dump_file}")

        if args.dry_run:
            print("\n🔍 DRY-RUN MODE: Sync request bypassed.")
            if vol_count > 0:
                sample_v = payload["volunteers"][0]
                print(f"Sample Volunteer: {sample_v['name']} ({sample_v['auid']}) - Domain: {sample_v['volunteer_domain']}")
                print(f"Photo Link      : {sample_v['photo_direct_url']}")
            print("\nDry-run completed successfully.")
            return

        if not webhook_url:
            print("\n❌ ERROR: Google Apps Script Webhook URL is not configured.")
            print("Please deploy the Google Apps Script in scripts/google_apps_script/Code.gs as a Web App (Access: Anyone)")
            print("and pass --webhook <url> or configure it in the SuperAdmin Portal.")
            sys.exit(1)

        print(f"\n[2/3] Dispatching payload to Google Apps Script Webhook...")
        print(f"  Webhook: {webhook_url[:60]}...")

        # Update persisted webhook URL if provided via flag
        if args.webhook:
            save_google_sheets_config({"webhook_url": args.webhook})

        result = sync_to_google_sheets(db, webhook_url=webhook_url, base_url=args.base_url or None)

        print("\n[3/3] Sync Execution Results:")
        if result.get("success"):
            print("  ✅ Status : SUCCESS")
            print(f"  ℹ️ Message: {result.get('message')}")
            stats = result.get("stats", {})
            print(f"  📊 Stats  : {stats}")
            print("\n🎉 Google Spreadsheet has been synchronized!")
        else:
            print("  ❌ Status : FAILED")
            print(f"  ⚠️ Error  : {result.get('error')}")
            sys.exit(1)

    finally:
        db.close()

if __name__ == "__main__":
    main()
