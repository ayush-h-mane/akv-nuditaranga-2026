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
    path = Path(__file__).resolve().parents[3] / "frontend" / "public" / "images" / filename
    return path if path.exists() else None


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

def generate_candidate_id_card_pdf(data: Dict[str, Any]) -> bytes:
    """Generate a branded, printable official AKV candidate ID card PDF."""
    buffer = io.BytesIO()
    card_width = 360
    card_height = 560
    c = canvas.Canvas(buffer, pagesize=(card_width, card_height))

    name = str(data.get("name") or data.get("full_name") or "Candidate").strip()
    auid = str(data.get("auid") or data.get("usn") or "AIT-2026").strip().upper()
    reg_id = str(data.get("registration_id") or "AKV26001").strip().upper()
    role = str(data.get("role") or "PARTICIPANT").strip().upper()
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
    elif role == "SPECTATOR":
        role_color = colors.HexColor("#D97706")

    c.setFillColor(role_color)
    c.roundRect(details_x, details_top_y - 16, 104, 18, 5, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont(ENGLISH_BOLD_FONT, 8.5)
    c.drawCentredString(details_x + 52, details_top_y - 11, role)

    c.setFillColor(colors.HexColor(CARD_GOLD_LIGHT))
    c.roundRect(details_x, details_top_y - 42, content_right - details_x, 20, 5, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(CARD_RED_DARK))
    _draw_wrapped(c, volunteer_domain, details_x + 7, details_top_y - 35, content_right - details_x - 14, ENGLISH_BOLD_FONT, 7.5, 8, colors.HexColor(CARD_RED_DARK))

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
    sem_sec = " • ".join(value for value in (f"Semester {semester}" if semester else "", f"Section {section}" if section else "") if value)
    _draw_wrapped(c, sem_sec, content_left, detail_y - 2, content_right - content_left, ENGLISH_FONT, 8, 10, colors.HexColor(CARD_MUTED))

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
