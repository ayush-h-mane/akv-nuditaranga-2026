import os
import re
import base64
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..database import get_db
from ..models import User
from ..auth_deps import require_superadmin
from ..services.google_sheets_service import (
    get_google_sheets_config,
    save_google_sheets_config,
    build_google_sheets_payload,
    sync_to_google_sheets,
    DEFAULT_SPREADSHEET_ID,
    DEFAULT_SPREADSHEET_URL
)

router = APIRouter(tags=["Google Sheets Sync"])

class GoogleSheetsConfigRequest(BaseModel):
    webhook_url: Optional[str] = ""
    auto_sync_on_attendance: Optional[bool] = False

# ==============================================================================
# PUBLIC VOLUNTEER PHOTO ENDPOINT (FOR GOOGLE SHEETS =IMAGE() & BROWSER DISPLAY)
# ==============================================================================
@router.get("/users/{identifier}/photo")
def get_user_photo(identifier: str, db: Session = Depends(get_db)):
    """
    Publicly serves a user/volunteer's photo by AUID, registration ID, or numeric ID.
    Supports decoding Base64 data URLs into binary images, redirecting to hosted URLs,
    or falling back to a branded AKV SVG avatar placeholder.
    """
    clean_id = identifier.strip()
    user = None

    if clean_id.isdigit():
        user = db.query(User).filter(User.id == int(clean_id)).first()

    if not user:
        user = db.query(User).filter(
            or_(
                func.upper(User.auid) == clean_id.upper(),
                func.upper(User.registration_id) == clean_id.upper()
            )
        ).first()

    if user and user.photo_url:
        p_url = user.photo_url.strip()
        # Case A: Base64 Data URL (e.g. data:image/jpeg;base64,...)
        if p_url.startswith("data:image/"):
            try:
                header, b64_data = p_url.split(",", 1)
                mime_match = re.search(r"data:([^;]+);", header)
                mime_type = mime_match.group(1) if mime_match else "image/jpeg"
                img_bytes = base64.b64decode(b64_data)
                return Response(
                    content=img_bytes,
                    media_type=mime_type,
                    headers={
                        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                        "Content-Disposition": f'inline; filename="{clean_id}.jpg"'
                    }
                )
            except Exception as e:
                print(f"[PHOTO_SERVE_ERROR] Failed to decode base64 photo for {clean_id}: {e}")

        # Case B: Hosted HTTP(S) URL
        elif p_url.startswith("http://") or p_url.startswith("https://"):
            return RedirectResponse(url=p_url)

    # Fallback: Clean SVG Initial Avatar with Karnataka Red & Gold styling
    initial = (user.name[0].upper() if user and user.name else "V")
    domain_label = (user.volunteer_domain or "AKV 2026") if user else "AKV 2026"
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#991B1B" />
          <stop offset="100%" stop-color="#7F1D1D" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="30" fill="url(#grad)" />
      <circle cx="100" cy="85" r="45" fill="#FEF08A" opacity="0.9" />
      <text x="100" y="100" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#78350F" text-anchor="middle">{initial}</text>
      <rect x="20" y="150" width="160" height="30" rx="15" fill="#D97706" />
      <text x="100" y="170" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">{domain_label[:18]}</text>
    </svg>"""

    return Response(
        content=svg.encode("utf-8"),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )

# ==============================================================================
# SUPERADMIN GOOGLE SHEETS MANAGEMENT ENDPOINTS
# ==============================================================================

@router.get("/google-sheets/config")
def get_sheets_configuration(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Returns current Google Sheets sync configuration."""
    cfg = get_google_sheets_config(db=db)
    return {
        "spreadsheet_id": cfg.get("spreadsheet_id", DEFAULT_SPREADSHEET_ID),
        "spreadsheet_url": cfg.get("spreadsheet_url", DEFAULT_SPREADSHEET_URL),
        "webhook_url": cfg.get("webhook_url", ""),
        "auto_sync_on_attendance": cfg.get("auto_sync_on_attendance", False),
        "last_synced_at": cfg.get("last_synced_at"),
        "last_sync_status": cfg.get("last_sync_status", "NOT_CONFIGURED"),
        "last_sync_message": cfg.get("last_sync_message"),
        "last_synced_stats": cfg.get("last_synced_stats", {})
    }

@router.post("/google-sheets/config")
def update_sheets_configuration(
    payload: GoogleSheetsConfigRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Updates Google Sheets webhook URL and sync preferences."""
    clean_url = (payload.webhook_url or "").strip()

    if clean_url:
        if "docs.google.com/spreadsheets" in clean_url or "spreadsheets/d/" in clean_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Invalid Webhook URL: You entered a Google Spreadsheet link (docs.google.com). "
                    "A Google Apps Script Web App URL is required. Click 'Apps Script Code' above, "
                    "deploy Code.gs via Extensions > Apps Script > Deploy > New deployment > Web app, "
                    "and paste the resulting Web App URL ending in /exec."
                )
            )
        if clean_url.endswith("/dev"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Invalid Webhook URL: You provided a '/dev' test URL. "
                    "Test URLs require owner authentication and cannot receive automated external syncs. "
                    "Please deploy via Deploy > New deployment > Web app, and use the production '/exec' URL."
                )
            )
        if not (clean_url.startswith("https://script.google.com/macros/s/") or clean_url.startswith("http://localhost")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Webhook URL format. Expected a Google Apps Script Web App URL starting with 'https://script.google.com/macros/s/.../exec'."
            )

    updated = save_google_sheets_config({
        "webhook_url": clean_url,
        "auto_sync_on_attendance": payload.auto_sync_on_attendance
    }, db=db)
    return {
        "success": True,
        "message": "Google Sheets sync configuration updated successfully.",
        "config": updated
    }

@router.get("/google-sheets/script")
def get_apps_script_source(
    current_user: User = Depends(require_superadmin)
):
    """Returns the turnkey Google Apps Script Code.gs content."""
    candidate_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "Code.gs"),
        os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts", "google_apps_script", "Code.gs")
        ),
        os.path.join(os.getcwd(), "scripts", "google_apps_script", "Code.gs")
    ]
    code = ""
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    code = f.read()
                if code:
                    break
            except Exception:
                pass

    if not code:
        code = "// Google Apps Script file not found"

    return {
        "spreadsheet_id": DEFAULT_SPREADSHEET_ID,
        "spreadsheet_url": DEFAULT_SPREADSHEET_URL,
        "script": code
    }

@router.get("/google-sheets/payload")
def preview_sync_payload(
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Returns the structured JSON payload for inspection or manual testing."""
    base_url = str(request.base_url).rstrip("/")
    return build_google_sheets_payload(db, base_url=base_url)

@router.post("/google-sheets/sync")
def trigger_google_sheets_sync(
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Triggers immediate synchronization to the configured Google Spreadsheet."""
    base_url = str(request.base_url).rstrip("/")
    result = sync_to_google_sheets(db, base_url=base_url)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to sync to Google Sheets.")
        )
    return result
