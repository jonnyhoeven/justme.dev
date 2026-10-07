# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scripts.sync_fonts_r2 import (
    compute_file_md5,
    discover_fonts,
    is_up_to_date,
    list_existing_r2_objects,
    load_env,
    main,
    upload_single_file,
)

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_load_env_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in ("R2_ENDPOINT_URL", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(key, raising=False)
    with patch("dotenv.load_dotenv"), pytest.raises(SystemExit):
        load_env()


def test_discover_fonts_keeps_relative_paths(tmp_path: Path) -> None:
    (tmp_path / "inter").mkdir()
    (tmp_path / "inter" / "inter-latin.woff2").write_bytes(b"font")
    (tmp_path / "inter" / "OFL.txt").write_bytes(b"license")
    (tmp_path / "inter" / ".DS_Store").write_bytes(b"junk")
    (tmp_path / "inter" / "notes.md").write_bytes(b"ignored")

    found = {key for _, key in discover_fonts(tmp_path, "fonts")}
    assert found == {"fonts/inter/inter-latin.woff2", "fonts/inter/OFL.txt"}


def test_list_existing_r2_objects_scopes_to_prefix_directory() -> None:
    mock_s3 = MagicMock()
    mock_s3.get_paginator.return_value.paginate.return_value = [
        {"Contents": [{"Key": "fonts/a.woff2", "ETag": '"abc"', "Size": 4}]}
    ]

    objs = list_existing_r2_objects(mock_s3, "bucket", "fonts")
    assert objs == {"fonts/a.woff2": {"etag": "abc", "size": 4}}
    mock_s3.get_paginator.return_value.paginate.assert_called_once_with(Bucket="bucket", Prefix="fonts/")


def test_is_up_to_date(tmp_path: Path) -> None:
    font = tmp_path / "a.woff2"
    font.write_bytes(b"sample bytes")
    md5 = compute_file_md5(font)

    assert is_up_to_date(font, None) is False
    assert is_up_to_date(font, {"etag": md5, "size": 12}) is True
    assert is_up_to_date(font, {"etag": "0" * 32, "size": 12}) is False
    assert is_up_to_date(font, {"etag": md5, "size": 99}) is False
    assert is_up_to_date(font, {"etag": "abc-2", "size": 12}) is True  # multipart ETag: size only


def test_upload_single_file(tmp_path: Path) -> None:
    font = tmp_path / "a.woff2"
    font.write_bytes(b"font")
    mock_s3 = MagicMock()

    assert upload_single_file(mock_s3, "bucket", font, "fonts/a.woff2", dry_run=True) is True
    mock_s3.upload_file.assert_not_called()

    assert upload_single_file(mock_s3, "bucket", font, "fonts/a.woff2") is True
    extra = mock_s3.upload_file.call_args.kwargs["ExtraArgs"]
    assert extra["ContentType"] == "font/woff2"
    assert "immutable" in extra["CacheControl"]

    mock_s3.upload_file.side_effect = Exception("boom")
    assert upload_single_file(mock_s3, "bucket", font, "fonts/a.woff2") is False


def test_main_uploads_new_and_removes_orphans(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in {
        "R2_ENDPOINT_URL": "https://example.com",
        "R2_BUCKET_NAME": "media",
        "R2_ACCESS_KEY_ID": "key",
        "R2_SECRET_ACCESS_KEY": "secret",
    }.items():
        monkeypatch.setenv(key, value)
    (tmp_path / "fonts" / "inter").mkdir(parents=True)
    (tmp_path / "fonts" / "inter" / "inter-latin.woff2").write_bytes(b"font")
    monkeypatch.chdir(tmp_path)

    with patch("boto3.client") as client_factory, patch("sys.argv", ["sync_fonts_r2.py"]):
        mock_s3 = client_factory.return_value
        mock_s3.get_paginator.return_value.paginate.return_value = [
            {"Contents": [{"Key": "fonts/old/gone.woff2", "ETag": '"x"', "Size": 1}]}
        ]
        main()

    mock_s3.upload_file.assert_called_once()
    assert mock_s3.upload_file.call_args.args[2] == "fonts/inter/inter-latin.woff2"
    mock_s3.delete_object.assert_called_once_with(Bucket="media", Key="fonts/old/gone.woff2")


def test_main_exits_when_fonts_dir_missing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    with patch("sys.argv", ["sync_fonts_r2.py"]), pytest.raises(SystemExit):
        main()


def test_font_face_urls_match_files_in_repo() -> None:
    """Every @font-face URL on the CDN must have a source file in fonts/ to sync."""
    css = (REPO_ROOT / ".vitepress" / "theme" / "fonts.css").read_text()
    urls = re.findall(r"url\('https://media\.justme\.dev/(fonts/[^']+\.woff2)'\)", css)
    assert urls, "fonts.css should reference CDN font files"
    for rel in urls:
        assert (REPO_ROOT / rel).is_file(), f"{rel} is referenced by fonts.css but missing from fonts/"
