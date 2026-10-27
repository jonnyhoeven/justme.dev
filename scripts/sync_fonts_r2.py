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
import sys
from pathlib import Path
from typing import Any

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
    "discover_fonts",
    "is_up_to_date",
    "list_existing_r2_objects",
    "load_env",
    "main",
    "upload_single_file",
]

MIME_TYPES: dict[str, str] = {
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".txt": "text/plain; charset=utf-8",
}

# Licenses stay in the repository (next to the sources) and on the CDN, as the OFL requires.
SYNCED_SUFFIXES = frozenset(MIME_TYPES)


def discover_fonts(root: Path, prefix: str) -> list[tuple[Path, str]]:
    """Return (local path, remote key) for every font file below root."""
    files: list[tuple[Path, str]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name.startswith(".") or path.suffix.lower() not in SYNCED_SUFFIXES:
            continue
        relative = path.relative_to(root).as_posix()
        files.append((path, f"{prefix}/{relative}" if prefix else relative))
    return files


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
    s3 = create_s3_client(cfg)

    local_files = discover_fonts(fonts_root, args.prefix)
    print(f"Discovered {len(local_files)} font files in {fonts_root}.")

    existing = list_existing_r2_objects(s3, cfg["bucket_name"], args.prefix)
    to_upload = [(lp, rk) for lp, rk in local_files if not is_up_to_date(lp, existing.get(rk))]
    orphaned = sorted(set(existing) - {rk for _, rk in local_files})

    print(f"Fonts needing upload: {len(to_upload)} / {len(local_files)}")
    print(f"Orphaned remote fonts to delete: {len(orphaned)}")

    delete_orphaned_objects(s3, cfg["bucket_name"], orphaned, args.dry_run)

    failed = [rk for lp, rk in to_upload if not upload_single_file(s3, cfg["bucket_name"], lp, rk, args.dry_run)]
    if failed:
        print(f"Error: {len(failed)} upload(s) failed", file=sys.stderr)
        sys.exit(1)

    print(f"Font sync completed. Public base URL: {cfg['public_url']}/{args.prefix}/")


if __name__ == "__main__":
    main()
