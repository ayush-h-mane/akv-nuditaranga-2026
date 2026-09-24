import os
import sys

# Ensure backend package can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# If running on Vercel without a cloud database configured, fallback to /tmp/akv_fest.db
if os.environ.get("VERCEL") and not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/akv_fest.db"

from backend.app.main import app
