#!/usr/bin/env python3
"""
AKV Nuditaranga 2026 - Broadcast Profile Edit Window Reopened Notification
==========================================================================
Dispatches official email notifications to registered users announcing that
the Profile Details Edit Window has been reopened until October 10, 2026, 11:59 PM IST.

Usage:
    python scripts/broadcast_profile_edit_notice.py
    python scripts/broadcast_profile_edit_notice.py --dry-run
    python scripts/broadcast_profile_edit_notice.py --role VOLUNTEER
    python scripts/broadcast_profile_edit_notice.py --role STUDENT
    python scripts/broadcast_profile_edit_notice.py --reset-locks
"""

import os
import sys
import argparse
import time

# Ensure workspace root is in python path
sys.path.insert(0, os.path.abspath("."))

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models import User, AuditLog
from backend.app.services.email_service import send_profile_edit_reopened_email

DEFAULT_DEADLINE_STR = "October 10, 2026, 11:59 PM IST (10/10/2026 23:59 IST)"


def broadcast_notice(
    role_filter: str = "ALL",
    deadline_str: str = DEFAULT_DEADLINE_STR,
    dry_run: bool = False,
    reset_locks: bool = False
):
    print("=" * 72)
    print("AKV NUDITARANGA 2026 - BROADCAST PROFILE EDIT REOPENED NOTICE")
    print("=" * 72)
    print(f"Target Extended Deadline: {deadline_str}")
    print(f"Role Filter:              {role_filter}")
    print(f"Dry Run Mode:             {'ENABLED (No emails will be sent)' if dry_run else 'DISABLED (LIVE DISPATCH)'}")
    print(f"Reset Edit Locks:         {'YES (All locks will be cleared)' if reset_locks else 'NO'}")
    print("-" * 72)

    db = SessionLocal()
    try:
        # 1. Reset locks if requested
        if reset_locks:
            locked_count = db.query(User).filter(User.profile_edited_once == True).count()
            if not dry_run and locked_count > 0:
                db.query(User).filter(User.profile_edited_once == True).update({User.profile_edited_once: False})
                db.commit()
                print(f"[LOCK RESET] Successfully unlocked profile editing for {locked_count} user(s).")
            else:
                print(f"[LOCK RESET] Found {locked_count} user(s) with profile_edited_once=True.")

        # 2. Fetch target recipients
        query = db.query(User).filter(User.account_status == "ACTIVE")
        rf = role_filter.upper().strip()
        if rf in ("STUDENT", "PARTICIPANT"):
            query = query.filter(User.role == "PARTICIPANT")
        elif rf == "VOLUNTEER":
            query = query.filter(User.role == "VOLUNTEER")
        elif rf in ("ADMIN", "COORDINATOR"):
            query = query.filter(User.role == "ADMIN")

        all_users = query.all()
        valid_recipients = [u for u in all_users if u.email and "@" in u.email and not u.email.endswith(".placeholder")]

        print(f"\nFound {len(valid_recipients)} active registered user(s) matching criteria.")
        if not valid_recipients:
            print("No users found to notify. Exiting.")
            return

        print("-" * 72)
        success_count = 0
        failed_count = 0

        for idx, user in enumerate(valid_recipients, 1):
            tag = f"[{idx}/{len(valid_recipients)}]"
            user_desc = f"{user.name} ({user.email}) [{user.role}]"

            if dry_run:
                print(f"{tag} [DRY-RUN PREVIEW] Would send email to: {user_desc}")
                success_count += 1
                continue

            print(f"{tag} Sending notification to {user_desc}...", end=" ", flush=True)
            try:
                ok = send_profile_edit_reopened_email(
                    to_email=user.email,
                    user_name=user.name,
                    deadline_str=deadline_str,
                    role=user.role
                )
                if ok:
                    print("[OK - DELIVERED]")
                    success_count += 1
                else:
                    print("[FAILED - RELAY ISSUE]")
                    failed_count += 1
            except Exception as ex:
                print(f"[FAILED - ERROR: {ex}]")
                failed_count += 1

            # Mild pacing between dispatches to avoid throttling
            if idx < len(valid_recipients):
                time.sleep(0.3)

        print("=" * 72)
        print("BROADCAST SUMMARY:")
        print(f"Total Evaluated: {len(valid_recipients)}")
        print(f"Successful:      {success_count}")
        print(f"Failed:          {failed_count}")
        print("=" * 72)

        # Audit log
        if not dry_run and success_count > 0:
            try:
                log = AuditLog(
                    actor_name="CLI_SCRIPT_BROADCAST",
                    action="BROADCAST_PROFILE_EDIT_NOTICE",
                    target_type="SYSTEM",
                    target_id=f"RECIPIENTS_{success_count}",
                    previous_value="",
                    new_value=f"Deadline: {deadline_str}, Filter: {role_filter}, Delivered: {success_count}"
                )
                db.add(log)
                db.commit()
            except Exception:
                pass

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Broadcast Profile Edit Reopened Notice to registered users.")
    parser.add_argument("--role", default="ALL", choices=["ALL", "STUDENT", "PARTICIPANT", "VOLUNTEER", "ADMIN"], help="Filter by user role")
    parser.add_argument("--deadline", default=DEFAULT_DEADLINE_STR, help="Custom deadline display string")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without actually sending emails")
    parser.add_argument("--reset-locks", action="store_true", help="Reset profile_edited_once=False for all users")

    args = parser.parse_args()
    broadcast_notice(
        role_filter=args.role,
        deadline_str=args.deadline,
        dry_run=args.dry_run,
        reset_locks=args.reset_locks
    )
