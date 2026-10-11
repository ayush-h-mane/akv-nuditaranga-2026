import os
import json
import urllib.request
import urllib.error
import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..config import settings
from ..models import (
    User,
    AttendanceRecord,
    WorkingCommitteeAttendance,
    VolunteerAttendance,
    FestivalEventDate
)
from ..routes.working_committee_attendance import get_wc_members_query
from ..routes.attendance import DEPARTMENT_GROUPS
from ..utils.timezone import (
    get_current_ist_datetime,
    get_current_ist_date_str,
    format_to_ist_time
)

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "google_sheets_config.json")
DEFAULT_SPREADSHEET_ID = "1jDIzvpZSWe_PBFMzYAsR4wMaMcSvK4VO95URw7jsYAc"
DEFAULT_SPREADSHEET_URL = f"https://docs.google.com/spreadsheets/d/{DEFAULT_SPREADSHEET_ID}/edit?usp=sharing"

def get_google_sheets_config() -> Dict[str, Any]:
    """Retrieve persisted Google Sheets configuration."""
    default_config = {
        "spreadsheet_id": DEFAULT_SPREADSHEET_ID,
        "spreadsheet_url": DEFAULT_SPREADSHEET_URL,
        "webhook_url": os.getenv("GOOGLE_SHEETS_WEBHOOK_URL", ""),
        "auto_sync_on_attendance": False,
        "last_synced_at": None,
        "last_sync_status": "NOT_CONFIGURED",
        "last_sync_message": None,
        "last_synced_stats": {}
    }
    
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_config.update(data)
        except Exception:
            pass
            
    return default_config

def save_google_sheets_config(config_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save updated Google Sheets configuration to persistent storage."""
    cur = get_google_sheets_config()
    cur.update(config_data)
    
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cur, f, indent=2)
    except Exception as e:
        print(f"[GOOGLE_SHEETS_CONFIG] Error saving config: {e}")
        
    return cur

def build_google_sheets_payload(db: Session, base_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Assembles complete volunteer roster, working committee profiles,
    festival dates, and daily attendance records.
    """
    effective_base_url = (base_url or settings.FRONTEND_URL or "https://akv.acharyahabba.com").rstrip("/")
    
    # 1. Configured & Recorded Festival Dates
    configured_dates = [d[0] for d in db.query(FestivalEventDate.date).filter(FestivalEventDate.is_active == True).all()]
    rec_dates_dept = [r[0] for r in db.query(AttendanceRecord.attendance_date).distinct().all()]
    rec_dates_wc = [r[0] for r in db.query(WorkingCommitteeAttendance.attendance_date).distinct().all()]
    all_dates = sorted(list(set(configured_dates + rec_dates_dept + rec_dates_wc)))
    if not all_dates:
        all_dates = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]

    # 2. Query all volunteers
    volunteers_query = db.query(User).filter(
        or_(
            User.role == "VOLUNTEER",
            User.volunteer_domain.isnot(None),
            User.role.in_(["PARTICIPANT", "STUDENT"])
        )
    ).order_by(User.name.asc()).all()

    # Calculate attendance counts per volunteer
    vol_att_counts = {}
    dept_records = db.query(AttendanceRecord).all()
    for rec in dept_records:
        if rec.status in ["PRESENT", "COMPLETED"] or (rec.check_in_at and rec.check_out_at):
            vol_att_counts[rec.user_id] = vol_att_counts.get(rec.user_id, 0) + 1

    volunteers_data = []
    for v in volunteers_query:
        # Only include volunteers or users with assigned domains
        if v.role != "VOLUNTEER" and not v.volunteer_domain:
            continue
            
        clean_auid = (v.auid or "").strip().upper()
        photo_link = f"{effective_base_url}/api/users/{clean_auid or v.id}/photo" if (clean_auid or v.id) else ""
        
        volunteers_data.append({
            "id": v.id,
            "registration_id": v.registration_id or f"VOL{v.id:04d}",
            "name": v.name,
            "auid": clean_auid,
            "email": v.email,
            "phone": v.phone or "--",
            "institute": v.institute or "Acharya Institute of Technology",
            "department": v.department or "--",
            "semester": v.semester or 1,
            "year": v.semester or 1,
            "gender": v.gender or "Male",
            "role": v.role,
            "volunteer_domain": v.volunteer_domain or "Unassigned",
            "photo_direct_url": photo_link,
            "total_days_present": vol_att_counts.get(v.id, 0),
            "account_status": v.account_status or "ACTIVE",
            "managed_by": v.managed_by or "AKV Admin"
        })

    # 3. Query Working Committee members
    wc_members_query = get_wc_members_query(db).all()
    wc_att_counts = {}
    wc_records = db.query(WorkingCommitteeAttendance).all()
    for rec in wc_records:
        if rec.status in ["PRESENT", "COMPLETED"] or (rec.check_in_at and rec.check_out_at):
            wc_att_counts[rec.working_committee_member_id] = wc_att_counts.get(rec.working_committee_member_id, 0) + 1

    wc_data = []
    for m in wc_members_query:
        clean_auid = (m.auid or "").strip().upper()
        photo_link = f"{effective_base_url}/api/users/{clean_auid or m.id}/photo" if (clean_auid or m.id) else ""
        
        wc_data.append({
            "id": m.id,
            "registration_id": m.registration_id or f"WC{m.id:03d}",
            "name": m.name,
            "auid": clean_auid,
            "email": m.email,
            "phone": m.phone or "--",
            "institute": m.institute or "Acharya Institute of Technology",
            "department": m.department or "--",
            "admin_type": m.admin_type or "WORKING_COMMITTEE",
            "working_committee_role": m.working_committee_role or m.admin_type or "Coordinator",
            "photo_direct_url": photo_link,
            "total_days_present": wc_att_counts.get(m.id, 0),
            "account_status": m.account_status or "ACTIVE"
        })

    # 4. Map daily attendance records
    # Lookup keys:
    # `${auid}_${date}` and `${id}_${date}`
    attendance_lookup = {}

    for rec in dept_records:
        u = db.query(User).filter(User.id == rec.user_id).first()
        auid_key = (u.auid.strip().upper() if u and u.auid else "")
        id_key = str(rec.user_id)
        d = rec.attendance_date

        is_present = bool(
            rec.status in ["PRESENT", "COMPLETED"] or
            (rec.check_in_at and rec.check_out_at) or
            (rec.status != "ABSENT" and rec.check_in_at)
        )

        val = {
            "status": rec.status,
            "is_present": is_present,
            "check_in_time": format_to_ist_time(rec.check_in_at) if rec.check_in_at else ("Present" if is_present else "--"),
            "check_out_time": format_to_ist_time(rec.check_out_at) if rec.check_out_at else ("Present" if is_present else "--"),
            "marked_by": rec.submitted_by or rec.last_modified_by or "Admin"
        }

        if auid_key:
            attendance_lookup[f"{auid_key}_{d}"] = val
        attendance_lookup[f"{id_key}_{d}"] = val

    for rec in wc_records:
        u = db.query(User).filter(User.id == rec.working_committee_member_id).first()
        auid_key = (u.auid.strip().upper() if u and u.auid else "")
        id_key = str(rec.working_committee_member_id)
        d = rec.attendance_date

        is_present = bool(
            rec.status in ["PRESENT", "COMPLETED"] or
            (rec.check_in_at and rec.check_out_at) or
            (rec.status != "ABSENT" and rec.check_in_at)
        )

        val = {
            "status": rec.status,
            "is_present": is_present,
            "check_in_time": format_to_ist_time(rec.check_in_at) if rec.check_in_at else ("Present" if is_present else "--"),
            "check_out_time": format_to_ist_time(rec.check_out_at) if rec.check_out_at else ("Present" if is_present else "--"),
            "marked_by": rec.submitted_by or rec.last_modified_by or "AKV Superadmin"
        }

        if auid_key:
            attendance_lookup[f"{auid_key}_{d}"] = val
        attendance_lookup[f"{id_key}_{d}"] = val

    # 5. Domain Groups
    domain_groups_payload = [
        {"name": group_name, "aliases": aliases}
        for group_name, aliases in DEPARTMENT_GROUPS
    ]

    return {
        "action": "sync_all",
        "spreadsheet_id": DEFAULT_SPREADSHEET_ID,
        "base_url": effective_base_url,
        "dates": all_dates,
        "domain_groups": domain_groups_payload,
        "volunteers": volunteers_data,
        "working_committee": wc_data,
        "attendance_records": attendance_lookup,
        "generated_at": get_current_ist_datetime().isoformat()
    }

