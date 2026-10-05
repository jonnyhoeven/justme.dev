#!/usr/bin/env python3
"""Sync local audio library to Cloudflare R2 bucket and generate playlist catalog.

Usage:
  python3 scripts/sync_audio_r2.py [--dry-run] [--prefix PREFIX] [--all-formats]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import boto3
import dotenv

MIME_TYPES: dict[str, str] = {
    ".xm": "audio/xm",
    ".mod": "audio/x-mod",
    ".it": "audio/x-it",
    ".s3m": "audio/x-s3m",
    ".mid": "audio/midi",
    ".midi": "audio/midi",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".v2m": "application/octet-stream",
    ".ahx": "application/octet-stream",
    ".sid": "application/octet-stream",
}


def sanitize_filename(name: str) -> str:
    """Sanitize filename for clean, URL-safe CDN hosting."""
    stem = Path(name).stem
    ext = Path(name).suffix.lower()
    # Normalize unicode to ASCII
    norm = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    # Replace non-alphanumeric (except . - _) with hyphen
    clean = re.sub(r"[^a-zA-Z0-9._-]+", "-", norm)
    # Collapse consecutive hyphens
    clean = re.sub(r"-+", "-", clean).strip("-.")
    return f"{clean}{ext}"


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


def parse_xm_header(filepath: Path) -> dict[str, Any]:
    """Extract tracker metadata from XM module header."""
    try:
        with open(filepath, "rb") as f:
            buf = f.read(80)
            if len(buf) >= 80:
                title = buf[17:37].decode("latin-1", errors="ignore").rstrip("\x00").strip()
                tracker = buf[38:58].decode("latin-1", errors="ignore").rstrip("\x00").strip()
                channels = int.from_bytes(buf[68:70], byteorder="little")
                patterns = int.from_bytes(buf[70:72], byteorder="little")
                bpm = int.from_bytes(buf[78:80], byteorder="little")
                res: dict[str, Any] = {}
                if title:
                    res["title"] = title
                if tracker:
                    res["tracker"] = tracker
                if channels > 0:
                    res["channels"] = channels
                if patterns > 0:
                    res["patterns"] = patterns
                if bpm > 0:
                    res["bpm"] = bpm
                return res
    except Exception:
        pass
    return {}


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


def build_track_entry(
    local_path: Path,
    remote_key: str,
    public_url: str,
) -> dict[str, Any]:
    """Build playlist metadata entry for an audio file."""
    remote_url = f"{public_url}/{remote_key}" if public_url else f"/{remote_key}"
    entry: dict[str, Any] = {
        "filename": Path(remote_key).name,
        "path": remote_key,
        "url": remote_url,
    }

    if local_path.suffix.lower() == ".xm":
        meta = parse_xm_header(local_path)
        entry.update(meta)

    if "title" not in entry or not entry["title"]:
        stem = local_path.stem
        # Clean common keygen prefix / separators for display title
        clean = (
            stem.replace("_", " ")
            .replace("-", " ")
        )
        entry["title"] = " ".join(word.capitalize() for word in clean.split())

    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync audio library to Cloudflare R2")
    parser.add_argument("--dry-run", action="store_true", help="Simulate uploads without executing")
    parser.add_argument("--prefix", default="audio", help="Remote R2 key prefix (default: 'audio')")
    parser.add_argument(
        "--all-formats",
        action="store_true",
        help="Upload all audio files (default is only .xm playable files)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=24,
        help="Number of concurrent upload threads (default: 24)",
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

    audio_root = Path("public/audio").resolve()
    if not audio_root.exists():
        print(f"Error: {audio_root} directory not found", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning {audio_root}...")
    local_files: list[tuple[Path, str]] = []  # (local_path, remote_key)
    tracks: list[dict[str, Any]] = []

    for entry_file in audio_root.iterdir():
        if not entry_file.is_file():
            continue
        if entry_file.name.startswith(".") or entry_file.name == "Thumbs.db":
            continue

        ext = entry_file.suffix.lower()
        if not args.all_formats and ext != ".xm":
            continue

        remote_key = f"{args.prefix}/{entry_file.name}" if args.prefix else entry_file.name
        local_files.append((entry_file, remote_key))

        if ext == ".xm":
            track = build_track_entry(entry_file, remote_key, cfg["public_url"])
            tracks.append(track)

    # Sort tracks deterministically using natural numeric sort
    tracks.sort(
        key=lambda t: [
            int(c) if c.isdigit() else c.lower()
            for c in re.split(r"(\d+)", t["filename"])
        ]
    )
    print(f"Discovered {len(local_files)} files to consider (Playable XM tracks: {len(tracks)}).")

    # Check remote objects for delta sync and deletions
    existing_objects = list_existing_r2_objects(s3, cfg["bucket_name"], args.prefix)
    local_remote_keys = {rk for _, rk in local_files}
    orphaned_keys = [k for k in existing_objects if k not in local_remote_keys]

    to_upload: list[tuple[Path, str]] = []

    for local_path, remote_key in local_files:
        if remote_key in existing_objects:
            rem = existing_objects[remote_key]
            local_size = local_path.stat().st_size
            if rem["size"] == local_size:
                # If sizes match, check MD5 digest against remote ETag
                if rem.get("etag") and "-" not in rem["etag"]:
                    local_hash = compute_file_md5(local_path)
                    if local_hash.lower() == rem["etag"].lower():
                        continue
                else:
                    continue
        to_upload.append((local_path, remote_key))

    print(f"Files needing upload: {len(to_upload)} / {len(local_files)}")
    print(f"Orphaned remote files to delete: {len(orphaned_keys)}")

    # Delete orphaned remote objects (batch delete up to 1000 per request)
    if orphaned_keys:
        for i in range(0, len(orphaned_keys), 1000):
            batch = orphaned_keys[i : i + 1000]
            if args.dry_run:
                for k in batch:
                    print(f"[DRY-RUN] Delete remote {k}")
            else:
                delete_payload = {"Objects": [{"Key": k} for k in batch]}
                s3.delete_objects(Bucket=cfg["bucket_name"], Delete=delete_payload)
                for k in batch:
                    print(f"Deleted remote {k}")
        print(f"Cleaned up {len(orphaned_keys)} orphaned remote files from R2.")

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
                if completed % 100 == 0 or completed == len(to_upload):
                    print(f"Progress: {completed}/{len(to_upload)} files uploaded...")

    # Write catalog JSON to data/music-tracks.json
    output_catalog = Path("data/music-tracks.json")
    output_catalog.parent.mkdir(parents=True, exist_ok=True)
    with open(output_catalog, "w", encoding="utf-8") as f:
        json.dump(tracks, f, indent=2)
        f.write("\n")

    print(f"Wrote {len(tracks)} tracks to {output_catalog}")
    print("Sync process completed successfully!")


if __name__ == "__main__":
    main()
