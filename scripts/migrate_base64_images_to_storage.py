"""
Batch Migration & Audit CLI: Migrate Base64 Images from PostgreSQL to Supabase Storage
Supports both direct Supabase REST API (no database password needed) and direct SQLAlchemy connection.

Usage:
    # 1. Audit & Rank the largest Base64 images:
    python scripts/migrate_base64_images_to_storage.py --rank --limit 50

    # 2. Dry Run (Preview migration):
    python scripts/migrate_base64_images_to_storage.py --dry-run

    # 3. Live 5-Record Test Batch (Step 35):
    python scripts/migrate_base64_images_to_storage.py --live --max-records 5

    # 4. Live Migration in Batches of 10 (Step 36):
    python scripts/migrate_base64_images_to_storage.py --live --table all --batch-size 10
"""

import argparse
import sys
import os
import httpx

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.config import settings
from backend.app.supabase_storage import (
    is_supabase_storage_configured,
    upload_base64_image_to_storage
)

def format_bytes(num_bytes: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:3.2f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.2f} TB"

# =========================================================================
# REST API MODE (Direct to Supabase via HTTPS - No DB password needed)
# =========================================================================

def get_base64_records_rest():
    """Retrieve all Base64 records using Supabase PostgREST API with service role key."""
    url = settings.SUPABASE_URL.rstrip("/")
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }

    records = []
    with httpx.Client(timeout=30.0) as client:
        # 1. Activities
        try:
            resp = client.get(
                f"{url}/rest/v1/activities?select=id,title_en,image&image=like.data:image*",
                headers=headers
            )
            if resp.status_code == 200:
                for act in resp.json():
                    img = act.get("image") or ""
                    records.append({
                        "table": "activities",
                        "id": act["id"],
                        "column": "image",
                        "title": act.get("title_en") or f"Activity #{act['id']}",
                        "size": len(img.encode("utf-8")),
                        "raw_val": img,
                        "folder": "activities",
                    })
        except Exception as e:
            print(f"[WARN] Failed to fetch activities via REST API: {e}")

        # 2. Gallery Items
        try:
            resp = client.get(
                f"{url}/rest/v1/gallery_items?select=id,title_en,image&image=like.data:image*",
                headers=headers
            )
            if resp.status_code == 200:
                for gal in resp.json():
                    img = gal.get("image") or ""
                    records.append({
                        "table": "gallery_items",
                        "id": gal["id"],
                        "column": "image",
                        "title": gal.get("title_en") or f"Gallery #{gal['id']}",
                        "size": len(img.encode("utf-8")),
                        "raw_val": img,
                        "folder": "gallery",
                    })
        except Exception as e:
            print(f"[WARN] Failed to fetch gallery_items via REST API: {e}")

        # 3. Social Posts
        try:
            resp = client.get(
                f"{url}/rest/v1/social_posts?select=id,cover_image&cover_image=like.data:image*",
                headers=headers
            )
            if resp.status_code == 200:
                for soc in resp.json():
                    img = soc.get("cover_image") or ""
                    records.append({
                        "table": "social_posts",
                        "id": soc["id"],
                        "column": "cover_image",
                        "title": f"Reel/Post #{soc['id']}",
                        "size": len(img.encode("utf-8")),
                        "raw_val": img,
                        "folder": "reels",
                    })
        except Exception as e:
            print(f"[WARN] Failed to fetch social_posts via REST API: {e}")

    return records


def update_record_rest(table: str, record_id: int, column: str, new_url: str) -> bool:
    """Updates a record in Supabase via PostgREST PATCH."""
    url = settings.SUPABASE_URL.rstrip("/")
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    endpoint = f"{url}/rest/v1/{table}?id=eq.{record_id}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.patch(endpoint, json={column: new_url}, headers=headers)
        return resp.status_code in (200, 204)

# =========================================================================
# SQLALCHEMY MODE (When direct PostgreSQL connection string is provided)
# =========================================================================

