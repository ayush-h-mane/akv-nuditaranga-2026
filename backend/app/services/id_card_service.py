import io
import json
import base64
import qrcode
from typing import Optional, Dict, Any
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

def generate_candidate_id_card_pdf(data: Dict[str, Any]) -> bytes:
    """
    Generates a high-quality, printable official ID Card & Verification Pass PDF
    for Acharya Kannada Vedike (AKV) – Nuditaranga 2026.
    
    Card dimensions: 320 pt x 480 pt (approx 4.4 x 6.6 inches - standard festival badge size).
    """
    buffer = io.BytesIO()
    card_width = 320
    card_height = 480
    c = canvas.Canvas(buffer, pagesize=(card_width, card_height))

    name = str(data.get("name") or data.get("full_name") or "Candidate").strip()
    auid = str(data.get("auid") or data.get("usn") or "AIT-2026").strip().upper()
    reg_id = str(data.get("registration_id") or "AKV26001").strip().upper()
    role = str(data.get("role") or "PARTICIPANT").strip().upper()
    institute = str(data.get("institute") or "Acharya Institute of Technology").strip()
    department = str(data.get("department") or "Information Science & Engineering").strip()
    semester = str(data.get("semester") or "").strip()
    section = str(data.get("section") or "").strip().upper()
    email = str(data.get("email") or "").strip()
    phone = str(data.get("phone") or "").strip()
    volunteer_domain = data.get("volunteer_domain")
    photo_url = data.get("photo_url")

    # 1. Background & Outer Border
    c.setFillColor(colors.HexColor("#FAF8F5"))
    c.roundRect(8, 8, card_width - 16, card_height - 16, 16, fill=1, stroke=0)

    # Double Border (Outer Red, Inner Gold)
    c.setStrokeColor(colors.HexColor("#B91C1C"))
    c.setLineWidth(2.5)
    c.roundRect(8, 8, card_width - 16, card_height - 16, 16, fill=0, stroke=1)

    c.setStrokeColor(colors.HexColor("#F59E0B"))
    c.setLineWidth(1)
    c.roundRect(12, 12, card_width - 24, card_height - 24, 13, fill=0, stroke=1)

    # 2. Top Header Banner
    # Red Header Block
    header_height = 72
    c.setFillColor(colors.HexColor("#B91C1C"))
    c.rect(13, card_height - 13 - header_height, card_width - 26, header_height, fill=1, stroke=0)

    # Gold Accent Line underneath header
    c.setFillColor(colors.HexColor("#F59E0B"))
    c.rect(13, card_height - 13 - header_height - 3, card_width - 26, 3, fill=1, stroke=0)

    # Header Titles
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawCentredString(card_width / 2.0, card_height - 34, "ACHARYA KANNADA VEDIKE")

    c.setFillColor(colors.HexColor("#FEF08A"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(card_width / 2.0, card_height - 49, "ನುಡಿತರಂಗ ೨೦೨೬ • NUDITARANGA 2026")

    c.setFillColor(colors.HexColor("#FED7AA"))
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(card_width / 2.0, card_height - 63, "OFFICIAL CANDIDATE CREDENTIAL & FESTIVAL PASS")

    # 3. Photo & Role Badge Section
    photo_box_x = 24
    photo_box_y = card_height - 13 - header_height - 110
    photo_w = 75
    photo_h = 95

    # Draw Photo Frame
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.roundRect(photo_box_x, photo_box_y, photo_w, photo_h, 8, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#DC2626"))
    c.setLineWidth(1.5)
    c.roundRect(photo_box_x, photo_box_y, photo_w, photo_h, 8, fill=0, stroke=1)

    photo_rendered = False
    if photo_url and photo_url.startswith("data:image"):
        try:
            # Decode base64 data URL
            header, base64_data = photo_url.split(",", 1)
            img_bytes = base64.b64decode(base64_data)
            pil_img = Image.open(io.BytesIO(img_bytes))
            # Convert to RGB if RGBA
            if pil_img.mode in ("RGBA", "P"):
                pil_img = pil_img.convert("RGB")
            img_buf = io.BytesIO()
            pil_img.save(img_buf, format="JPEG")
            img_buf.seek(0)
            c.drawImage(ImageReader(img_buf), photo_box_x + 2, photo_box_y + 2, width=photo_w - 4, height=photo_h - 4, preserveAspectRatio=True)
            photo_rendered = True
        except Exception:
            photo_rendered = False

    if not photo_rendered:
        # Fallback Initials Avatar Box
        c.setFillColor(colors.HexColor("#FEE2E2"))
        c.roundRect(photo_box_x + 2, photo_box_y + 2, photo_w - 4, photo_h - 4, 6, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#991B1B"))
        c.setFont("Helvetica-Bold", 24)
        initials = "".join([part[0] for part in name.split()[:2]]).upper() or "AKV"
        c.drawCentredString(photo_box_x + photo_w / 2.0, photo_box_y + photo_h / 2.0 - 8, initials)
        c.setFont("Helvetica", 6.5)
        c.setFillColor(colors.HexColor("#B91C1C"))
        c.drawCentredString(photo_box_x + photo_w / 2.0, photo_box_y + 8, "VERIFIED PHOTO")

    # 4. Details Beside Photo
    details_x = photo_box_x + photo_w + 14
    details_top_y = photo_box_y + photo_h - 2

    # Role Badge
    role_color = colors.HexColor("#B91C1C")
    if role == "VOLUNTEER":
        role_color = colors.HexColor("#DC2626")
    elif role == "PARTICIPANT":
        role_color = colors.HexColor("#059669")
    elif role == "SPECTATOR":
        role_color = colors.HexColor("#D97706")

    c.setFillColor(role_color)
    role_text = f"  {role}  "
    c.roundRect(details_x, details_top_y - 14, 88, 16, 4, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(details_x + 44, details_top_y - 10, role)

    # Volunteer Domain Tag if applicable
    if role == "VOLUNTEER" and volunteer_domain:
        c.setFillColor(colors.HexColor("#FEF3C7"))
        c.roundRect(details_x + 94, details_top_y - 14, 94, 16, 4, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#92400E"))
        c.setFont("Helvetica-Bold", 7.5)
        domain_str = volunteer_domain[:15]
        c.drawCentredString(details_x + 94 + 47, details_top_y - 10, domain_str)

    # Candidate Name
    c.setFillColor(colors.HexColor("#1C1917"))
    c.setFont("Helvetica-Bold", 12)
    display_name = name if len(name) <= 24 else name[:22] + "..."
    c.drawString(details_x, details_top_y - 32, display_name)

    # Monospace Reg ID Badge
    c.setFillColor(colors.HexColor("#B91C1C"))
    c.setFont("Courier-Bold", 10.5)
    c.drawString(details_x, details_top_y - 47, f"REG: {reg_id}")

    # AUID
    c.setFillColor(colors.HexColor("#374151"))
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(details_x, details_top_y - 61, f"AUID: {auid}")

    # Institute (truncated cleanly)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.setFont("Helvetica", 7.5)
    inst_display = institute if len(institute) <= 30 else institute[:28] + "..."
    c.drawString(details_x, details_top_y - 74, inst_display)

    # Dept & Sem/Sec
    c.setFont("Helvetica", 7.5)
    dept_display = department if len(department) <= 30 else department[:28] + "..."
    c.drawString(details_x, details_top_y - 85, dept_display)

    sem_sec = []
    if semester:
        sem_sec.append(f"Sem {semester}")
    if section:
        sem_sec.append(f"Sec {section}")
    if sem_sec:
        c.setFillColor(colors.HexColor("#6B7280"))
        c.drawString(details_x, details_top_y - 96, " • ".join(sem_sec))

    # 5. Middle Divider Line
    mid_divider_y = photo_box_y - 16
    c.setStrokeColor(colors.HexColor("#E5E7EB"))
    c.setLineWidth(1)
    c.line(20, mid_divider_y, card_width - 20, mid_divider_y)

    # 6. Verification QR Code Section (Bottom Left)
    qr_data = {
        "reg_id": reg_id,
        "name": name,
        "auid": auid,
        "role": role,
        "institute": institute,
        "dept": department,
        "email": email,
        "verified_by": "Acharya Kannada Vedike Nuditaranga 2026",
        "auth_sender": "akv@acharya.ac.in"
    }

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1,
    )
    qr.add_data(json.dumps(qr_data))
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#18181B", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)

    qr_x = 24
    qr_size = 96
    qr_y = mid_divider_y - qr_size - 12

    # QR Container Box
    c.setFillColor(colors.white)
    c.roundRect(qr_x - 3, qr_y - 3, qr_size + 6, qr_size + 6, 8, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#D1D5DB"))
    c.setLineWidth(1)
    c.roundRect(qr_x - 3, qr_y - 3, qr_size + 6, qr_size + 6, 8, fill=0, stroke=1)

    c.drawImage(ImageReader(qr_buf), qr_x, qr_y, width=qr_size, height=qr_size)

    c.setFillColor(colors.HexColor("#374151"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawCentredString(qr_x + qr_size / 2.0, qr_y - 10, "SCAN TO VERIFY IDENTITY")

    # 7. Credential Instructions & Details (Bottom Right)
    info_x = qr_x + qr_size + 16
    info_top_y = mid_divider_y - 18

    c.setFillColor(colors.HexColor("#1F2937"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(info_x, info_top_y, "Candidate Verification")

    c.setFont("Helvetica", 7.2)
    c.setFillColor(colors.HexColor("#4B5563"))
    lines = [
        f"• Status: ACTIVE & VERIFIED",
        f"• Email: {email[:24] if email else 'N/A'}",
        f"• Phone: {phone if phone else 'N/A'}",
        "• Desk Check-In: Mandatory",
        "• Valid for Fest: Nov 1-3, 2026",
        "• Issued: Official AKV Desk"
    ]
    cur_y = info_top_y - 14
    for line in lines:
        c.drawString(info_x, cur_y, line)
        cur_y -= 12.5

    # 8. Security Stamp & Official Footer
    footer_height = 36
    c.setFillColor(colors.HexColor("#B91C1C"))
    c.rect(13, 13, card_width - 26, footer_height, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#FDE047"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawCentredString(card_width / 2.0, 34, "ACHARYA INSTITUTES • SOLDEVANAHALLI, BENGALURU")

    c.setFillColor(colors.white)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(card_width / 2.0, 22, "Official e-ID Card • Sent from akv@acharya.ac.in • Non-Transferable")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