def sync_to_google_sheets(
    db: Session,
    webhook_url: Optional[str] = None,
    base_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synchronizes volunteer data and attendance to the Google Spreadsheet via the Google Apps Script Webhook.
    """
    config = get_google_sheets_config()
    target_url = (webhook_url or config.get("webhook_url") or "").strip()

    if not target_url:
        return {
            "success": False,
            "error": "Google Apps Script Webhook URL is not configured. Please paste your deployed Web App URL in the Superadmin Portal."
        }

    payload = build_google_sheets_payload(db, base_url=base_url)
    payload_bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        target_url,
        data=payload_bytes,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "AKV-Nuditaranga-Sync-Service/2.3"
        },
        method="POST"
    )

    now_ist = get_current_ist_datetime().isoformat()

    try:
        # Apps Script Web Apps often return 302 redirects to script.googleusercontent.com,
        # urllib handles HTTP redirects seamlessly.
        with urllib.request.urlopen(req, timeout=45) as response:
            res_body = response.read().decode("utf-8")
            try:
                res_json = json.loads(res_body)
            except Exception:
                res_json = {"raw": res_body}

            save_google_sheets_config({
                "last_synced_at": now_ist,
                "last_sync_status": "SUCCESS" if res_json.get("success", True) else "FAILED",
                "last_sync_message": res_json.get("message", "Sync executed successfully."),
                "last_synced_stats": res_json.get("stats", {
                    "volunteersCount": len(payload["volunteers"]),
                    "wcCount": len(payload["working_committee"]),
                    "dates": payload["dates"]
                })
            })

            return {
                "success": True,
                "message": res_json.get("message", "Successfully synced to Google Spreadsheet!"),
                "stats": res_json.get("stats", {
                    "volunteers_count": len(payload["volunteers"]),
                    "wc_count": len(payload["working_committee"]),
                    "dates_count": len(payload["dates"])
                }),
                "synced_at": now_ist
            }

    except urllib.error.HTTPError as he:
        err_msg = f"Google Sheets Webhook HTTP error {he.code}: {he.reason}"
        save_google_sheets_config({
            "last_synced_at": now_ist,
            "last_sync_status": "ERROR",
            "last_sync_message": err_msg
        })
        return {"success": False, "error": err_msg}

    except urllib.error.URLError as ue:
        err_msg = f"Network connection to Google Sheets Webhook failed: {ue.reason}"
        save_google_sheets_config({
            "last_synced_at": now_ist,
            "last_sync_status": "ERROR",
            "last_sync_message": err_msg
        })
        return {"success": False, "error": err_msg}

    except Exception as e:
        err_msg = f"Unexpected error during Google Sheets sync: {str(e)}"
        save_google_sheets_config({
            "last_synced_at": now_ist,
            "last_sync_status": "ERROR",
            "last_sync_message": err_msg
        })
        return {"success": False, "error": err_msg}
