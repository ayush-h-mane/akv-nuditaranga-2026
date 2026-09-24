# 🌺 Acharya Kannada Vedike (AKV) — Nuditaranga 2026
### ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ — ನುಡಿತರಂಗ ೨೦೨೬
> Official Digital Festival Management Platform for Acharya Kannada Vedike's Annual Cultural & Literary Extravaganza.

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel&logoColor=white)](https://akv-nuditaranga-2026.vercel.app)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?logo=react&logoColor=white)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Download PDF Manual](https://img.shields.io/badge/Documentation-Download%20PDF-800020?logo=adobeacrobatreader&logoColor=white)](./AKV_Nuditaranga_2026_Architecture_Documentation.pdf)
[![Language](https://img.shields.io/badge/Bilingual-English%20%2F%20%E0%B2%95%E0%B2%A8%E0%B3%8D%E0%B2%A8%E0%B2%A1-FFD700)](#)

📄 **[Download Complete Technical Documentation & Architecture PDF](./AKV_Nuditaranga_2026_Architecture_Documentation.pdf)** (or access online at [https://akv-nuditaranga-2026.vercel.app/AKV_Nuditaranga_2026_Documentation.pdf](https://akv-nuditaranga-2026.vercel.app/AKV_Nuditaranga_2026_Documentation.pdf))

---

## 📖 Table of Contents
1. [Overview & Vision](#-overview--vision)
2. [Target Architecture](#-target-architecture)
3. [User Roles & Permissions Matrix](#-user-roles--permissions-matrix)
4. [Key Features & Modules](#-key-features--modules)
5. [Application Workflows](#-application-workflows)
6. [Technology Stack & Tooling](#-technology-stack--tooling)
7. [Database Schema & Data Models](#-database-schema--data-models)
8. [Local Development Setup](#-local-development-setup)
9. [Production Deployment & Database Migration](#-production-deployment--database-migration)
10. [Security & Reliability Architecture](#-security--reliability-architecture)
11. [Project Directory Structure](#-project-directory-structure)

---

## 🌟 Overview & Vision

**Acharya Kannada Vedike (AKV)** is the premier cultural association of Acharya Institutes, Bengaluru, dedicated to promoting Kannada language, art, heritage, folklore, and literature. 

**Nuditaranga 2026 (ನುಡಿತರಂಗ ೨೦೨೬)** is the flagship annual inter-collegiate cultural fest featuring literary competitions, musical performances, theatrical acts, traditional displays, and interactive exhibitions. 

The **AKV Nuditaranga Platform** is an enterprise-grade, serverless web application purpose-built to automate and streamline:
- **Bilingual Fest Discovery:** Full native Kannada (ಕನ್ನಡ) and English interface.
- **Student Enrollment:** Real-time event registrations with team member allocations.
- **Pass Generation:** Automated digital event badges with encrypted QR codes.
- **On-Ground Operations:** Live camera-based QR code scanning and attendee verification.
- **Volunteer Management:** Shift logs, daily attendance marking, and Excel/CSV exports.
- **Executive Analytics:** High-level metrics, registrations audit trail, and coordinator administration.

---

## 🏛️ Target Architecture

The application is deployed on a modern **Serverless Cloud Architecture** combining Vercel's edge hosting with a persistent Supabase PostgreSQL database.

```mermaid
graph TD
    subgraph Client Layer
        Browser[Client Browser / Mobile PWA]
    end

    subgraph Vercel Cloud Platform
        VercelEdge[Vercel Edge CDN / Rewrites]
        ReactSPA[React 18 + Vite Static SPA]
        VercelServerless[Python 3.12 Serverless Function /api/index.py]
    end

    subgraph Backend Application
        FastAPI[FastAPI Application Server]
        AuthDeps[JWT + Bcrypt Auth Engine]
        SQLAlchemy[SQLAlchemy 2.0 ORM]
    end

    subgraph Persistence Layer
        SupabasePooler[Supabase Transaction Pooler Port 6543]
        PostgreSQL[(Persistent PostgreSQL Database)]
        LocalSQLite[(Local SQLite akv_fest.db - Dev Only)]
    end

    Browser -->|HTTPS Request| VercelEdge
    VercelEdge -->|Static Assets| ReactSPA
    VercelEdge -->|/api/* Rewrites| VercelServerless
    VercelServerless --> FastAPI
    FastAPI --> AuthDeps
    FastAPI --> SQLAlchemy
    SQLAlchemy -->|Production: pool_pre_ping| SupabasePooler
    SupabasePooler --> PostgreSQL
    SQLAlchemy -.->|Local Development Only| LocalSQLite
```

### Architectural Decisions & Mitigations:
1. **Serverless Ephemeral Storage Elimination:** Vercel serverless containers recycle and freeze on idle. Production strictly enforces `DATABASE_URL` pointing to hosted PostgreSQL (Supabase). Ephemeral SQLite in `/tmp` is prevented via explicit startup guards.
2. **PostgreSQL Connection Pooling:** Configured with `pool_pre_ping=True` and `pool_recycle=300` to prevent stale connection drops during serverless cold starts.
3. **Unified Same-Origin Routing:** The React frontend uses relative `/api` paths. On Vercel, `vercel.json` routes `/api/(.*)` to `api/index.py`. In local development, Vite proxies `/api` to `http://127.0.0.1:8000`, completely eliminating cross-origin CORS issues and hardcoded ports.

---

## 👥 User Roles & Permissions Matrix

| Capability / Resource | Public Guest | Participant | Volunteer | Admin Coordinator | Super Administrator |
|---|:---:|:---:|:---:|:---:|:---:|
| Browse Bilingual Events & Rules | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Photo Gallery & Activities | ✅ | ✅ | ✅ | ✅ | ✅ |
| Self-Registration & Account Creation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Register for Solo & Team Events | ❌ | ✅ | ✅ | ❌ | ❌ |
| Access Digital QR Fest Pass | ❌ | ✅ | ✅ | ❌ | ❌ |
| Change Profile / Password | ❌ | ✅ | ✅ | ✅ | ✅ |
| Mark Volunteer Daily Attendance | ❌ | ❌ | ❌ | ✅ | ✅ |
| Scan Attendee Badges (QR Scanner) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export Attendance (CSV & Excel) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve / Reject Coordinator Accounts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Audit Logs & Platform Analytics | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Key Features & Modules

### 1. 🎭 Bilingual Event Discovery & Registration
- Complete Kannada and English descriptions for traditional, literary, and cultural competitions.
- Dynamic team creation with leader and member AUID tracking.
- Real-time slot management preventing overbooking beyond maximum event limits.

### 2. 📱 Digital Event Pass & QR Badging
- Instant digital pass generated upon event enrollment with unique registration token (`AKV-2026-XXXXXX`).
- Downloadable/savable event ticket badge.
- Encrypted QR code data for fast gate admission.

### 3. 📸 Real-Time Camera QR Scanner
- Integrated HTML5 browser camera scanner in the Admin portal.
- Single-scan check-in: verifies attendee eligibility, registers attendance timestamp, and logs coordinator identity.
- Duplicate entry prevention with real-time audio/visual status feedback.

### 4. 📊 Superadmin Command Center
- **Key Metrics Dashboard:** Total participants, event breakdown, check-in percentages, and active volunteers.
- **Admin Approvals:** Role elevation workflow requiring Superadmin approval for new coordinators.
- **Volunteer Attendance Management:** Attendance marking, status tracking (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), and one-click `.xlsx`/`.csv` report generation using `openpyxl`.
- **System Audit Trail:** Immutable log of system modifications (`AUDIT_LOGS`) recording actor name, action, target entity, and previous/new values.

### 5. 🔐 Robust Authentication & Security
- Cryptographic password hashing using **Bcrypt**.
- Stateless **JWT (HS256)** tokens with automated renewal and role claims.
- Password recovery lifecycle with time-delimited reset tokens.
- Case-insensitive lookups across AUID, College Email, and Username with automatic whitespace sanitization.

---

## 🔄 Application Workflows

### Student Registration & Check-in Flow:
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Frontend as React Vite SPA
    participant API as FastAPI Backend
    participant DB as Supabase PostgreSQL
    actor Coordinator as Event Coordinator

    Student->>Frontend: Enter AUID, Email, College, Password
    Frontend->>API: POST /api/auth/register/student
    API->>DB: Check Unique AUID & Email
    API->>DB: INSERT INTO users (Bcrypt Hash)
    API-->>Frontend: 201 Created (Token + Profile)
    Student->>Frontend: Select Cultural Event & Register
    Frontend->>API: POST /api/student/register-event
    API->>DB: INSERT INTO registrations
    API-->>Frontend: Generate Digital Pass & QR Code
    Note over Student,Coordinator: Day of Festival
    Student->>Coordinator: Presents Digital QR Pass
    Coordinator->>Frontend: Camera QR Scan (/checkin)
    Frontend->>API: POST /api/checkin/verify/{code}
    API->>DB: Verify Registration & Update Status = Checked In
    API->>DB: INSERT INTO checkin_logs
    API-->>Frontend: 200 OK (Attendee Verified)
```

---

## 🛠️ Technology Stack & Tooling

### Frontend
- **Framework:** [React 18](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Styling:** Custom CSS Design Tokens, Glassmorphism, Responsive Grid System
- **Icons:** [Lucide React](https://lucide.dev/)
- **QR Utilities:** `html5-qrcode` (Live camera scanner), `qrcode.react` (Pass generation)
- **Delight & Animations:** `canvas-confetti` celebration triggers, CSS keyframe micro-animations

### Backend & API
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (High-performance ASGI)
- **Runtime:** Python 3.12 (CPython via Vercel Runtime)
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Validation:** [Pydantic v2](https://docs.pydantic.dev/) + `email-validator`
- **Security:** `passlib` with `bcrypt`, `pyjwt` for HS256 tokens
- **Data Export:** [OpenPyXL](https://openpyxl.readthedocs.io/) (Native Excel report generation)

### Database & Cloud Infrastructure
- **Production Database:** [Supabase](https://supabase.com/) PostgreSQL (Managed AWS South Asia Mumbai `ap-south-1`)
- **Connection Mode:** Supabase PgBouncer Transaction Pooler (Port `6543`)
- **Local Database:** SQLite 3 (`akv_fest.db`)
- **Hosting & CI/CD:** [Vercel](https://vercel.com/) (Edge CDN + Serverless Python Runtime)
- **Version Control:** GitHub

---

## 🗄️ Database Schema & Data Models

```mermaid
erDiagram
    users ||--o| admins : "has profile"
    users ||--o{ volunteer_attendance : "attends"
    users ||--o{ password_reset_tokens : "requests"
    users ||--o{ registrations : "registers"
    events ||--o{ registrations : "contains"
    registrations ||--o{ checkin_logs : "logs"

    users {
        int id PK
        string name
        string auid UK
        string email UK
        string phone
        string institute
        string department
        int semester
        string section
        string gender
        string role "PARTICIPANT, VOLUNTEER, SPECTATOR, ADMIN, SUPERADMIN"
        string registration_id UK
        string password_hash
        string account_status "ACTIVE, DISABLED"
        datetime created_at
    }

    admins {
        int id PK
        int user_id FK
        string username UK
        string approval_status "PENDING_APPROVAL, APPROVED, REJECTED"
        string approved_by
        datetime approved_at
    }

    events {
        string id PK
        string title_en
        string title_kn
        string category "literary, cultural, traditional"
        string category_kn
        text description_en
        text description_kn
        boolean is_team
        string format "solo, team, both"
        int min_team_size
        int max_team_size
        int max_slots
        int registered_count
        string venue
        string event_date
        string event_time
        boolean is_active
    }

    registrations {
        int id PK
        string registration_id UK
        string event_id FK
        int user_id FK
        string full_name
        string usn
        string auid
        string email
        string phone
        boolean is_team
        string team_name
        text team_members
        string status "Registered, Checked In, Cancelled"
        datetime checkin_time
        string checked_in_by
    }

    volunteer_attendance {
        int id PK
        int user_id FK
        string auid
        string volunteer_name
        string date
        string status "PRESENT, ABSENT, LATE, EXCUSED"
        string marked_by
    }

    audit_logs {
        int id PK
        int user_id
        string actor_name
        string action
        string target_type
        string target_id
        text previous_value
        text new_value
        datetime created_at
    }
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.10 to v3.12)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ayush-h-mane/akv-nuditaranga-2026.git
cd akv-nuditaranga-2026
```

### 2. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend development server (defaults to local SQLite)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start Vite dev server with reverse proxy
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. All `/api` requests will automatically route to the running FastAPI server.

---

## 🚀 Production Deployment & Database Migration

### 1. Configure Vercel Environment Variables
Set the following variables in **Vercel Project Settings → Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Pooled PostgreSQL Connection URI | `postgresql://postgres.xxx:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` |
| `JWT_SECRET_KEY` | 64-character random cryptographic secret | Generated via `secrets.token_hex(32)` |
| `SUPERADMIN_USERNAME` | Master Super Admin Username | `superadmin` |
| `SUPERADMIN_PASSWORD` | Master Super Admin Password | Strong Secret Password |
| `FRONTEND_URL` | Production Domain | `https://akv-nuditaranga-2026.vercel.app` |

### 2. Migrate Local Data to PostgreSQL
To safely migrate records from local SQLite to Supabase:
```bash
python scripts/migrate_sqlite_to_pg.py --sqlite-path akv_fest.db --pg-url "YOUR_POSTGRES_URL"
```
The script will:
- Establish table schemas in PostgreSQL without dropping existing structures.
- Transfer records respecting foreign key hierarchies.
- Synchronize PostgreSQL `SERIAL` sequences (`setval`) to ensure future inserts increment safely.

### 3. Deploy
```bash
git push origin main
# Or deploy directly via CLI:
npx vercel --prod
```

---

## 🛡️ Security & Reliability Architecture

- **Zero Ephemeral Production Storage:** Vercel serverless environments discard `/tmp` storage across cold starts. The backend features strict configuration guards that halt execution if an ephemeral SQLite database is detected in production.
- **Strict Password Protection:** All passwords undergo salt-and-stretch hashing using the **Bcrypt** cryptographic algorithm. Plaintext passwords are never persisted.
- **Granular CORS Protection:** Replaced permissive wildcard origins with strict regular expressions validating `https://*.vercel.app` and designated college domains.
- **Sanitized Credentials & Fault Isolation:** All incoming usernames, emails, and passwords undergo whitespace trimming and casing normalization. Database exceptions trigger automatic rollback to prevent dirty session leaks.

---

## 📂 Project Directory Structure

```text
akv-nuditaranga-2026/
├── api/
│   ├── index.py                 # Vercel serverless Python handler
│   └── requirements.txt         # Serverless Python runtime dependencies
├── backend/
│   └── app/
│       ├── routes/              # Modular API endpoints
│       │   ├── auth.py          # Student/Admin registration, login & JWT
│       │   ├── events.py        # Event catalog management
│       │   ├── student.py       # Student dashboard & registration
│       │   ├── checkin.py       # Gate admission & QR validation
│       │   ├── superadmin.py    # Master dashboard, metrics & audit
│       │   ├── admin.py         # Coordinator operations
│       │   ├── activities.py    # Fest activities feed
│       │   └── gallery.py       # Cultural gallery items
│       ├── auth_deps.py         # JWT tokens & RBAC route guards
│       ├── config.py            # Pydantic environment settings
│       ├── database.py          # SQLAlchemy engine & session lifecycle
│       ├── models.py            # SQLAlchemy database entities
│       └── schemas.py           # Pydantic validation models
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI (Pass, QR Scanner, Modals)
│   │   ├── pages/               # Application views & dashboards
│   │   ├── sections/            # Landing page modular blocks
│   │   ├── services/            # API client & local fallback cache
│   │   └── config/              # Fest events & schedule constants
│   ├── package.json
│   └── vite.config.js           # Vite configuration with API reverse proxy
├── scripts/
│   └── migrate_sqlite_to_pg.py  # SQLite to PostgreSQL migration tool
├── .env.example                 # Environment configuration template
├── DEPLOYMENT.md                # In-depth production deployment runbook
├── requirements.txt             # Primary Python dependency specifications
├── vercel.json                  # Edge routing & API rewrite definitions
└── README.md                    # Project documentation
```

---

## 📜 Acknowledgements & Credits
Developed with ❤️ for **Acharya Kannada Vedike (AKV)**.  
*ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ!* (Long live glorious Kannada!)
