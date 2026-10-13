"""
Batch Migration & Audit CLI: Migrate Base64 Images from PostgreSQL to Supabase Storage
Usage:
    # 1. Audit & Rank the largest Base64 images:
    python scripts/migrate_base64_images_to_storage.py --rank --limit 50

    # 2. Dry Run (Preview migration):
    python scripts/migrate_base64_images_to_storage.py --dry-run

    # 3. Live Migration (Upload to bucket 'akv-media' and update database URLs in batches):
    python scripts/migrate_base64_images_to_storage.py --live --table all --batch-size 10
"""

import argparse
import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models import Activity, GalleryItem, SocialPost, User
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

def get_base64_records(db):
    """Retrieve all Base64 image records across activities, gallery_items, and social_posts."""
    records = []

    # 1. Activities
    for act in db.query(Activity).filter(Activity.image.like("data:image/%")).all():
        size = len((act.image or "").encode("utf-8"))
        records.append({
            "table": "activities",
            "id": act.id,
            "column": "image",
            "size": size,
            "record": act,
            "folder": "activities",
        })

    # 2. Gallery Items
    for item in db.query(GalleryItem).filter(GalleryItem.image.like("data:image/%")).all():
        size = len((item.image or "").encode("utf-8"))
        records.append({
            "table": "gallery_items",
            "id": item.id,
            "column": "image",
            "size": size,
            "record": item,
            "folder": "gallery",
        })

    # 3. Social Posts
    for post in db.query(SocialPost).filter(SocialPost.cover_image.like("data:image/%")).all():
        size = len((post.cover_image or "").encode("utf-8"))
        records.append({
            "table": "social_posts",
            "id": post.id,
            "column": "cover_image",
            "size": size,
            "record": post,
            "folder": "reels",
        })

    return records

def audit_top_images(db, limit=50):
    print(f"\nScanning database for the {limit} largest Base64 images...")
    records = get_base64_records(db)
    if not records:
        print("✓ No Base64 images found! Database is clean.")
        return

    # Sort descending by payload size
    records.sort(key=lambda x: x["size"], reverse=True)
    total_size = sum(r["size"] for r in records)

    print(f"\nFound {len(records)} total Base64 records (Total Size: {format_bytes(total_size)}).")
    print("-" * 75)
    print(f"{'Rank':<5} {'Table Name':<16} {'Record ID':<12} {'Payload Bytes':<16} {'Payload Size':<15}")
    print("-" * 75)

    for rank, item in enumerate(records[:limit], start=1):
        print(f"#{rank:<4} {item['table']:<16} #{item['id']:<11} {item['size']:<16} {format_bytes(item['size']):<15}")

    print("-" * 75)

def migrate_records(db, records, batch_size=10, dry_run=True):
    total_count = len(records)
    if total_count == 0:
        print("✓ No Base64 images to migrate.")
        return 0, 0

    print(f"\nStarting {'DRY RUN' if dry_run else 'LIVE MIGRATION'} of {total_count} records (Batch size: {batch_size})...")
    migrated_count = 0
    total_bytes_saved = 0

    for idx, item in enumerate(records, start=1):
        raw_val = getattr(item["record"], item["column"]) or ""
        val_size = item["size"]
        total_bytes_saved += val_size

        if dry_run:
            print(f"  [DRY-RUN {idx}/{total_count}] {item['table']} #{item['id']}: {format_bytes(val_size)} -> {item['folder']}/")
        else:
            try:
                public_url = upload_base64_image_to_storage(
                    data_url=raw_val,
                    folder=item["folder"],
                    filename_prefix=f"{item['table']}_{item['id']}"
                )
                setattr(item["record"], item["column"], public_url)
                
                # Commit in batches or individual transactions
                if idx % batch_size == 0 or idx == total_count:
                    db.commit()
                migrated_count += 1
                print(f"  [MIGRATED {idx}/{total_count}] {item['table']} #{item['id']}: -> {public_url}")
            except Exception as e:
                db.rollback()
                print(f"  [ERROR {idx}/{total_count}] {item['table']} #{item['id']} failed: {e}")

    if not dry_run and migrated_count > 0:
        db.commit()

    return migrated_count, total_bytes_saved

def main():
    parser = argparse.ArgumentParser(description="Audit and migrate Base64 images to Supabase Storage.")
    parser.add_argument("--rank", action="store_true", help="Audit and display the largest Base64 images.")
    parser.add_argument("--limit", type=int, default=50, help="Max records to display in ranking (default: 50).")
    parser.add_argument("--live", action="store_true", help="Perform live migration and update database.")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Dry run only (no changes).")
    parser.add_argument("--table", choices=["activities", "gallery", "reels", "all"], default="all", help="Target table.")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch commit size for live migration (default: 10).")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.rank:
            audit_top_images(db, limit=args.limit)
            return

        is_dry_run = not args.live or args.dry_run

        print("=" * 65)
        print(f"AKV Nuditaranga 2026 - Supabase Image Migration CLI")
        print(f"Mode: {'DRY RUN (Preview Only)' if is_dry_run else 'LIVE MIGRATION'}")
        print(f"Supabase Storage Configured: {is_supabase_storage_configured()}")
        print(f"Target Bucket: {settings.SUPABASE_STORAGE_BUCKET}")
        print("=" * 65)

        if not is_dry_run and not is_supabase_storage_configured():
            print("\nERROR: Cannot run live migration because SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.")
            print("Please configure them in your environment (.env or Vercel Environment Variables).")
            sys.exit(1)

        all_records = get_base64_records(db)
        if args.table != "all":
            table_map = {"activities": "activities", "gallery": "gallery_items", "reels": "social_posts"}
            all_records = [r for r in all_records if r["table"] == table_map.get(args.table)]

        migrated, b_saved = migrate_records(db, all_records, batch_size=args.batch_size, dry_run=is_dry_run)

        print("\n" + "=" * 65)
        print(f"Summary: {len(all_records)} Base64 records scanned. Total payload: {format_bytes(b_saved)}.")
        if is_dry_run:
            print("To rank the largest Base64 images, run:")
            print("    python scripts/migrate_base64_images_to_storage.py --rank --limit 50")
            print("\nTo execute live migration in batches, run:")
            print("    python scripts/migrate_base64_images_to_storage.py --live --table all --batch-size 10")
        else:
            print(f"Live migration completed: {migrated} records successfully updated!")
        print("=" * 65)

    finally:
        db.close()

if __name__ == "__main__":
    main()
