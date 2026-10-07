#!/usr/bin/env python3
# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
"""Sync the local web font library (fonts/) to the Cloudflare R2 bucket.

Files keep their relative path below the prefix, e.g. fonts/inter/inter-latin.woff2
is served from https://media.justme.dev/fonts/inter/inter-latin.woff2.

Usage:
  python3 scripts/sync_fonts_r2.py [--dry-run] [--prefix PREFIX]
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from pathlib import Path
from typing import Any

import boto3
import dotenv

MIME_TYPES: dict[str, str] = {
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".txt": "text/plain; charset=utf-8",
}

# Licenses stay in the repository (next to the sources) and on the CDN, as the OFL requires.
SYNCED_SUFFIXES = frozenset(MIME_TYPES)


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


def compute_file_md5(filepath: Path) -> str:
    """Calculate MD5 hash of a local file."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def discover_fonts(root: Path, prefix: str) -> list[tuple[Path, str]]:
    """Return (local path, remote key) for every font file below root."""
    files: list[tuple[Path, str]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name.startswith(".") or path.suffix.lower() not in SYNCED_SUFFIXES:
            continue
        relative = path.relative_to(root).as_posix()
        files.append((path, f"{prefix}/{relative}" if prefix else relative))
    return files


def list_existing_r2_objects(s3: Any, bucket: str, prefix: str = "") -> dict[str, dict[str, Any]]:
    """List all objects currently in the R2 bucket under prefix."""
    print(f"Fetching existing objects from R2 bucket '{bucket}' (prefix: '{prefix}')...")
    objects: dict[str, dict[str, Any]] = {}
    paginator = s3.get_paginator("list_objects_v2")
    kwargs = {"Bucket": bucket}
    if prefix:
        kwargs["Prefix"] = f"{prefix}/"

    for page in paginator.paginate(**kwargs):
        for item in page.get("Contents", []):
            objects[item["Key"]] = {"etag": item.get("ETag", "").strip('"'), "size": item.get("Size", 0)}

    print(f"Found {len(objects)} existing remote objects in R2.")
    return objects


def is_up_to_date(local_path: Path, remote: dict[str, Any] | None) -> bool:
    """True when the remote object matches the local file (size and, if single-part, MD5)."""
    if remote is None or remote["size"] != local_path.stat().st_size:
        return False
    etag = remote.get("etag")
    if etag and "-" not in etag:
        return compute_file_md5(local_path).lower() == etag.lower()
    return True


def upload_single_file(s3: Any, bucket: str, local_path: Path, remote_key: str, dry_run: bool = False) -> bool:
    """Upload a single file to R2 with a font Content-Type and long-lived caching."""
    content_type = MIME_TYPES.get(local_path.suffix.lower(), "application/octet-stream")

    if dry_run:
        print(f"[DRY-RUN] Upload {local_path} -> {remote_key} ({content_type})")
        return True

    try:
        extra_args = {
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        }
        s3.upload_file(str(local_path), bucket, remote_key, ExtraArgs=extra_args)
        print(f"Uploaded {remote_key}")
        return True
    except Exception as exc:
        print(f"Failed to upload {remote_key}: {exc}", file=sys.stderr)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync web fonts to Cloudflare R2")
    parser.add_argument("--dry-run", action="store_true", help="Simulate uploads without executing")
    parser.add_argument("--prefix", default="fonts", help="Remote R2 key prefix (default: 'fonts')")
    args = parser.parse_args()

    fonts_root = Path("fonts").resolve()
    if not fonts_root.exists():
        print(f"Error: {fonts_root} directory not found", file=sys.stderr)
        sys.exit(1)

    cfg = load_env()
    s3 = boto3.client(
        "s3",
        endpoint_url=cfg["endpoint_url"],
        aws_access_key_id=cfg["access_key_id"],
        aws_secret_access_key=cfg["secret_access_key"],
        region_name="auto",
    )

    local_files = discover_fonts(fonts_root, args.prefix)
    print(f"Discovered {len(local_files)} font files in {fonts_root}.")

    existing = list_existing_r2_objects(s3, cfg["bucket_name"], args.prefix)
    to_upload = [(lp, rk) for lp, rk in local_files if not is_up_to_date(lp, existing.get(rk))]
    orphaned = sorted(set(existing) - {rk for _, rk in local_files})

    print(f"Fonts needing upload: {len(to_upload)} / {len(local_files)}")
    print(f"Orphaned remote fonts to delete: {len(orphaned)}")

    for key in orphaned:
        if args.dry_run:
            print(f"[DRY-RUN] Delete remote {key}")
        else:
            s3.delete_object(Bucket=cfg["bucket_name"], Key=key)
            print(f"Deleted remote {key}")

    failed = [rk for lp, rk in to_upload if not upload_single_file(s3, cfg["bucket_name"], lp, rk, args.dry_run)]
    if failed:
        print(f"Error: {len(failed)} upload(s) failed", file=sys.stderr)
        sys.exit(1)

    print(f"Font sync completed. Public base URL: {cfg['public_url']}/{args.prefix}/")


if __name__ == "__main__":
    main()
