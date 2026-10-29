import json
import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from ..database import get_db
from ..models import Registration, Event, User, ReelRating
from ..auth_deps import get_current_user_optional, require_admin, require_superadmin

router = APIRouter(prefix="/reel-contest", tags=["Reel Contest & Ratings"])

EVALUATION_DEADLINE_TEXT = "November 4, 2026, 17:30 PM IST"


class ReelLinksUpdate(BaseModel):
    reel_link_1: Optional[str] = None
    reel_link_2: Optional[str] = None
    reel_link_3: Optional[str] = None
    reel_link_4: Optional[str] = None
    reel_reach_insights: Optional[str] = None


class ReelRateRequest(BaseModel):
    registration_id: str
    reel_index: int = Field(default=1, ge=1, le=4)
    rating: float = Field(ge=1.0, le=5.0)
    criteria_creativity: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    criteria_heritage: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    criteria_overall: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    feedback: Optional[str] = None
    rater_auid: Optional[str] = None
    rater_name: Optional[str] = None


def is_reel_contest_event(event_id: str, event_title: str = "") -> bool:
    eid = (event_id or "").strip().lower()
    etitle = (event_title or "").strip().lower()
    return "reel" in eid or "reel" in etitle or eid == "akv-nt-reel" or eid == "akv-nt-11"


