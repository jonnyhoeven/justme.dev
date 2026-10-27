#!/usr/bin/env python3
# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
"""Sync local audio library to Cloudflare R2 bucket and generate playlist catalog.

Usage:
  python3 scripts/sync_audio_r2.py [--dry-run] [--prefix PREFIX] [--all-formats]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    "build_track_entry",
    "compute_file_md5",
    "create_s3_client",
    "delete_orphaned_objects",
    "is_up_to_date",
    "list_existing_r2_objects",
    "load_env",
    "main",
    "parse_xm_header",
    "upload_single_file",
]

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


def parse_xm_header(filepath: Path) -> dict[str, Any]:
    """Extract tracker metadata from XM module header."""
    try:
        with open(filepath, "rb") as f:
            buf = f.read(80)
            if len(buf) >= 80:
                title = buf[17:37].decode("cp437", errors="ignore").rstrip("\x00").strip()
                tracker = buf[38:58].decode("cp437", errors="ignore").rstrip("\x00").strip()
                channels = int.from_bytes(buf[68:70], byteorder="little")
                bpm = int.from_bytes(buf[78:80], byteorder="little")
                res: dict[str, Any] = {}
                if title:
                    res["title"] = title
                if tracker:
                    res["tracker"] = tracker
                if channels > 0:
                    res["channels"] = channels
                if bpm > 0:
                    res["bpm"] = bpm
                return res
    except Exception:
        pass
    return {}


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
    s3 = create_s3_client(cfg)

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
    orphaned_keys = sorted(k for k in existing_objects if k not in local_remote_keys)

    to_upload: list[tuple[Path, str]] = [
        (lp, rk) for lp, rk in local_files if not is_up_to_date(lp, existing_objects.get(rk))
    ]

    print(f"Files needing upload: {len(to_upload)} / {len(local_files)}")
    print(f"Orphaned remote files to delete: {len(orphaned_keys)}")

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
                if completed % 100 == 0 or completed == len(to_upload):
                    print(f"Progress: {completed}/{len(to_upload)} files uploaded...")

        if failed:
            print(f"Error: {len(failed)} upload(s) failed", file=sys.stderr)
            sys.exit(1)

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
