#!/usr/bin/env python3
"""Sync local images library (public/images/) to Cloudflare R2 bucket.

Usage:
  python3 scripts/sync_images_r2.py [--dry-run] [--prefix PREFIX]
"""

from __future__ import annotations

import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import boto3
import dotenv

MIME_TYPES: dict[str, str] = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
}


def load_env() -> dict[str, str]:
    """Load configuration from environment and .env file."""
    dotenv.load_dotenv()
    required = [
        "R2_ENDPOINT_URL",
        "R2_BUCKET_NAME",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"Error: Missing required environment variables: {', '.join(missing)}", file=sys.stderr)
        print("Please check your .env file or export them.", file=sys.stderr)
        sys.exit(1)

    return {
        "endpoint_url": os.environ["R2_ENDPOINT_URL"],
        "bucket_name": os.environ["R2_BUCKET_NAME"],
        "access_key_id": os.environ["R2_ACCESS_KEY_ID"],
        "secret_access_key": os.environ["R2_SECRET_ACCESS_KEY"],
        "public_url": os.getenv("R2_PUBLIC_URL", "https://media.justme.dev").rstrip("/"),
    }


def list_existing_r2_objects(s3: Any, bucket: str, prefix: str = "") -> dict[str, dict[str, Any]]:
    """List all objects currently in the R2 bucket under prefix."""
    print(f"Fetching existing objects from R2 bucket '{bucket}' (prefix: '{prefix}')...")
    objects: dict[str, dict[str, Any]] = {}
    paginator = s3.get_paginator("list_objects_v2")
    kwargs = {"Bucket": bucket}
    if prefix:
        kwargs["Prefix"] = prefix

    for page in paginator.paginate(**kwargs):
        for item in page.get("Contents", []):
            key = item["Key"]
            etag = item.get("ETag", "").strip('"')
            size = item.get("Size", 0)
            objects[key] = {"etag": etag, "size": size}

    print(f"Found {len(objects)} existing remote objects in R2.")
    return objects


def upload_single_file(
    s3: Any,
    bucket: str,
    local_path: Path,
    remote_key: str,
    dry_run: bool = False,
) -> bool:
    """Upload a single file to R2 with appropriate Content-Type."""
    ext = local_path.suffix.lower()
    content_type = MIME_TYPES.get(ext, "application/octet-stream")

    if dry_run:
        print(f"[DRY-RUN] Upload {local_path} -> {remote_key} ({content_type})")
        return True

    try:
        extra_args = {
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        }
        s3.upload_file(str(local_path), bucket, remote_key, ExtraArgs=extra_args)
        return True
    except Exception as exc:
        print(f"Failed to upload {remote_key}: {exc}", file=sys.stderr)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync images library to Cloudflare R2")
    parser.add_argument("--dry-run", action="store_true", help="Simulate uploads without executing")
    parser.add_argument("--prefix", default="images", help="Remote R2 key prefix (default: 'images')")
    parser.add_argument(
        "--concurrency",
        type=int,
        default=12,
        help="Number of concurrent upload threads (default: 12)",
    )
    args = parser.parse_args()

    cfg = load_env()
    s3 = boto3.client(
        "s3",
        endpoint_url=cfg["endpoint_url"],
        aws_access_key_id=cfg["access_key_id"],
        aws_secret_access_key=cfg["secret_access_key"],
        region_name="auto",
    )

    images_root = Path("public/images").resolve()
    if not images_root.exists():
        print(f"Error: {images_root} directory not found", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning {images_root}...")
    local_files: list[tuple[Path, str]] = []

    for entry_file in images_root.iterdir():
        if not entry_file.is_file():
            continue
        if entry_file.name.startswith(".") or entry_file.name == "Thumbs.db":
            continue

        remote_key = f"{args.prefix}/{entry_file.name}" if args.prefix else entry_file.name
        local_files.append((entry_file, remote_key))

    print(f"Discovered {len(local_files)} image files.")

    existing_objects = list_existing_r2_objects(s3, cfg["bucket_name"], args.prefix)
    to_upload: list[tuple[Path, str]] = []

    for local_path, remote_key in local_files:
        if remote_key in existing_objects:
            rem = existing_objects[remote_key]
            local_size = local_path.stat().st_size
            if rem["size"] == local_size:
                continue
        to_upload.append((local_path, remote_key))

    print(f"Images needing upload: {len(to_upload)} / {len(local_files)}")

    if to_upload:
        completed = 0
        with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
            futures = {
                executor.submit(
                    upload_single_file,
                    s3,
                    cfg["bucket_name"],
                    lp,
                    rk,
                    args.dry_run,
                ): rk
                for lp, rk in to_upload
            }
            for _ in as_completed(futures):
                completed += 1
                print(f"Progress: {completed}/{len(to_upload)} images uploaded...")

    print("Image sync process completed successfully!")


if __name__ == "__main__":
    main()
