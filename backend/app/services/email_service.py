import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Dict, Any, Optional
from ..config import settings
from .id_card_service import generate_candidate_id_card_pdf

# In-memory debug mail log for local testing without active SMTP
DEBUG_EMAIL_OUTBOX: List[Dict[str, Any]] = []

def get_email_styles() -> str:
    return """
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #1c1917;
        background-color: #fafaf9;
        margin: 0;
        padding: 0;
    """

def wrap_email_html(title: str, content: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
    </head>
    <body style="{get_email_styles()}">
        <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #fed7aa;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #f59e0b 100%); padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ (AKV)</h1>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #fef08a; font-weight: 600;">ನುಡಿತರಂಗ ೨೦೨೬ • Acharya Kannada Vedike</p>
            </div>
            <!-- Body -->
            <div style="padding: 28px 24px;">
                {content}
            </div>
            <!-- Footer -->
            <div style="background-color: #f5f5f4; padding: 18px 24px; text-align: center; border-top: 1px solid #e7e5e4; font-size: 12px; color: #78716c;">
                <p style="margin: 0 0 6px 0;"><strong>Acharya Kannada Vedike (AKV)</strong> • Acharya Institutes, Bengaluru</p>
                <p style="margin: 0;">This is an automated system email. For queries, contact <a href="mailto:{settings.EMAIL_FROM}" style="color: #b91c1c; text-decoration: none;">{settings.EMAIL_FROM}</a></p>
            </div>
        </div>
    </body>
    </html>
    """

_RELAY_ROTATION_INDEX: int = 0

def get_smtp_relays() -> List[Dict[str, Any]]:
    """
    Returns the list of active configured SMTP relays for multi-account load balancing.
    Combining 2 free Brevo accounts gives 600 emails/day; 3 gives 900 emails/day.
    """
    relays = []
    # Primary Relay
    if settings.SMTP_HOST and settings.SMTP_HOST.strip():
        relays.append({
            "name": "Relay 1 (Primary)",
            "host": settings.SMTP_HOST.strip(),
            "port": settings.SMTP_PORT,
            "username": settings.SMTP_USERNAME.strip(),
            "password": settings.SMTP_PASSWORD.strip()
        })
    # Secondary Relay
    if settings.SMTP_HOST_2 and settings.SMTP_HOST_2.strip():
        relays.append({
            "name": "Relay 2 (Secondary)",
            "host": settings.SMTP_HOST_2.strip(),
            "port": settings.SMTP_PORT_2,
            "username": settings.SMTP_USERNAME_2.strip(),
            "password": settings.SMTP_PASSWORD_2.strip()
        })
    # Tertiary Relay
    if settings.SMTP_HOST_3 and settings.SMTP_HOST_3.strip():
        relays.append({
            "name": "Relay 3 (Tertiary)",
            "host": settings.SMTP_HOST_3.strip(),
            "port": settings.SMTP_PORT_3,
            "username": settings.SMTP_USERNAME_3.strip(),
            "password": settings.SMTP_PASSWORD_3.strip()
        })
    return relays

def send_via_relay(relay: Dict[str, Any], msg: MIMEMultipart, to_email: str) -> None:
    """Dispatches a MIME message through a designated SMTP relay server."""
    host = relay["host"]
    port = relay["port"]
    username = relay["username"]
    password = relay["password"]

    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        try:
            server.starttls()
        except Exception as tls_err:
            print(f"[{relay['name']} TLS NOTICE] {tls_err}")

    if username and password:
        server.login(username, password)

    server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
    server.quit()

def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = "",
    attachments: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Sends an email using configured SMTP server pool with automatic round-robin rotation
    and seamless failover (e.g. 2 Brevo accounts = 600 free emails/day).
    Supports binary attachments (e.g. PDF ID cards).
    """
    global _RELAY_ROTATION_INDEX

    record = {
        "to": to_email,
        "subject": subject,
        "html": html_content,
        "text": text_content,
        "from": settings.EMAIL_FROM,
        "attachments": [
            {"filename": a.get("filename", "document.pdf"), "size": len(a.get("content", b""))}
            for a in (attachments or [])
        ]
    }
    DEBUG_EMAIL_OUTBOX.append(record)

    relays = get_smtp_relays()

    # If no SMTP host configured, print debug summary and notice
    if not relays:
        att_str = f" [Attached: {', '.join(a['filename'] for a in record['attachments'])}]" if record["attachments"] else ""
        print(f"\n[EMAIL DISPATCH - DEV SIMULATION (REAL SMTP UNCONFIGURED)]{att_str}")
        print(f"To: {to_email}")
        print(f"From: {settings.EMAIL_FROM}")
        print(f"Subject: {subject}")
        print(f"Summary: {text_content[:200]}...")
        print(f"[EMAIL WARNING] No SMTP relays configured. Configure SMTP_HOST in .env.")
        return True

    # Assemble MIME Message
    if attachments:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = to_email
        msg["Reply-To"] = settings.EMAIL_FROM

        body_part = MIMEMultipart("alternative")
        if text_content:
            body_part.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            body_part.attach(MIMEText(html_content, "html", "utf-8"))
        msg.attach(body_part)

        for att in attachments:
            filename = att.get("filename", "document.pdf")
            content = att.get("content", b"")
            part = MIMEApplication(content, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)
    else:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = to_email
        msg["Reply-To"] = settings.EMAIL_FROM

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Multi-Relay Rotation: Round-robin across relays
    start_idx = _RELAY_ROTATION_INDEX % len(relays)
    _RELAY_ROTATION_INDEX += 1

    attempts = [relays[(start_idx + i) % len(relays)] for i in range(len(relays))]
    last_err = None

    for relay in attempts:
        try:
            send_via_relay(relay, msg, to_email)
            print(f"[EMAIL DISPATCH] Successfully delivered live email to {to_email} via {relay['name']} ({relay['username'] or relay['host']})")
            return True
        except Exception as e:
            last_err = e
            print(f"[EMAIL RELAY ERROR] {relay['name']} ({relay['username'] or relay['host']}) failed: {type(e).__name__}: {e}")
            if len(attempts) > 1:
                print(f"[EMAIL FAILOVER] Attempting delivery through next relay in pool...")

    print(f"[EMAIL ERROR] All {len(relays)} SMTP relays failed to deliver email to {to_email}: {last_err}")
    return False

# High-Level Email Dispatchers

def send_student_welcome_email(
    to_email: str,
    student_name: str,
    auid: str,
    role: str,
    registration_id: str,
    candidate_data: Optional[Dict[str, Any]] = None,
    id_card_pdf_bytes: Optional[bytes] = None
):
    """
    Sends automated confirmation email with registration details and official Candidate ID Card PDF.
    Dispatched officially from akv@acharya.ac.in.
    """
    subject = "AKV Nuditaranga 2026 – Registration Confirmation & Candidate ID Card"

    data = candidate_data or {}
    institute = data.get("institute") or "Acharya Institute of Technology"
    department = data.get("department") or ""
    semester = data.get("semester")
    section = data.get("section") or ""
    phone = data.get("phone") or ""
    volunteer_domain = data.get("volunteer_domain")

    # Generate ID Card PDF if not already provided
    if not id_card_pdf_bytes:
        try:
            pdf_payload = {
                "name": student_name,
                "auid": auid,
                "registration_id": registration_id,
                "role": role,
                "institute": institute,
                "department": department,
                "semester": semester,
                "section": section,
                "email": to_email,
                "phone": phone,
                "volunteer_domain": volunteer_domain,
                "photo_url": data.get("photo_url")
            }
            id_card_pdf_bytes = generate_candidate_id_card_pdf(pdf_payload)
        except Exception as e:
            print(f"[PDF GENERATION WARNING] Failed to generate ID card PDF: {e}")
            id_card_pdf_bytes = None

    attachments = []
    if id_card_pdf_bytes:
        attachments.append({
            "filename": f"AKV_ID_Card_{registration_id}.pdf",
            "content": id_card_pdf_bytes,
            "mime_type": "application/pdf"
        })

    domain_html = f'<p style="margin: 0 0 8px 0;"><strong>Volunteer Domain:</strong> <span style="font-weight: bold; color: #b45309;">{volunteer_domain}</span></p>' if (role == "VOLUNTEER" and volunteer_domain) else ""
    academic_html = f'<p style="margin: 0 0 8px 0;"><strong>Institute & Dept:</strong> {institute} • {department} {f"(Sem {semester} - {section})" if semester else ""}</p>' if department else ""

    content = f"""
        <h2 style="color: #b91c1c; margin-top: 0;">ನಮಸ್ಕಾರ {student_name}, Registration Confirmed!</h2>
        <p>Your registration for <strong>Acharya Kannada Vedike (AKV) – Nuditaranga 2026</strong> has been confirmed successfully.</p>
        
        <!-- Registration Details Card -->
        <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #854d0e; border-bottom: 1px solid #fef08a; pb: 6px;">
                📋 Official Registration Details:
            </p>
            <p style="margin: 0 0 8px 0;"><strong>Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #b91c1c;">{registration_id}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Candidate Name:</strong> {student_name}</p>
            <p style="margin: 0 0 8px 0;"><strong>AUID / USN:</strong> <span style="font-family: monospace; font-weight: bold;">{auid}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Registered Role:</strong> <span style="display: inline-block; background-color: #b91c1c; color: white; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">{role}</span></p>
            {domain_html}
            {academic_html}
            <p style="margin: 0;"><strong>Portal Login:</strong> Access your Student Dashboard anytime using your AUID and password.</p>
        </div>

        <!-- ID Card PDF Attachment Banner -->
        <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🪪</span>
                <div>
                    <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #166534;">Official Candidate ID Card (PDF) Attached</h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #15803d;">
                        Your personalized Festival ID Card (with verification QR code) has been generated and attached as <strong>AKV_ID_Card_{registration_id}.pdf</strong>.
                    </p>
                </div>
            </div>
            <ul style="margin: 10px 0 0 0; padding-left: 24px; font-size: 12px; color: #14532d;">
                <li>Please download and save the attached PDF on your smartphone.</li>
                <li>Display this digital pass or a printed copy at campus entry gates and desk check-in counters.</li>
            </ul>
        </div>

        <p style="color: #57534e; font-size: 14px; line-height: 1.5;">
            { 'As an official volunteer, your profile has been added to the Volunteer Coordination roster. Please check your dashboard for briefing schedules.' if role == 'VOLUNTEER' else 'You can now browse events, register for cultural competitions, and view your digital event passes inside your Student Dashboard.' }
        </p>

        <div style="text-align: center; margin-top: 26px;">
            <a href="{settings.FRONTEND_URL}" style="background: linear-gradient(135deg, #b91c1c, #dc2626); color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 3px 8px rgba(185, 28, 28, 0.3);">Login to Candidate Portal</a>
        </div>
    """
    text = f"Welcome {student_name}! Your registration for AKV Nuditaranga 2026 is confirmed. Reg ID: {registration_id}, AUID: {auid}, Role: {role}. Your official Candidate ID Card PDF is attached (AKV_ID_Card_{registration_id}.pdf). Sent from {settings.EMAIL_FROM}."
    html = wrap_email_html(subject, content)
    return send_email(to_email, subject, html, text, attachments=attachments)

def send_event_registration_confirmation_email(
    to_email: str,
    participant_name: str,
    auid: str,
    event_title: str,
    registration_id: str,
    institute: str = "",
    department: str = "",
    is_team: bool = False,
    team_name: Optional[str] = None,
    candidate_data: Optional[Dict[str, Any]] = None,
    id_card_pdf_bytes: Optional[bytes] = None
):
    """
    Sends automated confirmation email when a participant registers for an event.
    Includes full registration details and attached ID Card / Event Pass PDF.
    Dispatched from akv@acharya.ac.in.
    """
    subject = f"AKV Nuditaranga 2026 – Event Registration Confirmed: {event_title}"

    data = candidate_data or {}
    # Generate ID Card PDF if not already provided
    if not id_card_pdf_bytes:
        try:
            pdf_payload = {
                "name": participant_name,
                "auid": auid,
                "registration_id": registration_id,
                "role": "PARTICIPANT",
                "institute": institute or data.get("institute") or "Acharya Institute of Technology",
                "department": department or data.get("department") or "Department",
                "semester": data.get("semester"),
                "section": data.get("section") or "",
                "email": to_email,
                "phone": data.get("phone") or "",
                "photo_url": data.get("photo_url")
            }
            id_card_pdf_bytes = generate_candidate_id_card_pdf(pdf_payload)
        except Exception as e:
            print(f"[PDF GENERATION WARNING] Failed to generate Event Pass PDF: {e}")
            id_card_pdf_bytes = None

    attachments = []
    if id_card_pdf_bytes:
        attachments.append({
            "filename": f"AKV_Pass_{registration_id}.pdf",
            "content": id_card_pdf_bytes,
            "mime_type": "application/pdf"
        })

    team_html = f'<p style="margin: 0 0 8px 0;"><strong>Team Name:</strong> {team_name} (Group Event)</p>' if is_team and team_name else ""

    content = f"""
        <h2 style="color: #b91c1c; margin-top: 0;">Event Registration Confirmed!</h2>
        <p>Hello <strong>{participant_name}</strong>,</p>
        <p>You have successfully registered for <strong>{event_title}</strong> at <strong>Acharya Kannada Vedike (AKV) – Nuditaranga 2026</strong>.</p>
        
        <!-- Registration Details Card -->
        <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #854d0e; border-bottom: 1px solid #fef08a; padding-bottom: 6px;">
                🎟️ Event Pass Details:
            </p>
            <p style="margin: 0 0 8px 0;"><strong>Event:</strong> <span style="font-weight: bold; color: #b91c1c;">{event_title}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Pass / Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #b91c1c;">{registration_id}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Participant:</strong> {participant_name}</p>
            <p style="margin: 0 0 8px 0;"><strong>AUID / USN:</strong> <span style="font-family: monospace; font-weight: bold;">{auid}</span></p>
            {team_html}
            {f'<p style="margin: 0 0 8px 0;"><strong>Institute & Dept:</strong> {institute} • {department}</p>' if department else ""}
            <p style="margin: 0;"><strong>Reporting:</strong> Please report 30 minutes prior to event commencement at the designated campus venue.</p>
        </div>

        <!-- ID Card PDF Attachment Banner -->
        <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🪪</span>
                <div>
                    <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #166534;">Official Event Pass & Candidate ID Card Attached</h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #15803d;">
                        Your verified Event Pass & ID Card PDF is attached as <strong>AKV_Pass_{registration_id}.pdf</strong>.
                    </p>
                </div>
            </div>
            <ul style="margin: 10px 0 0 0; padding-left: 24px; font-size: 12px; color: #14532d;">
                <li>Keep the attached PDF on your phone for quick QR code verification at the desk.</li>
                <li>Valid for festival entry across all cultural stages during Nuditaranga 2026.</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 26px;">
            <a href="{settings.FRONTEND_URL}" style="background: linear-gradient(135deg, #b91c1c, #dc2626); color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">View My Event Passes</a>
        </div>
    """
    text = f"Registration confirmed for {event_title}! Reg ID: {registration_id}, Participant: {participant_name}, AUID: {auid}. Official Pass PDF attached (AKV_Pass_{registration_id}.pdf). Sent from {settings.EMAIL_FROM}."
    html = wrap_email_html(subject, content)
    return send_email(to_email, subject, html, text, attachments=attachments)

def send_password_reset_email(to_email: str, student_name: str, reset_link: str, expires_minutes: int = 10):
    subject = "AKV Nuditaranga 2026 – Password Reset (Valid for 10 Minutes)"
    content = f"""
        <h2 style="color: #b91c1c; margin-top: 0;">Password Reset Request</h2>
        <p>Hello <strong>{student_name}</strong>,</p>
        <p>We received a request to reset the password for your Acharya Kannada Vedike account associated with this email address.</p>
        
        <div style="text-align: center; margin: 28px 0;">
            <a href="{reset_link}" style="background-color: #b91c1c; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 2px 6px rgba(185, 28, 28, 0.3);">Reset My Password</a>
        </div>

        <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #9a3412;">
            <p style="margin: 0 0 6px 0;"><strong>Security Notice:</strong></p>
            <ul style="margin: 0; padding-left: 18px;">
                <li>This link will expire in <strong>{expires_minutes} minutes</strong>.</li>
                <li>This link is single-use and will become invalid once used.</li>
                <li>Sent officially from <strong>{settings.EMAIL_FROM}</strong> for your account security.</li>
                <li>If you did not request this password reset, please ignore this email or notify the AKV team immediately.</li>
            </ul>
        </div>

        <p style="font-size: 12px; color: #78716c; word-break: break-all;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{reset_link}" style="color: #b91c1c;">{reset_link}</a>
        </p>
    """
    text = f"Hello {student_name}, reset your AKV account password using this link (expires in {expires_minutes} mins): {reset_link}. Sent officially from {settings.EMAIL_FROM}."
    html = wrap_email_html(subject, content)
    return send_email(to_email, subject, html, text)

def send_admin_registration_email(to_email: str, admin_name: str, username: str):
    subject = "AKV Nuditaranga 2026 – Admin Registration Submitted"
    content = f"""
        <h2 style="color: #b91c1c; margin-top: 0;">Admin Account Awaiting Approval</h2>
        <p>Hello <strong>{admin_name}</strong>,</p>
        <p>Your administrator registration for <strong>Acharya Kannada Vedike (AKV)</strong> with username <strong>{username}</strong> has been received.</p>
        
        <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Account Status:</strong> <span style="background-color: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">PENDING APPROVAL</span></p>
            <p style="margin: 0;">In accordance with AKV security protocols, your account is awaiting Super Admin verification. You will be notified by email once approved.</p>
        </div>
    """
    text = f"Hello {admin_name}, your admin registration with username {username} is awaiting Super Admin approval."
    html = wrap_email_html(subject, content)
    return send_email(to_email, subject, html, text)

def send_superadmin_new_admin_alert(superadmin_email: str, admin_name: str, username: str, admin_email: str, department: str):
    subject = "Action Required: New Admin Registration Awaiting Approval"
    content = f"""
        <h2 style="color: #b91c1c; margin-top: 0;">New Admin Registration Request</h2>
        <p>A new administrator account has registered and requires your approval:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Full Name:</strong> {admin_name}</p>
            <p style="margin: 0 0 8px 0;"><strong>Username:</strong> {username}</p>
            <p style="margin: 0 0 8px 0;"><strong>College Email:</strong> {admin_email}</p>
            <p style="margin: 0;"><strong>Department:</strong> {department}</p>
        </div>

        <p>Please review and approve or reject this request from the <strong>Super Admin Dashboard &rarr; Admin Approvals</strong> section.</p>
        
        <div style="text-align: center; margin-top: 24px;">
            <a href="{settings.FRONTEND_URL}" style="background-color: #b91c1c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Open Super Admin Portal</a>
        </div>
    """
    text = f"New Admin Registration: {admin_name} ({username}, {admin_email}, {department}). Please log in to Super Admin Portal to review."
    html = wrap_email_html(subject, content)
    return send_email(superadmin_email, subject, html, text)

def send_admin_approval_email(to_email: str, admin_name: str, status: str):
    is_approved = status.upper() == "APPROVED"
    subject = f"AKV Nuditaranga 2026 – Admin Account {'Approved' if is_approved else 'Not Approved'}"
    content = f"""
        <h2 style="color: {'#15803d' if is_approved else '#b91c1c'}; margin-top: 0;">Admin Account { 'Approved!' if is_approved else 'Notice' }</h2>
        <p>Hello <strong>{admin_name}</strong>,</p>
        <p>{ 'Your administrator account has been reviewed and APPROVED by the Super Administrator. You can now log in to access the coordinator dashboard.' if is_approved else 'Your administrator registration has not been approved at this time. Please contact the AKV lead organizers for assistance.' }</p>
        
        { f'''
        <div style="text-align: center; margin-top: 24px;">
            <a href="{settings.FRONTEND_URL}" style="background-color: #15803d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Admin Login</a>
        </div>
        ''' if is_approved else '' }
    """
    text = f"Hello {admin_name}, your AKV admin account has been {'approved' if is_approved else 'rejected'}."
    html = wrap_email_html(subject, content)
    return send_email(to_email, subject, html, text)
