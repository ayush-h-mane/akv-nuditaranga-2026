# Acharya Kannada Vedike (AKV) - Nuditaranga 2026
## Production Deployment & PostgreSQL Migration Guide

This document details how to configure, deploy, and verify the AKV Nuditaranga 2026 platform on **Vercel** with a persistent **PostgreSQL** database (e.g., Supabase or Neon).

---

### Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Database Setup](#2-prerequisites--database-setup)
3. [Required Environment Variables](#3-required-environment-variables)
4. [Migrating Local SQLite Data to PostgreSQL](#4-migrating-local-sqlite-data-to-postgresql)
5. [Local Development Setup](#5-local-development-setup)
6. [Deploying to Vercel](#6-deploying-to-vercel)
7. [Post-Deployment Verification Checklist](#7-post-deployment-verification-checklist)
8. [Troubleshooting Common Issues](#8-troubleshooting-common-issues)

---

### 1. Architecture Overview

- **Frontend:** React + Vite, deployed on Vercel Edge/Serverless static hosting.
- **Backend:** FastAPI + SQLAlchemy, running serverless functions via `api/index.py` on Vercel Python runtime.
- **API Routing:** Relative `/api/*` routes are proxied locally by Vite and mapped on Vercel via `vercel.json` rewrite rules.
- **Database:** Hosted PostgreSQL (Supabase / Neon / AWS RDS). SQLite is restricted to local development; production strictly rejects SQLite to prevent state loss across serverless container recycling.
- **Auth:** Standard bcrypt password hashing + HS256 JWT tokens.

---

### 2. Prerequisites & Database Setup

#### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a free project (e.g., `akv-fest-2026`).
2. Choose a region close to your users (e.g., `ap-south-1` Mumbai).
3. Navigate to **Project Settings** → **Database**.
4. Under **Connection Pooling**, copy the **Transaction** or **Session** pooler URI:
   ```text
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
   > **Note:** If the connection string begins with `postgres://`, the backend automatically normalizes it to `postgresql://`.

#### Option B: Neon Serverless Postgres
1. Go to [neon.tech](https://neon.tech) and create a project.
2. In the dashboard, copy the pooled connection string:
   ```text
   postgresql://[USER]:[PASSWORD]@[ENDPOINT]-pooler.neon.tech/[DATABASE]?sslmode=require
   ```

---

### 3. Required Environment Variables

Configure these variables in your **Vercel Project Settings → Environment Variables**:

| Variable Name | Required | Description | Example / Value |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Full PostgreSQL connection string with SSL | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET_KEY` | **Yes** | 64-char random hex key for JWT signing | Generate via `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SUPERADMIN_USERNAME` | Optional | Initial Superadmin login username | `superadmin` |
| `SUPERADMIN_PASSWORD` | Optional | Initial Superadmin secure password | `AkvSuperAdmin@2026!` |
| `SUPERADMIN_EMAIL` | Optional | Initial Superadmin notification email | `kannadavedike@acharya.ac.in` |
| `FRONTEND_URL` | Optional | Allowed origin & password reset link domain | `https://your-fest-domain.vercel.app` |
| `ALLOWED_ORIGINS` | Optional | Comma-separated list of additional CORS origins | `https://your-fest-domain.vercel.app` |

> [!IMPORTANT]
> Never set `DATABASE_URL` to a `sqlite://` URL in Vercel. The server will throw a descriptive `RuntimeError` on startup to protect against ephemeral data loss.

---

### 4. Migrating Local SQLite Data to PostgreSQL

If you have existing test users, events, and registrations in `akv_fest.db` that you wish to preserve in PostgreSQL:

1. Obtain your PostgreSQL connection string from Supabase/Neon.
2. Run the included safe migration tool:
   ```bash
   python scripts/migrate_sqlite_to_pg.py --pg-url "postgresql://username:password@host:5432/dbname?sslmode=require"
   ```
3. The script will:
   - Create all tables in PostgreSQL if they don't already exist.
   - Read records in dependency order (`events` → `users` → `admins` → `volunteer_attendance` → `registrations`, etc.).
   - Insert records preserving primary keys.
   - Synchronize all PostgreSQL `SERIAL` sequences (`setval`) so subsequent inserts generate unique IDs smoothly.
   - Leave the local `akv_fest.db` completely intact.

---

### 5. Local Development Setup

To run both backend and frontend locally:

1. **Backend:**
   ```bash
   # Activate virtual environment (if using one)
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *By default, the backend will use `sqlite:///./akv_fest.db` unless overridden by `DATABASE_URL`.*

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Vite serves on `http://localhost:5173` and automatically proxies `/api/*` calls to `http://127.0.0.1:8000`.*

---

### 6. Deploying to Vercel

#### Method 1: Vercel Web Dashboard (Git Push)
1. Push your repository to GitHub / GitLab.
2. In the Vercel Dashboard, import the repository.
3. In **Settings → Environment Variables**, add:
   - `DATABASE_URL`
   - `JWT_SECRET_KEY`
   - `SUPERADMIN_PASSWORD`
4. Click **Deploy**.

#### Method 2: Vercel CLI
```bash
# Link project to Vercel
npx vercel

# Set production environment variables
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET_KEY production

# Deploy to production
npx vercel --prod
```

---

### 7. Post-Deployment Verification Checklist

Execute this verification sequence on the live Vercel URL to confirm persistence:

- [ ] **Step 1: Student Registration**
  - Navigate to `/register` or click Student Registration.
  - Register a new student (e.g., Name: `Ayush Mane`, AUID: `AIT22CS999`, Email: `ayush.test@acharya.ac.in`, Password: `Password@123`).
  - Expect registration success and automatic redirect or success confirmation.

- [ ] **Step 2: Logout**
  - Click Logout from the user dashboard / header.
  - Confirm the authentication token is removed from browser storage (`akv_token`).

- [ ] **Step 3: Login Again**
  - Navigate to `/login`.
  - Enter the exact same credentials (`AIT22CS999` and `Password@123`).
  - Expect **200 OK** and successful login.

- [ ] **Step 4: Page Refresh**
  - Refresh the browser (`F5` or `Ctrl+R`).
  - Verify that user session persists without being kicked out.

- [ ] **Step 5: Cross-Device / Incognito Verification**
  - Open an Incognito window or different browser.
  - Log in with `AIT22CS999`.
  - Confirm credentials authenticate successfully across independent sessions.

- [ ] **Step 6: Superadmin / Admin Login**
  - Log in using `superadmin` / `akv-superadmin` and the configured password.
  - Verify the Admin Dashboard renders registered attendees and event metrics.

- [ ] **Step 7: Vercel Redeployment Persistence Check**
  - Trigger a redeployment in Vercel.
  - Attempt to log in again with `AIT22CS999`.
  - Expect **SUCCESS**. This proves state is stored persistently in PostgreSQL and no longer vanishes during container cold-starts.

---

### 8. Troubleshooting Common Issues

| Symptom | Cause | Solution |
|---|---|---|
| `RuntimeError: Ephemeral SQLite is not allowed on Vercel` | `DATABASE_URL` is missing or points to SQLite in production | Set a valid PostgreSQL connection string in Vercel Environment Variables. |
| `psycopg2.OperationalError: SSL connection has been closed unexpectedly` | Transaction pooler timeout or connection dropped by serverless pause | The backend is preconfigured with `pool_pre_ping=True` and `pool_recycle=300`. Ensure your connection string includes `?sslmode=require`. |
| `CORS Error: Response to preflight request doesn't pass access control check` | Request origin not matched | The backend automatically permits all `https://*.vercel.app` domains. If using a custom domain (e.g. `fest.acharya.ac.in`), add it to `ALLOWED_ORIGINS`. |
| `Invalid username or password` on existing student | Leading/trailing whitespace or casing mismatch | The authentication endpoint trims whitespace on inputs and searches case-insensitively for AUIDs and emails. |
| `401 Unauthorized` after server restart | JWT secret changed across serverless invocations | Ensure `JWT_SECRET_KEY` is set in Vercel environment variables so token verification keys remain constant across instances. |
