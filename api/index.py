import os
import sys

# Ensure backend package can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Validate database configuration on Vercel
if os.environ.get("VERCEL"):
    db_url = os.environ.get("DATABASE_URL")
    if not db_url or "sqlite" in db_url.lower():
        raise RuntimeError(
            "CRITICAL CONFIGURATION ERROR: Persistent DATABASE_URL (PostgreSQL) is required in Vercel production. "
            "Ephemeral SQLite in /tmp will result in data loss across serverless invocations. "
            "Please configure your PostgreSQL connection string (e.g. Supabase, Neon) in your Vercel Project Environment Variables."
        )

from backend.app.main import app
