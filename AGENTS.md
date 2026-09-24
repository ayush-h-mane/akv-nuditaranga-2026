# Agent Rules & Version Deployment Protocol

## STRICT RULE: Staged Versioning & Production Deployment Control

### 1. No Immediate Production Deployments
- **Never push to `main` or trigger production deployment during feature development or regular updates.**
- All user requests, code modifications, bug fixes, and feature additions must be implemented on the `develop` branch (or local development tree).
- Vercel automatically deploys commits on `main`. Therefore, `main` must remain clean, stable, and locked to the current production release.

### 2. Staging New Versions
- As updates are made, track them in `VERSION.json`:
  - `staged_version`: represents the upcoming release version (e.g. `2.1.0`).
  - `pending_changes`: list of summary bullet points describing the changes in the staged version.
- Build and test locally using:
  - Frontend: `npm run dev` / `npm run build`
  - Backend: `uvicorn backend.app.main:app` / python test scripts

### 3. The "UPDATE VERSION" Trigger
- **ONLY when the user explicitly issues the command `"UPDATE VERSION"` (or specifically requests to deploy the version):**
  1. Verify the frontend builds cleanly (`npm run build` in `frontend/`).
  2. Execute `python scripts/update_version.py` (or run `update_version.bat`).
  3. This script will:
     - Synchronize the new version number in `VERSION.json`, `frontend/package.json`, and `backend/app/config.py`.
     - Commit the release changes to `develop`.
     - Checkout `main`, merge `develop` into `main`, and create a release git tag (e.g., `v2.1.0`).
     - Push `main` and tags to `origin/main`, which triggers the Vercel production deployment.
     - Switch back to `develop` for the next staged cycle.
  4. Report the deployed version, git commit hash, and deployment confirmation back to the user.