def get_base64_records_sql(db):
    from backend.app.models import Activity, GalleryItem, SocialPost
    records = []

    for act in db.query(Activity).filter(Activity.image.like("data:image/%")).all():
        size = len((act.image or "").encode("utf-8"))
        records.append({
            "table": "activities",
            "id": act.id,
            "column": "image",
            "title": act.title_en or f"Activity #{act.id}",
            "size": size,
            "raw_val": act.image or "",
            "folder": "activities",
            "record": act,
        })

    for item in db.query(GalleryItem).filter(GalleryItem.image.like("data:image/%")).all():
        size = len((item.image or "").encode("utf-8"))
        records.append({
            "table": "gallery_items",
            "id": item.id,
            "column": "image",
            "title": item.title_en or f"Gallery #{item.id}",
            "size": size,
            "raw_val": item.image or "",
            "folder": "gallery",
            "record": item,
        })

    for post in db.query(SocialPost).filter(SocialPost.cover_image.like("data:image/%")).all():
        size = len((post.cover_image or "").encode("utf-8"))
        records.append({
            "table": "social_posts",
            "id": post.id,
            "column": "cover_image",
            "title": f"Reel/Post #{post.id}",
            "size": size,
            "raw_val": post.cover_image or "",
            "folder": "reels",
            "record": post,
        })

    return records


# =========================================================================
# AUDIT & MIGRATION CONTROLLER
# =========================================================================

def audit_top_images(records, limit=50):
    print(f"\nScanning database for the {limit} largest Base64 images...")
    if not records:
        print("✓ No Base64 images found! Database is clean.")
        return

    records.sort(key=lambda x: x["size"], reverse=True)
    total_size = sum(r["size"] for r in records)

    print(f"\nFound {len(records)} total Base64 records (Total Size: {format_bytes(total_size)}).")
    print("-" * 80)
    print(f"{'Rank':<5} {'Table Name':<16} {'Record ID':<12} {'Payload Bytes':<16} {'Payload Size':<15} {'Title'}")
    print("-" * 80)

    for rank, item in enumerate(records[:limit], start=1):
        title = item.get("title", "")[:20]
        print(f"#{rank:<4} {item['table']:<16} #{item['id']:<11} {item['size']:<16} {format_bytes(item['size']):<15} {title}")

    print("-" * 80)


def migrate_records(records, batch_size=10, dry_run=True, max_records=None, db=None, is_rest=False):
    if max_records and max_records > 0:
        records = records[:max_records]

    total_count = len(records)
    if total_count == 0:
        print("✓ No Base64 images to migrate.")
        return 0, 0

    print(f"\nStarting {'DRY RUN' if dry_run else 'LIVE MIGRATION'} of {total_count} records (Batch size: {batch_size})...")
    migrated_count = 0
    total_bytes_saved = 0
    orphaned_objects = []

    for idx, item in enumerate(records, start=1):
        raw_val = item["raw_val"]
        val_size = item["size"]
        total_bytes_saved += val_size
        stable_path = f"legacy/{item['table']}/{item['id']}.webp"

        if dry_run:
            print(f"  [DRY-RUN {idx}/{total_count}] {item['table']} #{item['id']} ({item.get('title', '')}): {format_bytes(val_size)} -> {stable_path}")
        else:
            if not raw_val or not raw_val.startswith("data:image/"):
                print(f"  [SKIP {idx}/{total_count}] {item['table']} #{item['id']} no longer has Base64 value.")
                continue

            try:
                # Step 34 & 39: Convert to WebP, resize max 1600px, upload to stable path
                public_url = upload_base64_image_to_storage(
                    data_url=raw_val,
                    folder=item["folder"],
                    filename_prefix=f"{item['table']}_{item['id']}",
                    optimize=True,
                    custom_path=stable_path
                )

                # Update database record
                success = False
                if is_rest:
                    success = update_record_rest(item["table"], item["id"], item["column"], public_url)
                else:
                    setattr(item["record"], item["column"], public_url)
                    if idx % batch_size == 0 or idx == total_count:
                        db.commit()
                    success = True

                if success:
                    migrated_count += 1
                    print(f"  [MIGRATED {idx}/{total_count}] {item['table']} #{item['id']}: -> {public_url}")
                else:
                    orphaned_objects.append((item['table'], item['id'], public_url))
                    print(f"  [ORPHAN ALERT {idx}/{total_count}] {item['table']} #{item['id']} DB update failed. Storage object: {public_url}")

            except Exception as upload_err:
                if db and not is_rest:
                    db.rollback()
                print(f"  [UPLOAD ERROR {idx}/{total_count}] {item['table']} #{item['id']} upload failed: {upload_err}. Database remains untouched.")

    if db and not is_rest and not dry_run and migrated_count > 0:
        db.commit()

    if orphaned_objects:
        print("\n" + "!" * 80)
        print("ATTENTION: The following Storage objects were uploaded but their database updates failed:")
        for t, rid, url in orphaned_objects:
            print(f"  - Table: {t}, ID: {rid}, Object URL: {url}")
        print("!" * 80)

    return migrated_count, total_bytes_saved


