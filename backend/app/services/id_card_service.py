import io
import json
import base64
import qrcode
import os
from pathlib import Path
from urllib.request import urlopen
from typing import Optional, Dict, Any
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image


CARD_RED = "#B91C1C"
CARD_RED_DARK = "#7F1D1D"
CARD_GOLD = "#F59E0B"
CARD_GOLD_LIGHT = "#FEF3C7"
CARD_CREAM = "#FFFBEB"
CARD_INK = "#292524"
CARD_MUTED = "#57534E"


def _register_pdf_fonts() -> tuple[str, str, str, str]:
    kannada_font = "Helvetica"
    kannada_bold_font = "Helvetica-Bold"
    english_font = "Helvetica"
    english_bold_font = "Helvetica-Bold"
    bundled_fonts = Path(__file__).resolve().parents[1] / "assets" / "fonts"
    font_specs = [
        ("AKVNotoKannada", bundled_fonts / "NotoSansKannada.ttf", 0),
        ("AKVOutfit", bundled_fonts / "Outfit.ttf", 0),
    ]
    for font_name, font_path, subfont_index in font_specs:
        if not font_path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont(font_name, str(font_path), subfontIndex=subfont_index))
            if font_name == "AKVNotoKannada":
                kannada_font = font_name
                kannada_bold_font = font_name
            else:
                english_font = font_name
                english_bold_font = font_name
        except Exception:
            continue

    if kannada_font == "Helvetica":
        nirmala_path = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "Nirmala.ttc"
        if nirmala_path.exists():
            try:
                pdfmetrics.registerFont(TTFont("AKVNirmala", str(nirmala_path), subfontIndex=0))
                kannada_font = "AKVNirmala"
                kannada_bold_font = "AKVNirmala"
            except Exception:
                pass

    return kannada_font, kannada_bold_font, english_font, english_bold_font


KANNADA_FONT, KANNADA_BOLD_FONT, ENGLISH_FONT, ENGLISH_BOLD_FONT = _register_pdf_fonts()


