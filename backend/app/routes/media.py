from io import BytesIO
from uuid import uuid4
import httpx
from PIL import Image, UnidentifiedImageError
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from ..auth_deps import require_admin
from ..config import settings

router = APIRouter(prefix="/media", tags=["Media"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user=Depends(require_admin),
):
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Image storage is not configured.",
        )

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPEG, PNG, or WebP image.",
        )

    # Read and validate file size
    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image file exceeds 10MB limit.",
        )

    if len(raw_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    # Process and validate image with Pillow
    try:
        img = Image.open(BytesIO(raw_bytes))
        img.verify()
        # Re-open after verify() as verify invalidates file pointer
        img = Image.open(BytesIO(raw_bytes))
    except (UnidentifiedImageError, Exception) as e:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image file.",
        ) from e

    # Protect against pixel flood DoS
    width, height = img.size
    if width * height > MAX_IMAGE_PIXELS:
        raise HTTPException(
            status_code=400,
            detail="Image dimensions exceed allowed limit (20 megapixels).",
        )

    # Convert to WebP
    output = BytesIO()
    try:
        # Preserve transparency for RGBA / LA modes, otherwise convert to RGB
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            processed_img = img.convert("RGBA")
        else:
            processed_img = img.convert("RGB")

        # Step 39: Limit maximum dimension to 1600 pixels while preserving aspect ratio
        MAX_DIMENSION = 1600
        if processed_img.width > MAX_DIMENSION or processed_img.height > MAX_DIMENSION:
            processed_img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

        processed_img.save(output, format="WEBP", quality=80, method=6)
        webp_bytes = output.getvalue()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}",
        ) from e

    # Unique storage path in bucket
    storage_path = f"images/{uuid4().hex}.webp"
    bucket = settings.SUPABASE_STORAGE_BUCKET or "akv-media"
    upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}"

    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "image/webp",
        "x-upsert": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(upload_url, content=webp_bytes, headers=headers)
            if resp.status_code not in (200, 201):
                raise HTTPException(
                    status_code=502,
                    detail=f"Storage upload failed ({resp.status_code}): {resp.text}",
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Storage service request error: {str(e)}",
        ) from e

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"

    return {
        "url": public_url,
        "filename": storage_path.split("/")[-1],
        "content_type": "image/webp",
        "size_bytes": len(webp_bytes),
        "original_size_bytes": len(raw_bytes),
        "width": processed_img.width,
        "height": processed_img.height,
    }
