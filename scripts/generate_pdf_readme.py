import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, letter[1] - 36, "Acharya Kannada Vedike (AKV) — Nuditaranga 2026 | Technical Documentation")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 30, footer_text)
        self.drawString(54, 30, "CONFIDENTIAL & PROPRIETARY — ACHARYA KANNADA VEDIKE")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 40, letter[0] - 54, 40)
        self.restoreState()


def build_pdf(output_paths):
    for output_path in output_paths:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    primary_path = output_paths[0]
    doc = SimpleDocTemplate(
        primary_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    c_primary = colors.HexColor("#800020")    # Deep Crimson / Kannada Maroon
    c_gold = colors.HexColor("#B45309")       # Rich Ochre/Gold
    c_dark = colors.HexColor("#0F172A")       # Dark Slate
    c_muted = colors.HexColor("#475569")      # Muted text
    c_bg_box = colors.HexColor("#F8FAFC")     # Soft box background

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_gold,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=c_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=c_primary
    )

    badge_style = ParagraphStyle(
        'BadgeStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E3A8A")
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("Acharya Kannada Vedike (AKV) — Nuditaranga 2026", title_style))
    story.append(Paragraph("Comprehensive System Architecture, Technology Stack & Operational Manual", subtitle_style))
    
    meta_table_data = [
        [
            Paragraph("<b>Version:</b> 2.0.0 (Production Stable)", table_cell_style),
            Paragraph("<b>Hosting:</b> Vercel Edge + Serverless", table_cell_style),
            Paragraph("<b>Database:</b> Supabase PostgreSQL (Mumbai)", table_cell_style)
        ],
        [
            Paragraph("<b>Live URL:</b> akv-nuditaranga-2026.vercel.app", table_cell_style),
            Paragraph("<b>Runtime:</b> Python 3.12 / Node 24", table_cell_style),
            Paragraph("<b>Security:</b> Bcrypt + HS256 JWT RBAC", table_cell_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[170, 165, 169])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # SECTION 1: OVERVIEW
    story.append(Paragraph("1. Executive Summary & Vision", h1_style))
    story.append(Paragraph(
        "<b>Acharya Kannada Vedike (AKV)</b> is the official cultural association of Acharya Institutes, Bengaluru, "
        "dedicated to the preservation, promotion, and celebration of Karnataka's rich linguistic, artistic, and literary heritage. "
        "<b>Nuditaranga 2026 (ನುಡಿತರಂಗ ೨೦೨೬)</b> is its premier inter-collegiate annual festival, hosting thousands of students "
        "across traditional arts, literary contests, musical performances, and theatrical showcases. "
        "This platform is an enterprise-grade, cloud-native web system providing end-to-end automation for fest enrollment, "
        "instant digital QR pass issuance, mobile camera admission verification, volunteer shift tracking, and executive analytics.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # SECTION 2: ARCHITECTURE
    story.append(Paragraph("2. Target Cloud & Serverless Architecture", h1_style))
    story.append(Paragraph(
        "The system employs a high-performance, decoupled client-server architecture deployed on <b>Vercel Edge & Serverless Functions</b> "
        "backed by a managed <b>Supabase PostgreSQL</b> relational database:",
        body_style
    ))

    arch_table_data = [
        [Paragraph("Tier", table_header_style), Paragraph("Component", table_header_style), Paragraph("Implementation & Architectural Role", table_header_style)],
        [Paragraph("Client Layer", table_cell_bold), Paragraph("Vite + React 18 SPA", table_cell_style), Paragraph("Progressive web client with Glassmorphic design, dual Kannada/English language support, dynamic routing, and offline localStorage caching.", table_cell_style)],
        [Paragraph("Edge CDN", table_cell_bold), Paragraph("Vercel Edge Network", table_cell_style), Paragraph("Globally distributed edge caching for static assets, automatic SSL termination, and unified <code>/api/*</code> rewrite routing.", table_cell_style)],
        [Paragraph("API Gateway", table_cell_bold), Paragraph("Vercel Serverless Function", table_cell_style), Paragraph("Python 3.12 ASGI runtime (<code>api/index.py</code>) executing FastAPI endpoints with zero server maintenance and automatic horizontal scale-out.", table_cell_style)],
        [Paragraph("Backend", table_cell_bold), Paragraph("FastAPI Framework", table_cell_style), Paragraph("High-throughput async API handling user auth, registration workflows, role-based access control, QR token verification, and data exports.", table_cell_style)],
        [Paragraph("ORM Layer", table_cell_bold), Paragraph("SQLAlchemy 2.0", table_cell_style), Paragraph("Robust object-relational mapping configured with <code>pool_pre_ping=True</code> and <code>pool_recycle=300</code> to eliminate serverless stale connections.", table_cell_style)],
        [Paragraph("Database", table_cell_bold), Paragraph("Supabase PostgreSQL", table_cell_style), Paragraph("Hosted relational database (AWS Mumbai ap-south-1) accessed via dedicated PgBouncer Transaction Pooler (Port 6543) for persistent storage.", table_cell_style)],
        [Paragraph("Dev DB", table_cell_bold), Paragraph("SQLite (Local Only)", table_cell_style), Paragraph("Local isolated database (<code>akv_fest.db</code>) strictly restricted to local machines. Production guards actively prevent ephemeral SQLite execution.", table_cell_style)],
    ]
    arch_table = Table(arch_table_data, colWidths=[80, 110, 314])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    # SECTION 3: TECH STACKS
    story.append(Paragraph("3. Detailed Technology Stack & Libraries", h1_style))
    
    tech_data = [
        [Paragraph("Domain", table_header_style), Paragraph("Technology / Tool", table_header_style), Paragraph("Version", table_header_style), Paragraph("Strategic Justification & Usage", table_header_style)],
        [Paragraph("Frontend UI", table_cell_bold), Paragraph("React.js", table_cell_style), Paragraph("18.3.1", table_cell_style), Paragraph("Declarative component architecture power dynamic forms, modals, and tabbed dashboards.", table_cell_style)],
        [Paragraph("Build Engine", table_cell_bold), Paragraph("Vite", table_cell_style), Paragraph("8.3.0", table_cell_style), Paragraph("Sub-second HMR and optimized Rollup production asset chunking with built-in API proxy.", table_cell_style)],
        [Paragraph("Iconography", table_cell_bold), Paragraph("Lucide React", table_cell_style), Paragraph("0.468.0", table_cell_style), Paragraph("Modern, feather-weight SVG icon set for clean and responsive touch-friendly navigation.", table_cell_style)],
        [Paragraph("QR Engine", table_cell_bold), Paragraph("html5-qrcode", table_cell_style), Paragraph("2.3.8", table_cell_style), Paragraph("Direct hardware camera interface for rapid attendee QR check-in on mobile browsers.", table_cell_style)],
        [Paragraph("Pass QR", table_cell_bold), Paragraph("qrcode.react", table_cell_style), Paragraph("4.1.0", table_cell_style), Paragraph("Vector SVG QR code generation for student digital entry badges.", table_cell_style)],
        [Paragraph("Celebration", table_cell_bold), Paragraph("canvas-confetti", table_cell_style), Paragraph("1.9.4", table_cell_style), Paragraph("Delightful particle animation triggered on successful registration and check-in.", table_cell_style)],
        [Paragraph("Backend API", table_cell_bold), Paragraph("FastAPI", table_cell_style), Paragraph("0.141.1", table_cell_style), Paragraph("Modern Python ASGI framework offering native async execution and automatic OpenAPI specs.", table_cell_style)],
        [Paragraph("Validation", table_cell_bold), Paragraph("Pydantic", table_cell_style), Paragraph("2.13.5", table_cell_style), Paragraph("Strict input schemas validating AUID formats, college emails, phone numbers, and roles.", table_cell_style)],
        [Paragraph("ORM", table_cell_bold), Paragraph("SQLAlchemy", table_cell_style), Paragraph("2.0.54", table_cell_style), Paragraph("Database-agnostic relational abstraction with robust foreign keys, cascades, and pooling.", table_cell_style)],
        [Paragraph("Postgres Driver", table_cell_bold), Paragraph("psycopg2-binary", table_cell_style), Paragraph("2.9.13", table_cell_style), Paragraph("High-speed C-based PostgreSQL database adapter for Python.", table_cell_style)],
        [Paragraph("Auth & Crypt", table_cell_bold), Paragraph("Bcrypt + PyJWT", table_cell_style), Paragraph("5.0 / 2.15", table_cell_style), Paragraph("Industry-standard salt-and-stretch password hashing with stateless HS256 JWT tokens.", table_cell_style)],
        [Paragraph("Reporting", table_cell_bold), Paragraph("OpenPyXL", table_cell_style), Paragraph("3.1.5", table_cell_style), Paragraph("Automated server-side generation of styled Excel attendance and registration spreadsheets.", table_cell_style)],
    ]
    tech_table = Table(tech_data, colWidths=[75, 95, 45, 289])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_gold),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 10))

    # SECTION 4: DATA MODELS
    story.append(Paragraph("4. Relational Database Schema & Entities", h1_style))
    story.append(Paragraph(
        "The relational schema is normalized into 10 structured entities enforcing relational integrity, "
        "cascade deletions on dependent tokens, and indexed lookups:",
        body_style
    ))

    schema_data = [
        [Paragraph("Table Name", table_header_style), Paragraph("Primary Key", table_header_style), Paragraph("Foreign Keys", table_header_style), Paragraph("Indexed & Unique Attributes", table_header_style), Paragraph("Functional Description", table_header_style)],
        [Paragraph("users", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("auid (UQ), email (UQ), registration_id (UQ), role", table_cell_style), Paragraph("Stores students, volunteers, and admin user profiles with bcrypt password hashes.", table_cell_style)],
        [Paragraph("admins", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("user_id -> users.id", table_cell_style), Paragraph("username (UQ), approval_status", table_cell_style), Paragraph("Coordinator profiles requiring Superadmin approval (PENDING, APPROVED, REJECTED).", table_cell_style)],
        [Paragraph("events", table_cell_bold), Paragraph("id (String)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("id, category", table_cell_style), Paragraph("Fest competitions with dual-language titles, rules, slots, venue, and team parameters.", table_cell_style)],
        [Paragraph("registrations", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("event_id -> events.id<br/>user_id -> users.id", table_cell_style), Paragraph("registration_id (UQ), usn, auid", table_cell_style), Paragraph("Event enrollment records containing team rosters, checkin status, and timestamps.", table_cell_style)],
        [Paragraph("volunteer_attendance", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("user_id -> users.id", table_cell_style), Paragraph("auid, date, status", table_cell_style), Paragraph("Daily festival volunteer shift logs (PRESENT, ABSENT, LATE, EXCUSED).", table_cell_style)],
        [Paragraph("audit_logs", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("user_id", table_cell_style), Paragraph("action, target_type, target_id", table_cell_style), Paragraph("Immutable platform audit trail tracking administrative actions and state diffs.", table_cell_style)],
        [Paragraph("checkin_logs", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("registration_id", table_cell_style), Paragraph("Audit log recording gate check-in attempts, coordinator agent, and notes.", table_cell_style)],
        [Paragraph("password_reset_tokens", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("user_id -> users.id", table_cell_style), Paragraph("token_hash (UQ)", table_cell_style), Paragraph("Time-delimited SHA-256 password recovery tokens with automated expiration.", table_cell_style)],
        [Paragraph("activities", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("category", table_cell_style), Paragraph("Fest feed featuring highlights, announcements, and cultural activity cards.", table_cell_style)],
        [Paragraph("gallery_items", table_cell_bold), Paragraph("id (Serial)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Festival photo showcase with captions in Kannada and English.", table_cell_style)],
    ]
    schema_table = Table(schema_data, colWidths=[90, 55, 95, 114, 150])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(schema_table)
    story.append(Spacer(1, 10))

    # SECTION 5: ROLE-BASED ACCESS CONTROL
    story.append(Paragraph("5. Role-Based Access Control & User Journeys", h1_style))
    story.append(Paragraph(
        "Authentication is enforced via stateless JSON Web Tokens (JWT) signed with HS256. User roles determine route eligibility:",
        body_style
    ))
    story.append(Paragraph("• <b>SUPERADMIN:</b> Master authority. Unrestricted dashboard access, live metric counters, volunteer attendance controls, Excel exports, admin approval lifecycle, and database inspection.", bullet_style))
    story.append(Paragraph("• <b>ADMIN (Event Coordinator):</b> Festival operations. Event attendee lists, real-time camera QR scanner for gate check-in, attendance viewing, and participant verification.", bullet_style))
    story.append(Paragraph("• <b>VOLUNTEER:</b> Event operations staff. Attendance logging, duty check-in, spectator assistance, and participant support.", bullet_style))
    story.append(Paragraph("• <b>PARTICIPANT / STUDENT:</b> Registered attendees. Event enrollment, solo/team registration, live schedule tracker, password change, and digital QR pass generation.", bullet_style))
    story.append(Paragraph("• <b>SPECTATOR / PUBLIC:</b> Open access. Cultural showcase exploration, Kannada literary schedule, event rules, gallery, and contact information.", bullet_style))
    story.append(Spacer(1, 8))

    # SECTION 6: KEY TECHNICAL INNOVATIONS
    story.append(Paragraph("6. Key Engineering Innovations & Problem Resolutions", h1_style))
    story.append(Paragraph("• <b>Zero-Persistence Ephemeral Storage Fix:</b> Vercel serverless functions recycle containers on idle. The previous architecture stored data in <code>/tmp/akv_fest.db</code>, causing registered accounts to vanish. This was solved by engineering a hard configuration guard that rejects SQLite in production and connects exclusively to persistent Supabase PostgreSQL.", body_style))
    story.append(Paragraph("• <b>Serverless Connection Pooling:</b> Relational database connections are optimized for stateless Lambda functions using Supabase's transaction pooler (port 6543) combined with SQLAlchemy <code>pool_pre_ping=True</code> and <code>pool_recycle=300</code>.", body_style))
    story.append(Paragraph("• <b>Cross-Environment Reverse Proxy:</b> Configured Vite's local dev server to transparently proxy <code>/api</code> calls to <code>http://127.0.0.1:8000</code>, ensuring the exact same relative API URLs function in both local development and Vercel production without CORS conflicts.", body_style))
    story.append(Paragraph("• <b>Dual Dialect Schema Migrations:</b> Database bootstrap scripts automatically detect dialect (SQLite vs PostgreSQL) and query <code>information_schema.columns</code> or <code>PRAGMA table_info</code> to ensure schema alignment without destructive resets.", body_style))
    story.append(Paragraph("• <b>PostgreSQL Sequence Realignment:</b> A dedicated migration script (<code>scripts/migrate_sqlite_to_pg.py</code>) transfers all records while updating underlying PostgreSQL <code>SERIAL</code> sequences (<code>setval</code>) to avoid primary key collisions on subsequent registrations.", body_style))
    story.append(Spacer(1, 10))

    # SECTION 7: VERIFICATION RESULTS
    story.append(Paragraph("7. Production Verification & Test Results", h1_style))
    story.append(Paragraph(
        "The live production deployment (<b>https://akv-nuditaranga-2026.vercel.app</b>) was validated using an automated "
        "end-to-end integration test suite verifying the complete registration and persistence lifecycle:",
        body_style
    ))

    test_table_data = [
        [Paragraph("Test Case", table_header_style), Paragraph("Input / Action", table_header_style), Paragraph("Expected Result", table_header_style), Paragraph("Production Status", table_header_style)],
        [Paragraph("1. Event Catalog", table_cell_bold), Paragraph("GET /api/events", table_cell_style), Paragraph("Return bilingual cultural competitions", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (200 OK)</b></font>", table_cell_style)],
        [Paragraph("2. Superadmin Auth", table_cell_bold), Paragraph("POST /api/auth/login/admin", table_cell_style), Paragraph("Issue JWT token with role claims", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (200 OK)</b></font>", table_cell_style)],
        [Paragraph("3. Student Registration", table_cell_bold), Paragraph("POST /api/auth/register/student", table_cell_style), Paragraph("Persist user record in Supabase PG", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (201 Created)</b></font>", table_cell_style)],
        [Paragraph("4. Session Logout", table_cell_bold), Paragraph("Client token purge", table_cell_style), Paragraph("Session cleared from browser", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (Verified)</b></font>", table_cell_style)],
        [Paragraph("5. Re-Login with Same Credentials", table_cell_bold), Paragraph("POST /api/auth/login/student", table_cell_style), Paragraph("Authenticate against PostgreSQL user", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (200 OK)</b></font>", table_cell_style)],
        [Paragraph("6. Database Persistence Audit", table_cell_bold), Paragraph("Direct SQL query to Supabase", table_cell_style), Paragraph("Record exists across serverless cold starts", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (Confirmed)</b></font>", table_cell_style)],
        [Paragraph("7. Invalid Password Guard", table_cell_bold), Paragraph("POST /api/auth/login/student (wrong pw)", table_cell_style), Paragraph("Reject with HTTP 401 Unauthorized", table_cell_style), Paragraph("<font color='#16A34A'><b>PASSED (401 Verified)</b></font>", table_cell_style)],
    ]
    test_table = Table(test_table_data, colWidths=[110, 140, 164, 90])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_dark),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(test_table)
    story.append(Spacer(1, 14))

    # FOOTER CLOSING
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=10))
    story.append(Paragraph(
        "<i>Document generated automatically for Acharya Kannada Vedike (AKV) — Nuditaranga 2026. "
        "All code, configurations, and assets are maintained under the official AKV repository. "
        "ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ!</i>",
        ParagraphStyle('FooterNotice', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=c_muted)
    ))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[✓] Generated primary PDF at: {primary_path}")

    # Copy to all other destinations
    for extra_path in output_paths[1:]:
        import shutil
        shutil.copyfile(primary_path, extra_path)
        print(f"[✓] Synced PDF to: {extra_path}")

if __name__ == "__main__":
    targets = [
        os.path.abspath("AKV_Nuditaranga_2026_Architecture_Documentation.pdf"),
        os.path.abspath("frontend/public/AKV_Nuditaranga_2026_Documentation.pdf")
    ]
    build_pdf(targets)
