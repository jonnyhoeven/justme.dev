# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
"""Common utilities for Cloudflare R2 bucket synchronization scripts."""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path
from typing import Any

import boto3
import dotenv


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


def list_existing_r2_objects(s3: Any, bucket: str, prefix: str = "") -> dict[str, dict[str, Any]]:
    """List all objects currently in the R2 bucket under prefix."""
    print(f"Fetching existing objects from R2 bucket '{bucket}' (prefix: '{prefix}')...")
    objects: dict[str, dict[str, Any]] = {}
    paginator = s3.get_paginator("list_objects_v2")
    kwargs: dict[str, Any] = {"Bucket": bucket}
    if prefix:
        kwargs["Prefix"] = f"{prefix.rstrip('/')}/"

    for page in paginator.paginate(**kwargs):
        for item in page.get("Contents", []):
            key = item["Key"]
            etag = item.get("ETag", "").strip('"')
            size = item.get("Size", 0)
            objects[key] = {"etag": etag, "size": size}

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


def create_s3_client(cfg: dict[str, str]) -> Any:
    """Create a boto3 S3 client configured for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=cfg["endpoint_url"],
        aws_access_key_id=cfg["access_key_id"],
        aws_secret_access_key=cfg["secret_access_key"],
        region_name="auto",
    )


def delete_orphaned_objects(
    s3: Any,
    bucket: str,
    orphaned_keys: list[str],
    dry_run: bool = False,
) -> None:
    """Delete orphaned remote objects from R2 in batches of up to 1000."""
    if not orphaned_keys:
        return

    for i in range(0, len(orphaned_keys), 1000):
        batch = orphaned_keys[i : i + 1000]
        if dry_run:
            for k in batch:
                print(f"[DRY-RUN] Delete remote {k}")
        else:
            delete_payload = {"Objects": [{"Key": k} for k in batch]}
            s3.delete_objects(Bucket=bucket, Delete=delete_payload)
            for k in batch:
                print(f"Deleted remote {k}")

    print(f"Cleaned up {len(orphaned_keys)} orphaned remote files from R2.")
