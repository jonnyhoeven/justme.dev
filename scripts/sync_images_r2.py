#!/usr/bin/env python3
# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
"""Sync local images library (public/images/) to Cloudflare R2 bucket.

Usage:
  python3 scripts/sync_images_r2.py [--dry-run] [--prefix PREFIX]
"""

from __future__ import annotations

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

# Ensure scripts directory and repo root are on sys.path for direct script & test execution
_scripts_dir = Path(__file__).resolve().parent
_repo_root = _scripts_dir.parent
for _p in (str(_repo_root), str(_scripts_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from scripts.r2_common import (
        compute_file_md5,
        create_s3_client,
        delete_orphaned_objects,
        is_up_to_date,
        list_existing_r2_objects,
        load_env,
    )
except ImportError:
    from r2_common import (
        compute_file_md5,
        create_s3_client,
        delete_orphaned_objects,
        is_up_to_date,
        list_existing_r2_objects,
        load_env,
    )

__all__ = [
    "compute_file_md5",
    "create_s3_client",
    "delete_orphaned_objects",
    "is_up_to_date",
    "list_existing_r2_objects",
    "load_env",
    "main",
    "upload_single_file",
]

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
    s3 = create_s3_client(cfg)

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
    local_remote_keys = {rk for _, rk in local_files}
    orphaned_keys = sorted(k for k in existing_objects if k not in local_remote_keys)

    to_upload: list[tuple[Path, str]] = [
        (lp, rk) for lp, rk in local_files if not is_up_to_date(lp, existing_objects.get(rk))
    ]

    print(f"Images needing upload: {len(to_upload)} / {len(local_files)}")
    print(f"Orphaned remote images to delete: {len(orphaned_keys)}")

    delete_orphaned_objects(s3, cfg["bucket_name"], orphaned_keys, args.dry_run)

    if to_upload:
        completed = 0
        failed: list[str] = []
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
            for future in as_completed(futures):
                rk = futures[future]
                try:
                    if not future.result():
                        failed.append(rk)
                except Exception as exc:
                    print(f"Upload error for {rk}: {exc}", file=sys.stderr)
                    failed.append(rk)
                completed += 1
                print(f"Progress: {completed}/{len(to_upload)} images uploaded...")

        if failed:
            print(f"Error: {len(failed)} upload(s) failed", file=sys.stderr)
            sys.exit(1)

    print("Image sync process completed successfully!")


if __name__ == "__main__":
    main()
