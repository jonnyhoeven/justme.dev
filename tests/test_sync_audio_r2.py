# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scripts.sync_audio_r2 import (
    build_track_entry,
    compute_file_md5,
    list_existing_r2_objects,
    load_env,
    main,
    parse_xm_header,
    sanitize_filename,
    upload_single_file,
)


def test_sanitize_filename() -> None:
    assert sanitize_filename("foo bar + baz.xm") == "foo-bar-baz.xm"
    assert sanitize_filename("TSRh - UltraEdit 11.x crk.xm") == "TSRh-UltraEdit-11.x-crk.xm"
    assert sanitize_filename("!Others-test.xm") == "Others-test.xm"


def test_load_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://example.com")
    monkeypatch.setenv("R2_BUCKET_NAME", "test-bucket")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_URL", "https://media.test.com/")

    with patch("dotenv.load_dotenv"):
        cfg = load_env()
        assert cfg["endpoint_url"] == "https://example.com"
        assert cfg["bucket_name"] == "test-bucket"
        assert cfg["public_url"] == "https://media.test.com"


def test_load_env_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("R2_ENDPOINT_URL", raising=False)
    monkeypatch.setattr(os, "environ", {})
    with patch("dotenv.load_dotenv"), pytest.raises(SystemExit):
        load_env()


def test_parse_xm_header(tmp_path: Path) -> None:
    # Build minimal valid XM header buffer
    buf = bytearray(80)
    buf[0:17] = b"Extended Module: "
    buf[17:37] = b"Test Song Title\x00\x00\x00\x00\x00"
    buf[38:58] = b"FastTracker v2.00\x00\x00\x00"
    buf[68:70] = (16).to_bytes(2, "little")  # channels
    buf[70:72] = (10).to_bytes(2, "little")  # patterns
    buf[78:80] = (125).to_bytes(2, "little")  # bpm

    test_file = tmp_path / "test.xm"
    test_file.write_bytes(buf)

    meta = parse_xm_header(test_file)
    assert meta["title"] == "Test Song Title"
    assert meta["tracker"] == "FastTracker v2.00"
    assert meta["channels"] == 16
    assert meta["patterns"] == 10
    assert meta["bpm"] == 125


def test_parse_xm_header_invalid(tmp_path: Path) -> None:
    test_file = tmp_path / "empty.xm"
    test_file.write_bytes(b"short")
    assert parse_xm_header(test_file) == {}


def test_compute_file_md5(tmp_path: Path) -> None:
    test_file = tmp_path / "data.bin"
    test_file.write_bytes(b"hello world")
    md5 = compute_file_md5(test_file)
    assert md5 == "5eb63bbbe01eeed093cb22bb8f5acdc3"


def test_list_existing_r2_objects() -> None:
    mock_s3 = MagicMock()
    mock_paginator = MagicMock()
    mock_s3.get_paginator.return_value = mock_paginator
    mock_paginator.paginate.return_value = [
        {"Contents": [{"Key": "audio/track1.xm", "ETag": '"etag1"', "Size": 1234}]}
    ]

    objs = list_existing_r2_objects(mock_s3, "test-bucket", "audio")
    assert "audio/track1.xm" in objs
    assert objs["audio/track1.xm"]["size"] == 1234
    assert objs["audio/track1.xm"]["etag"] == "etag1"


def test_upload_single_file(tmp_path: Path) -> None:
    test_file = tmp_path / "track.xm"
    test_file.write_bytes(b"content")

    mock_s3 = MagicMock()
    # Dry run
    assert upload_single_file(mock_s3, "bucket", test_file, "audio/track.xm", dry_run=True) is True
    mock_s3.upload_file.assert_not_called()

    # Real run
    assert upload_single_file(mock_s3, "bucket", test_file, "audio/track.xm", dry_run=False) is True
    mock_s3.upload_file.assert_called_once()

    # Failure handling
    mock_s3.upload_file.side_effect = Exception("S3 error")
    assert upload_single_file(mock_s3, "bucket", test_file, "audio/track.xm", dry_run=False) is False


def test_build_track_entry(tmp_path: Path) -> None:
    test_file = tmp_path / "my_keygen_track.xm"
    test_file.write_bytes(b"")

    entry = build_track_entry(test_file, "audio/my_keygen_track.xm", "https://media.justme.dev")
    assert entry["filename"] == "my_keygen_track.xm"
    assert entry["path"] == "audio/my_keygen_track.xm"
    assert entry["url"] == "https://media.justme.dev/audio/my_keygen_track.xm"
    assert entry["title"] == "My Keygen Track"


def test_sync_main_flow(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://example.com")
    monkeypatch.setenv("R2_BUCKET_NAME", "media")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_URL", "https://media.justme.dev")

    audio_dir = tmp_path / "public" / "audio"
    audio_dir.mkdir(parents=True)
    sample_xm = audio_dir / "1_test.xm"
    sample_xm.write_bytes(b"Extended Module: " + b"\x00" * 70)

    # Change cwd to tmp_path
    monkeypatch.chdir(tmp_path)

    with (
        patch("boto3.client") as mock_client_factory,
        patch("sys.argv", ["sync_audio_r2.py", "--dry-run"]),
    ):
        mock_s3 = MagicMock()
        mock_client_factory.return_value = mock_s3
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = []

        main()

        assert os.path.exists("data/music-tracks.json")
