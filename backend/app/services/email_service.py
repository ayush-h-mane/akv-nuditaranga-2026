import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from ..config import settings

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

def send_email(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Sends an email using configured SMTP server, or logs to debug outbox if SMTP is unconfigured.
    """
    record = {
        "to": to_email,
        "subject": subject,
        "html": html_content,
        "text": text_content,
        "from": settings.EMAIL_FROM
    }
    DEBUG_EMAIL_OUTBOX.append(record)

    # If no SMTP host configured, print debug summary and succeed
    if not settings.SMTP_HOST or not settings.SMTP_HOST.strip():
        print(f"\n[EMAIL DISPATCH - DEV SIMULATION]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Summary: {text_content[:200]}...")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        server.quit()
        print(f"[EMAIL DISPATCH] Successfully delivered email to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {to_email}: {e}")
        # Even on SMTP network failure, return True to avoid crashing caller workflow
        return False

# High-Level Email Dispatchers

def send_student_welcome_email(to_email: str, student_name: str, auid: str, role: str, registration_id: str):
    subject = "AKV Nuditaranga 2026 – Registration Successful"
    content = f"""
        <h2 style="color: #b91c1c; margin-top: 0;">ನಮಸ್ಕಾರ {student_name}, Welcome!</h2>
        <p>Your registration for <strong>Acharya Kannada Vedike (AKV) – Nuditaranga 2026</strong> is confirmed.</p>
        
        <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #b91c1c;">{registration_id}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>AUID:</strong> {auid}</p>
            <p style="margin: 0 0 8px 0;"><strong>Registered Role:</strong> <span style="display: inline-block; background-color: #b91c1c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">{role}</span></p>
            <p style="margin: 0;"><strong>Portal Login:</strong> Access your Student Dashboard using your AUID and password.</p>
        </div>

        <p style="color: #57534e; font-size: 14px;">
            { 'As an official volunteer, your profile has been added to the Volunteer Coordination system. Please check your dashboard for briefing schedules.' if role == 'VOLUNTEER' else 'You can now browse events, register for cultural competitions, and view your digital event passes inside the Student Dashboard.' }
        </p>

        <div style="text-align: center; margin-top: 24px;">
            <a href="{settings.FRONTEND_URL}" style="background: linear-gradient(135deg, #b91c1c, #dc2626); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Login to Student Portal</a>
        </div>
    """
    text = f"Welcome {student_name}! Your registration for AKV Nuditaranga 2026 is confirmed. Reg ID: {registration_id}, AUID: {auid}, Role: {role}. Login at {settings.FRONTEND_URL}"
    html = wrap_email_html(subject, content)
    return send_email(to_email, subject, html, text)

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
