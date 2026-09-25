import os
import sys
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Ensure backend package can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

def _configuration_error_app(message: str) -> FastAPI:
    app = FastAPI(title="AKV API Configuration Error")

    @app.get("/api/health")
    async def health_check():
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "detail": message}
        )

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
    async def configuration_error(path: str):
        return JSONResponse(
            status_code=503,
            content={"detail": message, "error_code": "SERVER_CONFIGURATION_ERROR"}
        )

    return app


app = None


try:
    # Production must use persistent PostgreSQL; never silently fall back to ephemeral SQLite.
    if os.environ.get("VERCEL"):
        db_url = os.environ.get("DATABASE_URL")
        if not db_url or "sqlite" in db_url.lower():
            raise RuntimeError(
                "Persistent DATABASE_URL (PostgreSQL) is required in Vercel production. "
                "Configure DATABASE_URL in Vercel Project Settings > Environment Variables, then redeploy."
            )

    from backend.app.main import app
except RuntimeError as error:
    app = _configuration_error_app(str(error))
except Exception as error:
    print(f"[API STARTUP ERROR] {error!r}", flush=True)
    if isinstance(error, ModuleNotFoundError):
        app = _configuration_error_app(
            f"API startup failed: missing Python module '{error.name}'."
        )
    else:
        app = _configuration_error_app(
            f"API startup failed ({type(error).__name__}). Check the production database configuration."
        )