def main():
    parser = argparse.ArgumentParser(description="Audit and migrate Base64 images to Supabase Storage.")
    parser.add_argument("--rank", action="store_true", help="Audit and display the largest Base64 images.")
    parser.add_argument("--limit", type=int, default=50, help="Max records to display in ranking (default: 50).")
    parser.add_argument("--live", action="store_true", help="Perform live migration and update database.")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Dry run only (no changes).")
    parser.add_argument("--table", choices=["activities", "gallery", "reels", "all"], default="all", help="Target table.")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch commit size for live migration (default: 10).")
    parser.add_argument("--max-records", type=int, default=None, help="Maximum records to process in this run (e.g. 5 for test batch).")
    parser.add_argument("--db-url", "--database-url", type=str, default=None, help="Direct PostgreSQL connection URL.")
    parser.add_argument("--supabase-url", type=str, default=None, help="Supabase project URL.")
    parser.add_argument("--supabase-key", "--service-role-key", type=str, default=None, help="Supabase service role secret.")
    parser.add_argument("--bucket", type=str, default=None, help="Supabase Storage bucket name (default: akv-media).")
    args = parser.parse_args()

    # Apply command-line overrides
    if args.supabase_url:
        settings.SUPABASE_URL = args.supabase_url.strip().rstrip("/")
    if args.supabase_key:
        settings.SUPABASE_SERVICE_ROLE_KEY = args.supabase_key.strip()
    if args.bucket:
        settings.SUPABASE_STORAGE_BUCKET = args.bucket.strip()

    is_dry_run = not args.live or args.dry_run

    # Choose between REST mode (PostgREST HTTPS API) and SQLAlchemy mode
    use_rest_mode = False
    db = None

    if args.db_url:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        engine = create_engine(args.db_url, pool_pre_ping=True)
        CustomSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = CustomSession()
        db_target_desc = f"Direct PostgreSQL ({args.db_url.split('@')[-1] if '@' in args.db_url else 'Remote'})"
    elif is_supabase_storage_configured():
        use_rest_mode = True
        db_target_desc = f"Supabase PostgREST HTTPS API ({settings.SUPABASE_URL})"
    else:
        from backend.app.database import SessionLocal
        db = SessionLocal()
        db_target_desc = "Local SQLite (akv_fest.db)"

    print("=" * 75)
    print("AKV Nuditaranga 2026 - Supabase Image Migration CLI")
    print(f"Mode                       : {'DRY RUN (Preview Only)' if is_dry_run else 'LIVE MIGRATION'}")
    print(f"Target Database            : {db_target_desc}")
    print(f"Supabase Storage Bucket    : {settings.SUPABASE_STORAGE_BUCKET}")
    print("=" * 75)

    if not is_dry_run and not is_supabase_storage_configured():
        print("\nERROR: Cannot run live migration because SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.")
        sys.exit(1)

    try:
        if use_rest_mode:
            all_records = get_base64_records_rest()
        else:
            all_records = get_base64_records_sql(db)

        if args.table != "all":
            table_map = {"activities": "activities", "gallery": "gallery_items", "reels": "social_posts"}
            all_records = [r for r in all_records if r["table"] == table_map.get(args.table)]

        if args.rank:
            audit_top_images(all_records, limit=args.limit)
            return

        migrated, b_saved = migrate_records(
            records=all_records,
            batch_size=args.batch_size,
            dry_run=is_dry_run,
            max_records=args.max_records,
            db=db,
            is_rest=use_rest_mode
        )

        print("\n" + "=" * 75)
        print(f"Summary: {len(all_records)} Base64 records scanned. Total payload: {format_bytes(b_saved)}.")
        if is_dry_run:
            print("\nNext step (Step 35 - 5-record test batch):")
            print("    python scripts/migrate_base64_images_to_storage.py --live --max-records 5")
            print("\nNext step (Step 36 - Migrate remaining in batches of 10):")
            print("    python scripts/migrate_base64_images_to_storage.py --live --table all --batch-size 10")
        else:
            print(f"Live migration completed: {migrated} records successfully updated!")
        print("=" * 75)

    finally:
        if db:
            db.close()


if __name__ == "__main__":
    main()