@router.get("/submissions/{registration_id}")
def get_reel_contest_submission(
    registration_id: str,
    viewer_auid: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Fetches participant reel submissions, community ratings, and whether
    the viewing user profile has already submitted a rating.
    """
    reg_id_clean = registration_id.strip()
    reg = db.query(Registration).filter(
        func.upper(Registration.registration_id) == reg_id_clean.upper()
    ).first()

    if not reg:
        # Fallback by ID or AUID
        reg = db.query(Registration).filter(
            or_(
                func.upper(Registration.auid) == reg_id_clean.upper(),
                func.upper(Registration.usn) == reg_id_clean.upper()
            )
        ).first()

    if not reg:
        raise HTTPException(status_code=404, detail="Reel contest participant registration not found.")

    # Parse submitted reel links (up to 4)
    reels_list = []
    if reg.reel_links:
        try:
            raw = json.loads(reg.reel_links)
            if isinstance(raw, list):
                for item in raw:
                    if isinstance(item, dict) and item.get("url"):
                        reels_list.append(item)
                    elif isinstance(item, str) and item.strip():
                        reels_list.append({"reel_index": len(reels_list) + 1, "url": item.strip()})
        except Exception:
            reels_list = []

    # Fallback: if reel_links is empty but instagram_reel_link exists, treat as Reel 1
    if not reels_list and reg.instagram_reel_link:
        reels_list.append({
            "reel_index": 1,
            "url": reg.instagram_reel_link.strip(),
            "title": "Reel #1 (Latest)"
        })

    # Determine effective viewer identity safely
    active_user = current_user if (current_user and hasattr(current_user, "id")) else None
    v_user_id = active_user.id if active_user else None
    raw_v_auid = active_user.auid if active_user else (viewer_auid if isinstance(viewer_auid, str) else "")
    v_auid = (raw_v_auid or "").strip().upper()

    # Query all ratings for this registration
    all_ratings = db.query(ReelRating).filter(
        func.upper(ReelRating.registration_id) == reg.registration_id.upper()
    ).all()

    ratings_by_index = {}
    for r in all_ratings:
        idx = r.reel_index or 1
        ratings_by_index.setdefault(idx, []).append(r)

    # Build response for each reel
    reels_output = []
    for r_entry in reels_list:
        idx = int(r_entry.get("reel_index", len(reels_output) + 1))
        url = r_entry.get("url", "").strip()
        idx_ratings = ratings_by_index.get(idx, [])

        ratings_count = len(idx_ratings)
        avg_rating = round(sum(item.rating for item in idx_ratings) / ratings_count, 1) if ratings_count > 0 else 0.0

        # Check if viewer has rated this specific reel
        has_rated = False
        my_rating = None
        if v_user_id or v_auid:
            for item in idx_ratings:
                if (v_user_id and item.user_id == v_user_id) or (v_auid and item.rater_auid and item.rater_auid.upper() == v_auid):
                    has_rated = True
                    my_rating = item.rating
                    break

        reels_output.append({
            "reel_index": idx,
            "url": url,
            "title": r_entry.get("title") or f"Reel #{idx}",
            "average_rating": avg_rating,
            "ratings_count": ratings_count,
            "has_rated": has_rated,
            "my_rating": my_rating
        })

    total_ratings_count = len(all_ratings)
    overall_avg = round(sum(r.rating for r in all_ratings) / total_ratings_count, 1) if total_ratings_count > 0 else 0.0

    return {
        "registration_id": reg.registration_id,
        "participant_name": reg.full_name,
        "auid": reg.auid or reg.usn,
        "usn": reg.usn or reg.auid,
        "institute": reg.institute or "Acharya Institute of Technology",
        "department": reg.department,
        "semester": reg.semester,
        "section": reg.section,
        "instagram_username": reg.instagram_username or "",
        "instagram_profile_link": reg.instagram_profile_link or "",
        "instagram_reel_link": reg.instagram_reel_link or "",
        "reel_reach_insights": reg.reel_reach_insights or "",
        "reel_submitted_at": reg.reel_submitted_at.isoformat(sep=" ") if reg.reel_submitted_at else None,
        "reels": reels_output,
        "total_reels_count": len(reels_output),
        "overall_average_rating": overall_avg,
        "total_ratings_count": total_ratings_count,
        "evaluation_deadline": EVALUATION_DEADLINE_TEXT,
        "is_self": bool(current_user and (current_user.auid.upper() == (reg.auid or "").upper() or current_user.id == reg.user_id))
    }


@router.post("/submissions/{registration_id}/reels")
def update_reel_contest_links(
    registration_id: str,
    payload: ReelLinksUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Allows a registered reel contest participant (or admin) to upload/update
    their Instagram reel links (up to 4) and insights for the Nov 4th evaluation.
    """
    reg_id_clean = registration_id.strip()
    reg = db.query(Registration).filter(
        func.upper(Registration.registration_id) == reg_id_clean.upper()
    ).first()

    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found.")

    # Build reel array from links 1 to 4
    input_links = [
        (1, payload.reel_link_1),
        (2, payload.reel_link_2),
        (3, payload.reel_link_3),
        (4, payload.reel_link_4),
    ]

    reels_data = []
    first_valid_link = ""

    for idx, link in input_links:
        if link and link.strip():
            clean_url = link.strip()
            # If user entered handle without full url
            if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
                clean_url = f"https://www.instagram.com/reel/{clean_url.lstrip('/')}"
            
            reels_data.append({
                "reel_index": idx,
                "url": clean_url,
                "title": f"Reel #{idx}",
                "updated_at": datetime.datetime.utcnow().isoformat()
            })
            if not first_valid_link:
                first_valid_link = clean_url

    if not reels_data and not (payload.reel_reach_insights and payload.reel_reach_insights.strip()):
        raise HTTPException(status_code=400, detail="Please provide at least one valid Instagram reel link or insights detail.")

    if first_valid_link:
        reg.instagram_reel_link = first_valid_link
    
    if reels_data:
        reg.reel_links = json.dumps(reels_data)

    if payload.reel_reach_insights is not None:
        reg.reel_reach_insights = payload.reel_reach_insights.strip()

    reg.reel_submitted_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(reg)

    return {
        "success": True,
        "message": "Reel contest links and insights successfully submitted for evaluation.",
        "registration_id": reg.registration_id,
        "reels_count": len(reels_data),
        "latest_reel_link": reg.instagram_reel_link,
        "reel_submitted_at": reg.reel_submitted_at.isoformat(sep=" ") if reg.reel_submitted_at else None,
        "evaluation_deadline": EVALUATION_DEADLINE_TEXT
    }


@router.post("/rate")
def submit_reel_rating(
    req: ReelRateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Submits a rating for a participant's reel.
    Strict Rule: Each user profile is accepted for exactly one rating per reel.
    """
    reg = db.query(Registration).filter(
        func.upper(Registration.registration_id) == req.registration_id.strip().upper()
    ).first()

    if not reg:
        raise HTTPException(status_code=404, detail="Target participant registration not found.")

    # Determine rater identity safely
    active_user = current_user if (current_user and hasattr(current_user, "id")) else None
    rater_user_id = active_user.id if active_user else None
    rater_auid = (active_user.auid if active_user else (req.rater_auid or "")).strip().upper()
    rater_name = (active_user.name if active_user else (req.rater_name or "Anonymous Reviewer")).strip()
    rater_email = (active_user.email if active_user else "").strip()

    if not rater_user_id and not rater_auid:
        raise HTTPException(
            status_code=401,
            detail="User profile authentication or Student AUID is required to submit a verified rating."
        )

    # Participant cannot rate their own reel
    if rater_auid and (rater_auid == (reg.auid or "").upper() or rater_auid == (reg.usn or "").upper()):
        raise HTTPException(
            status_code=400,
            detail="Participants cannot rate their own submitted reels."
        )

    # Enforce strict 1 rating per user profile for this reel
    existing_query = db.query(ReelRating).filter(
        func.upper(ReelRating.registration_id) == reg.registration_id.upper(),
        ReelRating.reel_index == req.reel_index
    )

    if rater_user_id and rater_auid:
        existing_rating = existing_query.filter(
            or_(
                ReelRating.user_id == rater_user_id,
                func.upper(ReelRating.rater_auid) == rater_auid
            )
        ).first()
    elif rater_user_id:
        existing_rating = existing_query.filter(ReelRating.user_id == rater_user_id).first()
    else:
        existing_rating = existing_query.filter(func.upper(ReelRating.rater_auid) == rater_auid).first()

    if existing_rating:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted a rating for this reel with your user profile. Only 1 rating per profile is accepted."
        )

    # Find the matching reel URL if available
    reel_url = ""
    if reg.reel_links:
        try:
            r_list = json.loads(reg.reel_links)
            match = next((item for item in r_list if int(item.get("reel_index", 0)) == req.reel_index), None)
            if match:
                reel_url = match.get("url", "")
        except Exception:
            pass
    if not reel_url and req.reel_index == 1:
        reel_url = reg.instagram_reel_link or ""

    # Extract client IP as secondary audit identifier
    client_ip = request.client.host if (request and getattr(request, "client", None)) else None

    new_rating = ReelRating(
        registration_id=reg.registration_id,
        reel_index=req.reel_index,
        reel_url=reel_url,
        user_id=rater_user_id,
        rater_auid=rater_auid or None,
        rater_name=rater_name,
        rater_email=rater_email or None,
        rater_ip=client_ip,
        rating=float(req.rating),
        criteria_creativity=float(req.criteria_creativity) if req.criteria_creativity else None,
        criteria_heritage=float(req.criteria_heritage) if req.criteria_heritage else None,
        criteria_overall=float(req.criteria_overall) if req.criteria_overall else None,
        feedback=req.feedback.strip() if req.feedback else None,
        created_at=datetime.datetime.utcnow()
    )

    db.add(new_rating)
    db.commit()

    # Calculate updated stats for this reel
    idx_ratings = db.query(ReelRating).filter(
        func.upper(ReelRating.registration_id) == reg.registration_id.upper(),
        ReelRating.reel_index == req.reel_index
    ).all()
    count = len(idx_ratings)
    avg_score = round(sum(r.rating for r in idx_ratings) / count, 1) if count > 0 else req.rating

    return {
        "success": True,
        "message": "Thank you! Your official rating has been successfully recorded.",
        "registration_id": reg.registration_id,
        "reel_index": req.reel_index,
        "your_rating": req.rating,
        "updated_average": avg_score,
        "total_votes": count
    }


@router.get("/all-submissions")
def get_all_reel_contest_submissions(
    db: Session = Depends(get_db)
):
    """
    Returns all Reel Contest registered participants with their reel links,
    insights, and community ratings. Accessible for developer/superadmin dashboards.
    """
    # Fetch all registrations for Reel Contest
    regs = db.query(Registration).filter(
        or_(
            func.lower(Registration.event_id) == "akv-nt-reel",
            func.lower(Registration.event_id) == "akv-nt-11",
            Registration.instagram_username.isnot(None),
            Registration.instagram_reel_link.isnot(None)
        )
    ).order_by(Registration.id.asc()).all()

    # Pre-fetch all ratings grouped by registration_id
    all_ratings = db.query(ReelRating).all()
    ratings_by_reg = {}
    for r in all_ratings:
        ratings_by_reg.setdefault(r.registration_id.upper(), []).append(r)

    results = []
    for reg in regs:
        reg_ratings = ratings_by_reg.get(reg.registration_id.upper(), [])
        rating_count = len(reg_ratings)
        avg_rating = round(sum(r.rating for r in reg_ratings) / rating_count, 1) if rating_count > 0 else 0.0

        # Parse reels
        reels_data = []
        if reg.reel_links:
            try:
                raw = json.loads(reg.reel_links)
                if isinstance(raw, list):
                    reels_data = raw
            except Exception:
                pass
        if not reels_data and reg.instagram_reel_link:
            reels_data = [{"reel_index": 1, "url": reg.instagram_reel_link}]

        results.append({
            "id": reg.id,
            "registration_id": reg.registration_id,
            "full_name": reg.full_name,
            "auid": reg.auid or reg.usn,
            "usn": reg.usn or reg.auid,
            "institute": reg.institute or "Acharya Institute of Technology",
            "department": reg.department,
            "phone": reg.phone,
            "email": reg.email,
            "instagram_username": reg.instagram_username or "",
            "instagram_profile_link": reg.instagram_profile_link or "",
            "instagram_reel_link": reg.instagram_reel_link or "",
            "reel_links": reels_data,
            "reel_reach_insights": reg.reel_reach_insights or "",
            "reel_submitted_at": reg.reel_submitted_at.isoformat(sep=" ") if reg.reel_submitted_at else None,
            "average_rating": avg_rating,
            "total_ratings": rating_count,
            "has_uploaded": bool(reg.instagram_reel_link or reels_data)
        })

    return {
        "evaluation_deadline": EVALUATION_DEADLINE_TEXT,
        "total_participants": len(results),
        "total_with_reels": sum(1 for r in results if r["has_uploaded"]),
        "submissions": results
    }


@router.get("/export-xlsx")
def export_reel_contest_excel(
    db: Session = Depends(get_db)
):
    """
    Generates an official formatted Excel workbook containing all Reel Contest
    participant submissions, uploaded reel links, reach & insights metrics, and ratings.
    """
    # 1. Fetch participants
    regs = db.query(Registration).filter(
        or_(
            func.lower(Registration.event_id) == "akv-nt-reel",
            func.lower(Registration.event_id) == "akv-nt-11",
            Registration.instagram_username.isnot(None),
            Registration.instagram_reel_link.isnot(None)
        )
    ).order_by(Registration.id.asc()).all()

    # Pre-fetch all ratings
    all_ratings = db.query(ReelRating).order_by(ReelRating.created_at.desc()).all()
    ratings_by_reg = {}
    for r in all_ratings:
        ratings_by_reg.setdefault(r.registration_id.upper(), []).append(r)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Remove default blank sheet

    # Common Styles
    font_bold_white = Font(bold=True, color="FFFFFF", size=10)
    font_title = Font(bold=True, color="FFFFFF", size=12)
    font_subtitle = Font(italic=True, color="FEF08A", size=9)
    fill_brand_red = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")
    fill_header = PatternFill(start_color="7F1D1D", end_color="7F1D1D", fill_type="solid")
    fill_rating_header = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin", color="E5E7EB"),
        right=Side(style="thin", color="E5E7EB"),
        top=Side(style="thin", color="E5E7EB"),
        bottom=Side(style="thin", color="E5E7EB")
    )

    # ========================================================
    # SHEET 1: REEL SUBMISSIONS & INSIGHTS
    # ========================================================
    ws1 = wb.create_sheet(title="Reel Submissions & Insights")

    # Banner Header
    ws1.merge_cells("A1:U1")
    ws1["A1"] = "AKV NUDITARANGA 2026 - REEL CONTEST PARTICIPANT SUBMISSIONS & INSIGHTS"
    ws1["A1"].font = font_title
    ws1["A1"].fill = fill_brand_red
    ws1["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[1].height = 28

    ws1.merge_cells("A2:U2")
    ws1["A2"] = f"Official Evaluation Cutoff: {EVALUATION_DEADLINE_TEXT} | Based on Participant Reels, Reach Metrics & Community Votes"
    ws1["A2"].font = font_subtitle
    ws1["A2"].fill = PatternFill(start_color="450A0A", end_color="450A0A", fill_type="solid")
    ws1["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[2].height = 20

    headers1 = [
        "Sl No", "Registration ID", "Full Name", "AUID", "USN",
        "Institute", "Department", "Sem / Year", "Phone", "Email",
        "Instagram Handle", "Instagram Profile Link",
        "Reel 1 (Latest Link)", "Reel 2 Link", "Reel 3 Link", "Reel 4 Link",
        "Total Reels", "Reach & Insights Notes",
        "Average Rating (⭐)", "Total Ratings", "Submitted At"
    ]
    ws1.append(headers1)
    ws1.row_dimensions[3].height = 26

    for cell in ws1[3]:
        cell.fill = fill_header
        cell.font = font_bold_white
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for i, reg in enumerate(regs, start=1):
        reg_ratings = ratings_by_reg.get(reg.registration_id.upper(), [])
        count_votes = len(reg_ratings)
        avg_score = round(sum(r.rating for r in reg_ratings) / count_votes, 1) if count_votes > 0 else 0.0

        # Parse up to 4 reel links
        r_links = ["", "", "", ""]
        if reg.reel_links:
            try:
                r_arr = json.loads(reg.reel_links)
                if isinstance(r_arr, list):
                    for item in r_arr:
                        idx = int(item.get("reel_index", 1)) - 1
                        if 0 <= idx < 4:
                            r_links[idx] = item.get("url", "")
            except Exception:
                pass
        if not r_links[0] and reg.instagram_reel_link:
            r_links[0] = reg.instagram_reel_link

        total_reels = sum(1 for u in r_links if u.strip())

        ws1.append([
            i,
            reg.registration_id,
            reg.full_name,
            str(reg.auid or ""),
            str(reg.usn or ""),
            reg.institute or "Acharya Institute of Technology",
            reg.department,
            f"Sem {reg.semester}" if reg.semester else "",
            str(reg.phone or ""),
            str(reg.email or ""),
            f"@{reg.instagram_username.lstrip('@')}" if reg.instagram_username else "",
            reg.instagram_profile_link or "",
            r_links[0],
            r_links[1],
            r_links[2],
            r_links[3],
            total_reels,
            reg.reel_reach_insights or "",
            avg_score if count_votes > 0 else "No ratings yet",
            count_votes,
            reg.reel_submitted_at.strftime("%d-%m-%Y %H:%M:%S") if reg.reel_submitted_at else "Pending"
        ])

    for row in ws1.iter_rows(min_row=4):
        for cell in row:
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            if cell.data_type == "f":
                cell.value = "'" + str(cell.value)

    # Set column widths
    col_widths1 = [8, 16, 22, 16, 16, 28, 24, 12, 14, 26, 18, 32, 36, 36, 36, 36, 12, 32, 16, 14, 20]
    for col_idx, width in enumerate(col_widths1, start=1):
        ws1.column_dimensions[get_column_letter(col_idx)].width = width

    ws1.freeze_panes = "A4"
    ws1.auto_filter.ref = f"A3:U{ws1.max_row}"

    # ========================================================
    # SHEET 2: DETAILED RATING VOTES
    # ========================================================
    ws2 = wb.create_sheet(title="Community Rating Votes Log")

    ws2.merge_cells("A1:L1")
    ws2["A1"] = "AKV NUDITARANGA 2026 - REEL CONTEST INDIVIDUAL RATING AUDIT TRAIL"
    ws2["A1"].font = font_title
    ws2["A1"].fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 28

    headers2 = [
        "Sl No", "Participant Reg ID", "Reel #", "Reel URL",
        "Rater AUID", "Rater Name", "Rater Email",
        "Rating (1-5 ⭐)", "Creativity Score", "Kannada Heritage Score",
        "Feedback / Review", "Rated Timestamp (UTC)"
    ]
    ws2.append(headers2)
    ws2.row_dimensions[2].height = 24

    for cell in ws2[2]:
        cell.fill = fill_rating_header
        cell.font = font_bold_white
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for i, rate in enumerate(all_ratings, start=1):
        ws2.append([
            i,
            rate.registration_id,
            f"Reel #{rate.reel_index}",
            rate.reel_url or "",
            rate.rater_auid or "Verified Profile",
            rate.rater_name or "Student",
            rate.rater_email or "",
            rate.rating,
            rate.criteria_creativity or "",
            rate.criteria_heritage or "",
            rate.feedback or "",
            rate.created_at.strftime("%d-%m-%Y %H:%M:%S") if rate.created_at else ""
        ])

    for row in ws2.iter_rows(min_row=3):
        for cell in row:
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center", wrap_text=True)

    col_widths2 = [8, 18, 10, 36, 16, 22, 26, 14, 16, 18, 35, 20]
    for col_idx, width in enumerate(col_widths2, start=1):
        ws2.column_dimensions[get_column_letter(col_idx)].width = width

    ws2.freeze_panes = "A3"
    ws2.auto_filter.ref = f"A2:L{ws2.max_row}"

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = "AKV_Nuditaranga_2026_Reel_Contest_Evaluations.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
