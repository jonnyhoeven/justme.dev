# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import json
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
    read_catalog,
    read_catalog_trackers,
    upload_single_file,
    write_catalog,
)


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
    mock_paginator.paginate.return_value = [{"Contents": [{"Key": "audio/track1.xm", "ETag": '"etag1"', "Size": 1234}]}]

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
    assert "path" not in entry
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


def test_sync_main_flow_upload_failure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://example.com")
    monkeypatch.setenv("R2_BUCKET_NAME", "media")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_URL", "https://media.justme.dev")

    audio_dir = tmp_path / "public" / "audio"
    audio_dir.mkdir(parents=True)
    sample_xm = audio_dir / "1_test.xm"
    sample_xm.write_bytes(b"Extended Module: " + b"\x00" * 70)

    monkeypatch.chdir(tmp_path)

    with (
        patch("boto3.client") as mock_client_factory,
        patch("scripts.sync_audio_r2.upload_single_file", return_value=False),
        patch("sys.argv", ["sync_audio_r2.py"]),
        pytest.raises(SystemExit) as exc_info,
    ):
        mock_s3 = MagicMock()
        mock_client_factory.return_value = mock_s3
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = []

        main()

    assert exc_info.value.code == 1


def test_catalog_roundtrip_and_format(tmp_path: Path) -> None:
    path = tmp_path / "data" / "music-tracks.json"
    tracks = [
        {"filename": "a.xm", "url": "x/a.xm", "title": "A", "channels": 8, "bpm": 125, "tracker": "FT2"},
        {"filename": "b.xm", "url": "x/b.xm", "title": "B", "tracker": "MT"},
        {"filename": "c.xm", "url": "x/c.xm", "title": "Caf\u00e9"},
    ]
    write_catalog(tracks, path)

    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    assert data["version"] == 2
    assert data["trackers"] == ["FT2", "MT"]
    assert data["tracks"] == [["a.xm", "A", 8, 125, 0], ["b.xm", "B", None, None, 1], ["c.xm", "Caf\u00e9"]]
    assert "url" not in text
    # One track per line keeps git diffs per-track.
    assert '["a.xm","A",8,125,0],\n["b.xm","B",null,null,1],\n["c.xm","Caf\u00e9"]\n' in text

    assert read_catalog(path) == [{k: v for k, v in t.items() if k != "url"} for t in tracks]


def test_catalog_keeps_tracker_indices_stable(tmp_path: Path) -> None:
    path = tmp_path / "music-tracks.json"
    write_catalog([{"filename": "b.xm", "title": "B", "tracker": "Z"}], path)
    write_catalog(
        [
            {"filename": "a.xm", "title": "A", "tracker": "A-tracker"},
            {"filename": "b.xm", "title": "B", "tracker": "Z"},
        ],
        path,
    )
    assert read_catalog_trackers(path) == ["Z", "A-tracker"]


def test_read_catalog_rejects_unknown_format(tmp_path: Path) -> None:
    path = tmp_path / "music-tracks.json"
    path.write_text("[]", encoding="utf-8")
    assert read_catalog_trackers(path) == []
    assert read_catalog_trackers(tmp_path / "missing.json") == []
    path.write_text(json.dumps({"version": 1}), encoding="utf-8")
    with pytest.raises(ValueError):
        read_catalog(path)


def test_parse_xm_header_interior_nul_bytes(tmp_path: Path) -> None:
    buf = bytearray(80)
    buf[0:17] = b"Extended Module: "
    buf[17:37] = b"Clean Title\x00junk\x00\x00\x00"
    buf[38:58] = b"FastTracker 2\x00junk\x00"
    buf[68:70] = (8).to_bytes(2, "little")
    buf[78:80] = (120).to_bytes(2, "little")

    test_file = tmp_path / "test_nul.xm"
    test_file.write_bytes(buf)

    meta = parse_xm_header(test_file)
    assert meta["title"] == "Clean Title"
    assert meta["tracker"] == "FastTracker 2"


def test_read_and_write_catalog_deduplicates_nul_trackers(tmp_path: Path) -> None:
    path = tmp_path / "music-tracks.json"
    raw_catalog = {
        "version": 2,
        "fields": ["filename", "title", "channels", "bpm", "tracker"],
        "trackers": [
            "FastTracker v2.00",
            "MadTracker 2.0",
            "MadTracker 2.0\x00\x19%Õó",
            "MadTracker 2.0\x00:ã‰Ò",
        ],
        "tracks": [
            ["a.xm", "Track A", 8, 125, 0],
            ["b.xm", "Track B", 8, 125, 1],
            ["c.xm", "Track C", 8, 125, 2],
            ["d.xm", "Track D", 8, 125, 3],
        ],
    }
    path.write_text(json.dumps(raw_catalog), encoding="utf-8")

    # read_catalog_trackers cleans and deduplicates
    cleaned_trackers = read_catalog_trackers(path)
    assert cleaned_trackers == ["FastTracker v2.00", "MadTracker 2.0"]

    # read_catalog reads tracks back and write_catalog remaps tracker indices
    tracks = read_catalog(path)
    for t in tracks:
        if "tracker" in t:
            t["tracker"] = t["tracker"].split("\x00", 1)[0].strip()

    write_catalog(tracks, path)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["trackers"] == ["FastTracker v2.00", "MadTracker 2.0"]
    assert data["tracks"] == [
        ["a.xm", "Track A", 8, 125, 0],
        ["b.xm", "Track B", 8, 125, 1],
        ["c.xm", "Track C", 8, 125, 1],
        ["d.xm", "Track D", 8, 125, 1],
    ]


def test_sync_main_warns_on_non_default_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://example.com")
    monkeypatch.setenv("R2_BUCKET_NAME", "media")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_URL", "https://media.test.com")

    audio_dir = tmp_path / "public" / "audio"
    audio_dir.mkdir(parents=True)
    sample_xm = audio_dir / "1_test.xm"
    sample_xm.write_bytes(b"Extended Module: " + b"\x00" * 70)

    monkeypatch.chdir(tmp_path)

    with (
        patch("boto3.client") as mock_client_factory,
        patch("sys.argv", ["sync_audio_r2.py", "--dry-run", "--prefix", "other"]),
    ):
        mock_s3 = MagicMock()
        mock_client_factory.return_value = mock_s3
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = []

        main()

        captured = capsys.readouterr()
        assert "Warning: Non-default prefix ('other') or public URL ('https://media.test.com')" in captured.err
        assert "data/music-tracks.json v2 assumes https://media.justme.dev/audio/<filename>" in captured.err


def test_sync_main_no_warning_on_default_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://example.com")
    monkeypatch.setenv("R2_BUCKET_NAME", "media")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_URL", "https://media.justme.dev")

    audio_dir = tmp_path / "public" / "audio"
    audio_dir.mkdir(parents=True)
    sample_xm = audio_dir / "1_test.xm"
    sample_xm.write_bytes(b"Extended Module: " + b"\x00" * 70)

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

        captured = capsys.readouterr()
        assert "Warning: Non-default prefix" not in captured.err