def _asset_path(filename: str) -> Optional[Path]:
    candidates = [
        Path(__file__).resolve().parents[3] / "frontend" / "public" / "images" / filename,
        Path(__file__).resolve().parents[3] / filename,
        Path(__file__).resolve().parents[1] / "assets" / "images" / filename,
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def _draw_image_contain(pdf: canvas.Canvas, image_path: Path, x: float, y: float, width: float, height: float) -> None:
    with Image.open(image_path) as image:
        image_width, image_height = image.size
    scale = min(width / image_width, height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    pdf.drawImage(
        ImageReader(str(image_path)),
        x + (width - draw_width) / 2,
        y + (height - draw_height) / 2,
        width=draw_width,
        height=draw_height,
        mask="auto",
    )


def _draw_image_cover(pdf: canvas.Canvas, image_bytes: bytes, x: float, y: float, width: float, height: float) -> None:
    with Image.open(io.BytesIO(image_bytes)) as source:
        image = source.convert("RGB")
        target_ratio = width / height
        source_ratio = image.width / image.height
        if source_ratio > target_ratio:
            crop_width = int(image.height * target_ratio)
            left = (image.width - crop_width) // 2
            image = image.crop((left, 0, left + crop_width, image.height))
        else:
            crop_height = int(image.width / target_ratio)
            top = (image.height - crop_height) // 2
            image = image.crop((0, top, image.width, top + crop_height))
        image_buffer = io.BytesIO()
        image.save(image_buffer, format="JPEG", quality=92)
    image_buffer.seek(0)
    pdf.drawImage(ImageReader(image_buffer), x, y, width=width, height=height)


def _draw_wrapped(pdf: canvas.Canvas, text: str, x: float, y: float, width: float, font: str, size: float, leading: float, color: colors.Color) -> float:
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    words = str(text or "--").split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and pdfmetrics.stringWidth(candidate, font, size) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    for line in lines or ["--"]:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def get_photo_bytes_for_pdf(photo_url: Optional[str]) -> Optional[bytes]:
    if not photo_url:
        return None

    try:
        if photo_url.startswith("data:image"):
            header, data = photo_url.split(",", 1)
            if "base64" in header.lower():
                return base64.b64decode(data)
            return data.encode("utf-8")

        if photo_url.startswith(("http://", "https://")):
            with urlopen(photo_url, timeout=15) as response:
                return response.read()

        return None
    except Exception:
        return None

def _generate_volunteer_id_card_pdf(data: Dict[str, Any]) -> bytes:
    """Generate official 2-page Front and Back ID Card PDF for AKV Nuditaranga 2026 Volunteers using Auid.png layout."""
    buffer = io.BytesIO()
    width = 360
    height = 540
    c = canvas.Canvas(buffer, pagesize=(width, height))

    name = str(data.get("name") or data.get("full_name") or "Volunteer Name").strip()
    auid = str(data.get("auid") or data.get("usn") or "AKV2026").strip().upper()
    reg_id = str(data.get("registration_id") or "AKVNT0046").strip().upper()
    role = "VOLUNTEER"
    institute = str(data.get("institute") or data.get("college") or "Acharya Institute of Technology").strip()
    department = str(data.get("department") or "Civil Engineering").strip()
    team = str(data.get("volunteer_domain") or data.get("team") or "Developer").strip()
    phone = str(data.get("phone") or data.get("contact") or "9900887766").strip()
    photo_url = data.get("photo_url")

    # =========================================================================
    # PAGE 1: FRONT SIDE (Auid.png Layout Design)
    # =========================================================================
    auid_template = _asset_path("auid-clean.png") or _asset_path("auid-template.png") or _asset_path("Auid.png")
    if auid_template:
        c.drawImage(ImageReader(str(auid_template)), 0, 0, width=width, height=height)
    else:
        # Fallback warm cream background and header if template asset is missing
        c.setFillColor(colors.HexColor("#FFFDF7"))
        c.rect(0, 0, width, height, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#991B1B"))
        c.setFont(KANNADA_BOLD_FONT, 12)
        c.drawCentredString(width / 2.0, height - 40, "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ")

    # 1. Volunteer Photo Frame & Clipping
    photo_x = width * (305 / 853.0)
    photo_w = width * (232 / 853.0)
    photo_top = height * (370 / 1280.0)
    photo_h = height * (246 / 1280.0)
    photo_y = height - photo_top - photo_h

    c.saveState()
    clip_p = c.beginPath()
    clip_p.roundRect(photo_x, photo_y, photo_w, photo_h, 12)
    c.clipPath(clip_p, stroke=0, fill=0)

    photo_rendered = False
    img_bytes = get_photo_bytes_for_pdf(photo_url)
    if img_bytes:
        try:
            _draw_image_cover(c, img_bytes, photo_x, photo_y, photo_w, photo_h)
            photo_rendered = True
        except Exception:
            photo_rendered = False

    if not photo_rendered:
        nograj_path = _asset_path("nograj.png")
        if nograj_path and ("nograj" in name.lower() or not photo_url):
            try:
                _draw_image_cover(c, open(nograj_path, "rb").read(), photo_x, photo_y, photo_w, photo_h)
                photo_rendered = True
            except Exception:
                photo_rendered = False

    if not photo_rendered:
        c.setFillColor(colors.HexColor("#FEE2E2"))
        c.roundRect(photo_x, photo_y, photo_w, photo_h, 12, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#991B1B"))
        c.setFont(ENGLISH_BOLD_FONT, 24)
        initials = "".join([part[0] for part in name.split()[:2]]).upper() or "AKV"
        c.drawCentredString(photo_x + photo_w / 2.0, photo_y + photo_h / 2.0 - 8, initials)
    c.restoreState()

    # 2. Volunteer Name
    name_y = height - (height * (670 / 1280.0))
    c.setFont(ENGLISH_BOLD_FONT, 15)
    c.setFillColor(colors.HexColor("#5A1212"))
    c.drawCentredString(width / 2.0, name_y, name)

    # 3. Details Box Values (Aligned inside template fields)
    val_x = width * (260 / 853.0)

    # Row 1: AUID
    auid_y = height - (height * (824 / 1280.0))
    c.setFont(ENGLISH_BOLD_FONT, 9.5)
    c.setFillColor(colors.HexColor("#111827"))
    c.drawString(val_x, auid_y, auid)

    # Row 2: Institute
    inst_y = height - (height * (880 / 1280.0))
    c.setFont(ENGLISH_BOLD_FONT, 8.5)
    c.drawString(val_x, inst_y, institute)

    # Row 3: Domain
    dom_y = height - (height * (934 / 1280.0))
    c.setFont(ENGLISH_BOLD_FONT, 9.5)
    c.drawString(val_x, dom_y, team)

    # =========================================================================
    # PAGE 2: BACK SIDE
    # =========================================================================
    c.showPage()

    # 1. Background
    c.setFillColor(colors.HexColor("#FFFDF7"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # 2. Top Branding
    acharya_logo = _asset_path("acharya-logo.png")
    if acharya_logo:
        _draw_image_contain(c, acharya_logo, (width - 30) / 2.0, height - 50, 30, 30)

    c.setFillColor(colors.HexColor("#991B1B"))
    c.setFont(KANNADA_BOLD_FONT, 10.5)
    c.drawCentredString(width / 2.0, height - 64, "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ")
    c.setFillColor(colors.HexColor("#44403C"))
    c.setFont(ENGLISH_BOLD_FONT, 7.5)
    c.drawCentredString(width / 2.0, height - 75, "ACHARYA KANNADA VEDIKE")

    c.setFillColor(colors.HexColor("#991B1B"))
    c.setFont(ENGLISH_BOLD_FONT, 17)
    c.drawCentredString(width / 2.0, height - 94, "NUDITARANGA")

    c.setStrokeColor(colors.HexColor("#B91C1C"))
    c.setLineWidth(1)
    c.line(125, height - 104, 160, height - 104)
    c.setFont(ENGLISH_BOLD_FONT, 9.5)
    c.drawCentredString(width / 2.0, height - 107, "2026")
    c.line(200, height - 104, 235, height - 104)

    # 3. QR Code & Verification
    qr_payload = json.dumps({
        "type": "AKV_VOLUNTEER_ID",
        "reg_id": reg_id,
        "auid": auid,
        "name": name,
        "institute": institute,
        "domain": team,
        "role": role,
        "contact": phone,
        "verified_by": "Acharya Kannada Vedike Nuditaranga 2026"
    })
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=4, border=1)
    qr.add_data(qr_payload)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#18181B", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)

    qr_size = 100
    qr_x = 24
    qr_y = height - 228

    c.setFillColor(colors.white)
    c.roundRect(qr_x - 3, qr_y - 3, qr_size + 6, qr_size + 6, 8, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#18181B"))
    c.setLineWidth(1.5)
    c.roundRect(qr_x - 3, qr_y - 3, qr_size + 6, qr_size + 6, 8, fill=0, stroke=1)
    c.drawImage(ImageReader(qr_buf), qr_x, qr_y, width=qr_size, height=qr_size)

    # Registration ID pill below QR
    c.setFillColor(colors.HexColor("#F3F4F6"))
    c.roundRect(qr_x + 6, qr_y - 18, qr_size - 12, 15, 3.5, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#D1D5DB"))
    c.roundRect(qr_x + 6, qr_y - 18, qr_size - 12, 15, 3.5, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#111827"))
    c.setFont(ENGLISH_BOLD_FONT, 8)
    c.drawCentredString(qr_x + qr_size / 2.0, qr_y - 14.5, reg_id)

    # 4. Structured Info Table on Right
    info_x = 142
    start_y = height - 138
    fields = [
        ("Name", name),
        ("AUID", auid),
        ("Institute", institute),
        ("Domain", team),
        ("Role", "ಸ್ವಯಂಸೇವಕ (Volunteer)"),
        ("Contact", phone),
    ]

    row_y = start_y
    for label, val in fields:
        c.setFillColor(colors.HexColor("#4B5563"))
        c.setFont(ENGLISH_BOLD_FONT, 8)
        c.drawString(info_x, row_y, f"{label:10}:")

        c.setFillColor(colors.HexColor("#991B1B") if "Role" in label else colors.HexColor("#111827"))
        c.setFont(KANNADA_BOLD_FONT if "Role" in label else (ENGLISH_BOLD_FONT if label in ("Name", "Domain") else ENGLISH_FONT), 8)
        c.drawString(info_x + 56, row_y, str(val))
        row_y -= 16

    # 5. Important Information Callout Box
    box_x = 22
    box_w = width - 44
    box_h = 96
    box_y = 100

    c.setFillColor(colors.HexColor("#FFFBEB"))
    c.roundRect(box_x, box_y, box_w, box_h, 12, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#FECACA"))
    c.setLineWidth(1)
    c.roundRect(box_x, box_y, box_w, box_h, 12, fill=0, stroke=1)

    c.setFillColor(colors.HexColor("#B91C1C"))
    c.setFont(ENGLISH_BOLD_FONT, 9)
    c.drawString(box_x + 14, box_y + box_h - 16, "Important Information")

    rules = [
        "• This ID card is non-transferable.",
        "• Wear this card at all times inside the event premises.",
        "• Use QR code for quick verification.",
        "• In case of emergency, contact the given number."
    ]
    rule_y = box_y + box_h - 32
    c.setFont(ENGLISH_FONT, 7.5)
    c.setFillColor(colors.HexColor("#374151"))
    for rule in rules:
        c.drawString(box_x + 14, rule_y, rule)
        rule_y -= 15

    # 6. Temple Silhouette Skyline & Motto Ribbon
    sky_y = 26
    c.setFillColor(colors.HexColor("#991B1B"))
    sky_p = c.beginPath()
    sky_p.moveTo(0, sky_y)
    for x_step in range(0, width, 24):
        sky_p.lineTo(x_step, sky_y + 10)
        sky_p.lineTo(x_step + 6, sky_y + 20)
        sky_p.lineTo(x_step + 12, sky_y + 35)
        sky_p.lineTo(x_step + 18, sky_y + 20)
        sky_p.lineTo(x_step + 24, sky_y + 10)
    sky_p.lineTo(width, sky_y)
    sky_p.close()
    c.drawPath(sky_p, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#7F1D1D"))
    c.rect(0, 0, width, sky_y, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#F59E0B"))
    c.setLineWidth(1.5)
    c.line(0, sky_y, width, sky_y)

    c.setFillColor(colors.HexColor("#FFFDF7"))
    c.setFont(KANNADA_BOLD_FONT, 9)
    c.drawCentredString(width / 2.0, 8, "ನಮ್ಮ ನಾಡು  |  ನಮ್ಮ ಭಾಷೆ  |  ನಮ್ಮ ಹೆಮ್ಮೆ")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def generate_candidate_id_card_pdf(data: Dict[str, Any]) -> bytes:
    """Generate a branded, printable official AKV candidate or volunteer ID card PDF."""
    role = str(data.get("role") or "PARTICIPANT").strip().upper()
    has_volunteer_domain = bool(data.get("volunteer_domain") and data.get("volunteer_domain") not in ("Not Assigned", "General"))
    if role == "VOLUNTEER" or has_volunteer_domain:
        return _generate_volunteer_id_card_pdf(data)

    buffer = io.BytesIO()
    card_width = 360
    card_height = 560
    c = canvas.Canvas(buffer, pagesize=(card_width, card_height))

    name = str(data.get("name") or data.get("full_name") or "Candidate").strip()
    auid = str(data.get("auid") or data.get("usn") or "AIT-2026").strip().upper()
    reg_id = str(data.get("registration_id") or "AKV26001").strip().upper()
    institute = str(data.get("institute") or "Acharya Institute of Technology").strip()
    department = str(data.get("department") or "Information Science & Engineering").strip()
    semester = str(data.get("semester") or "").strip()
    section = str(data.get("section") or "").strip().upper()
    volunteer_domain = str(data.get("volunteer_domain") or data.get("akv_domain") or "Not Assigned").strip()
    photo_url = data.get("photo_url")

    c.setFillColor(colors.HexColor(CARD_CREAM))
    c.rect(0, 0, card_width, card_height, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FEF3C7"))
    c.circle(card_width - 18, card_height - 26, 78, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FDE68A"))
    c.circle(12, 158, 58, fill=1, stroke=0)

    c.setStrokeColor(colors.HexColor(CARD_RED))
    c.setLineWidth(3)
    c.roundRect(9, 9, card_width - 18, card_height - 18, 18, fill=0, stroke=1)
    c.setStrokeColor(colors.HexColor(CARD_GOLD))
    c.setLineWidth(1)
    c.roundRect(14, 14, card_width - 28, card_height - 28, 14, fill=0, stroke=1)

    header_y = card_height - 128
    c.setFillColor(colors.HexColor(CARD_RED))
    c.roundRect(15, header_y, card_width - 30, 113, 14, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(CARD_GOLD))
    c.rect(15, header_y, card_width - 30, 5, fill=1, stroke=0)

    acharya_logo = _asset_path("acharya-logo-white.png")
    akv_logo = _asset_path("akv-logo.png")
    if acharya_logo:
        _draw_image_contain(c, acharya_logo, 34, header_y + 32, 34, 50)
    if akv_logo:
        _draw_image_contain(c, akv_logo, card_width - 68, header_y + 32, 34, 50)

    c.setFillColor(colors.HexColor("#FEF08A"))
    c.setFont(KANNADA_BOLD_FONT, 11)
    c.drawCentredString(card_width / 2, card_height - 52, "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ")
    c.setFont(KANNADA_BOLD_FONT, 10)
    c.drawCentredString(card_width / 2, card_height - 72, "ನುಡಿತರಂಗ ೨೦೨೬")
    c.setFont(KANNADA_FONT, 8.5)
    c.setFillColor(colors.HexColor("#FFEDD5"))
    c.drawCentredString(card_width / 2, card_height - 91, "ಅಧಿಕೃತ ಗುರುತಿನ ಚೀಟಿ")

    content_left = 28
    content_right = card_width - 28
    photo_box_x = content_left
    photo_box_y = 292
    photo_w = 104
    photo_h = 132

    c.setFillColor(colors.white)
    c.roundRect(photo_box_x, photo_box_y, photo_w, photo_h, 9, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor(CARD_RED))
    c.setLineWidth(2)
    c.roundRect(photo_box_x, photo_box_y, photo_w, photo_h, 9, fill=0, stroke=1)

    photo_rendered = False
    img_bytes = get_photo_bytes_for_pdf(photo_url)
    if img_bytes:
        try:
            _draw_image_cover(c, img_bytes, photo_box_x + 3, photo_box_y + 3, photo_w - 6, photo_h - 6)
            photo_rendered = True
        except Exception:
            photo_rendered = False

    if not photo_rendered:
        # Fallback Initials Avatar Box
        c.setFillColor(colors.HexColor("#FEE2E2"))
        c.roundRect(photo_box_x + 2, photo_box_y + 2, photo_w - 4, photo_h - 4, 6, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#991B1B"))
        c.setFont(ENGLISH_BOLD_FONT, 24)
        initials = "".join([part[0] for part in name.split()[:2]]).upper() or "AKV"
        c.drawCentredString(photo_box_x + photo_w / 2.0, photo_box_y + photo_h / 2.0 - 8, initials)
        c.setFont(ENGLISH_FONT, 6.5)
        c.setFillColor(colors.HexColor("#B91C1C"))
        c.drawCentredString(photo_box_x + photo_w / 2.0, photo_box_y + 8, "VERIFIED PHOTO")

    details_x = photo_box_x + photo_w + 14
    details_top_y = photo_box_y + photo_h - 2

    role_color = colors.HexColor("#B91C1C")
    if role == "VOLUNTEER":
        role_color = colors.HexColor("#DC2626")
    elif role == "PARTICIPANT":
        role_color = colors.HexColor("#059669")

    c.setFillColor(role_color)
    c.roundRect(details_x, details_top_y - 16, 104, 18, 5, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont(ENGLISH_BOLD_FONT, 8.5)
    c.drawCentredString(details_x + 52, details_top_y - 11, role)

    c.setFillColor(colors.HexColor(CARD_GOLD_LIGHT))
    c.roundRect(details_x, details_top_y - 42, content_right - details_x, 20, 5, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(CARD_RED_DARK))
    badge_label = str(data.get("event_title") or volunteer_domain).strip()
    _draw_wrapped(c, badge_label, details_x + 7, details_top_y - 35, content_right - details_x - 14, ENGLISH_BOLD_FONT, 7.5, 8, colors.HexColor(CARD_RED_DARK))

    c.setFillColor(colors.HexColor("#1C1917"))
    c.setFont(ENGLISH_BOLD_FONT, 14)
    _draw_wrapped(c, name, details_x, details_top_y - 62, content_right - details_x, ENGLISH_BOLD_FONT, 14, 16, colors.HexColor(CARD_INK))

    c.setFillColor(colors.HexColor("#B91C1C"))
    c.setFont(ENGLISH_BOLD_FONT, 10.5)
    c.drawString(details_x, details_top_y - 100, f"REG ID: {reg_id}")
    c.setFillColor(colors.HexColor("#374151"))
    c.setFont(ENGLISH_BOLD_FONT, 9.5)
    c.drawString(details_x, details_top_y - 114, f"AUID: {auid}")

    detail_y = 266
    c.setFillColor(colors.HexColor(CARD_MUTED))
    detail_y = _draw_wrapped(c, f"Institute: {institute}", content_left, detail_y, content_right - content_left, ENGLISH_BOLD_FONT, 8.5, 11, colors.HexColor(CARD_MUTED))
    detail_y = _draw_wrapped(c, f"Department: {department}", content_left, detail_y - 2, content_right - content_left, ENGLISH_BOLD_FONT, 8.5, 11, colors.HexColor(CARD_MUTED))
    
    event_info = f"Date: {data.get('event_date')} • {data.get('venue')}" if data.get("event_date") else ""
    if event_info:
        detail_y = _draw_wrapped(c, event_info, content_left, detail_y - 2, content_right - content_left, ENGLISH_BOLD_FONT, 7.5, 10, colors.HexColor("#B91C1C"))
    else:
        year_text = f"Year {semester}" if semester else ""
        if year_text:
            _draw_wrapped(c, year_text, content_left, detail_y - 2, content_right - content_left, ENGLISH_FONT, 8, 10, colors.HexColor(CARD_MUTED))

    c.setStrokeColor(colors.HexColor("#E7E5E4"))
    c.setLineWidth(1)
    c.line(content_left, 246, content_right, 246)

    qr_data = {
        "reg_id": reg_id,
        "name": name,
        "auid": auid,
        "role": role,
        "akv_domain": volunteer_domain,
        "institute": institute,
        "dept": department,
        "event": data.get("event_title") or data.get("event_id"),
        "verified_by": "Acharya Kannada Vedike Nuditaranga 2026",
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

    qr_size = 130
    qr_x = (card_width - qr_size) / 2
    qr_y = 94

    c.setFillColor(colors.white)
    c.roundRect(qr_x - 3, qr_y - 3, qr_size + 6, qr_size + 6, 8, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#D1D5DB"))
    c.setLineWidth(1)
    c.roundRect(qr_x - 3, qr_y - 3, qr_size + 6, qr_size + 6, 8, fill=0, stroke=1)

    c.drawImage(ImageReader(qr_buf), qr_x, qr_y, width=qr_size, height=qr_size)

    c.setFillColor(colors.HexColor(CARD_RED_DARK))
    c.setFont(KANNADA_BOLD_FONT, 7.5)
    c.drawCentredString(qr_x + qr_size / 2.0, qr_y - 11, "ಪರಿಶೀಲಿಸಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ")

    c.setFillColor(colors.HexColor(CARD_RED))
    c.roundRect(15, 22, card_width - 30, 43, 12, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FDE68A"))
    c.setFont(KANNADA_FONT, 7.5)
    c.drawCentredString(card_width / 2.0, 47, "ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ಸ್ • ಸೋಲದೇವನಹಳ್ಳಿ, ಬೆಂಗಳೂರು")
    c.setFillColor(colors.white)
    c.setFont(KANNADA_FONT, 7)
    c.drawCentredString(card_width / 2.0, 34, "ಅಧಿಕೃತ ಗುರುತಿನ ಚೀಟಿ • ವರ್ಗಾಯಿಸಲಾಗದು")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
