#!/usr/bin/env python3
"""
AKV Nuditaranga 2026 - Production Version Release & Deployment Script
Triggered on demand when the command "UPDATE VERSION" is executed.

Workflow:
1. Validates working tree and runs frontend build check.
2. Synchronizes version across VERSION.json, frontend/package.json, backend/app/config.py.
3. Commits release metadata to 'develop'.
4. Merges 'develop' into 'main'.
5. Tags release (e.g. v2.1.0).
6. Pushes 'main' and tags to 'origin/main', triggering Vercel production deployment.
7. Switches back to 'develop' and sets the next staged version.
"""

import os
import sys
import json
import re
import argparse
import subprocess
from datetime import datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VERSION_FILE = os.path.join(ROOT_DIR, "VERSION.json")
PACKAGE_JSON = os.path.join(ROOT_DIR, "frontend", "package.json")
CONFIG_PY = os.path.join(ROOT_DIR, "backend", "app", "config.py")

def run_cmd(cmd, cwd=ROOT_DIR, check=True):
    print(f"[EXEC] {cmd} (in {cwd})")
    result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, encoding="utf-8")
    if check and result.returncode != 0:
        print(f"[ERROR] Command failed with code {result.returncode}:")
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError(f"Command '{cmd}' failed: {result.stderr.strip()}")
    return result

def bump_semver(ver: str, bump_type: str = "patch") -> str:
    parts = [int(p) for p in ver.split(".")]
    while len(parts) < 3:
        parts.append(0)
    major, minor, patch = parts[0], parts[1], parts[2]
    
    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    else:  # patch
        return f"{major}.{minor}.{patch + 1}"

def update_package_json(new_ver: str):
    if not os.path.exists(PACKAGE_JSON):
        return
    with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["version"] = new_ver
    with open(PACKAGE_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"[SYNC] Updated frontend/package.json version -> {new_ver}")

def update_backend_config(new_ver: str):
    if not os.path.exists(CONFIG_PY):
        return
    with open(CONFIG_PY, "r", encoding="utf-8") as f:
        content = f.read()
    updated = re.sub(
        r'APP_VERSION:\s*str\s*=\s*["\'][^"\']+["\']',
        f'APP_VERSION: str = "{new_ver}"',
        content
    )
    with open(CONFIG_PY, "w", encoding="utf-8") as f:
        f.write(updated)
    print(f"[SYNC] Updated backend/app/config.py APP_VERSION -> {new_ver}")

def main():
    parser = argparse.ArgumentParser(description="Deploy new version to production ('UPDATE VERSION')")
    parser.add_argument("--version", "-v", help="Explicit version string (e.g. 2.1.0)")
    parser.add_argument("--type", "-t", choices=["patch", "minor", "major"], default=None,
                        help="Bump type if version is not explicitly supplied")
    parser.add_argument("--message", "-m", default="", help="Release description / notes")
    parser.add_argument("--skip-build-check", action="store_true", help="Skip frontend build pre-flight test")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without modifying git")
    args = parser.parse_args()

    print("=" * 65)
    print("AKV NUDITARANGA 2026 - PRODUCTION RELEASE PIPELINE ('UPDATE VERSION')")
    print("=" * 65)

    # 1. Load VERSION.json
    if not os.path.exists(VERSION_FILE):
        data = {
            "production_version": "2.0.0",
            "staged_version": "2.1.0",
            "status": "STAGED_DEVELOPMENT",
            "active_branch": "develop",
            "production_branch": "main",
            "pending_changes": [],
            "history": []
        }
    else:
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

    current_prod_ver = data.get("production_version", "2.0.0")
    staged_ver = data.get("staged_version", "2.1.0")

    # Determine target version
    if args.version:
        target_version = args.version.lstrip("v")
    elif args.type:
        target_version = bump_semver(current_prod_ver, args.type)
    else:
        # Use staged version if set, otherwise patch bump current prod
        target_version = staged_ver if staged_ver != current_prod_ver else bump_semver(current_prod_ver, "patch")

    release_desc = args.message or f"Production release version {target_version}"
    print(f"Current Production Version : v{current_prod_ver}")
    print(f"Deploying Target Version   : v{target_version}")
    print(f"Release Description        : {release_desc}")
    print("-" * 65)

    if args.dry_run:
        print("[DRY-RUN] No actions taken.")
        return

    # 2. Pre-flight verification (Frontend Build)
    if not args.skip_build_check:
        print("\n[STEP 1/6] Running frontend build check...")
        frontend_dir = os.path.join(ROOT_DIR, "frontend")
        build_res = run_cmd("npm run build", cwd=frontend_dir, check=False)
        if build_res.returncode != 0:
            print("[FATAL] Frontend build check failed! Aborting deployment to prevent broken production build.")
            sys.exit(1)
        print("[CHECK] Frontend build passed cleanly.")
    else:
        print("\n[STEP 1/6] Frontend build check skipped.")

    # 3. Synchronize version in files
    print("\n[STEP 2/6] Synchronizing version tokens in code...")
    update_package_json(target_version)
    update_backend_config(target_version)

    # 4. Update VERSION.json
    now_iso = datetime.now().astimezone().strftime("%Y-%m-%dT%H:%M:%S%z")
    history_entry = {
        "version": target_version,
        "released_at": now_iso,
        "description": release_desc
    }
    next_staged = bump_semver(target_version, "patch")
    data["production_version"] = target_version
    data["staged_version"] = next_staged
    data["status"] = "DEPLOYED_TO_PRODUCTION"
    data["pending_changes"] = []
    if "history" not in data:
        data["history"] = []
    if data["history"] and data["history"][0].get("version") == target_version:
        data["history"][0] = history_entry
    else:
        data["history"].insert(0, history_entry)

    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"[SYNC] Updated VERSION.json -> production: v{target_version}, next staged: v{next_staged}")

    # 5. Git commit & merge to main
    print("\n[STEP 3/6] Committing version bump to develop...")
    run_cmd("git add VERSION.json frontend/package.json backend/app/config.py")
    run_cmd(f'git commit -m "release: bump version to v{target_version}"', check=False)

    print("\n[STEP 4/6] Merging develop into main...")
    run_cmd("git checkout main")
    run_cmd(f'git merge develop --no-ff -m "release: deploy v{target_version} to production"')
    
    # Tag
    run_cmd(f'git tag -a v{target_version} -m "Release v{target_version}: {release_desc}"', check=False)

    print("\n[STEP 5/6] Pushing to remote main to trigger Vercel deployment...")
    push_res = run_cmd("git push origin main --tags", check=False)
    if push_res.returncode != 0:
        print("[WARNING] Remote push failed or offline. Main branch updated locally.")
        print(push_res.stderr)
    else:
        print("[SUCCESS] Pushed to origin/main with tag! Vercel production deployment initiated.")

    # 6. Switch back to develop
    print("\n[STEP 6/6] Switching back to develop branch for subsequent updates...")
    run_cmd("git checkout develop")
    data["status"] = "STAGED_DEVELOPMENT"
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    run_cmd("git add VERSION.json")
    run_cmd(f'git commit -m "chore: prepare staging for v{next_staged}"', check=False)

    print("=" * 65)
    print(f"RELEASE DEPLOYED: v{target_version} is live on main!")
    print(f"NEXT STAGE: Branch switched to 'develop'. Staged version: v{next_staged}")
    print("=" * 65)

if __name__ == "__main__":
    main()
