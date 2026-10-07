# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scripts.sync_images_r2 import (
    list_existing_r2_objects,
    load_env,
    main,
    upload_single_file,
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
    monkeypatch.setattr(os, "environ", {})
    with patch("dotenv.load_dotenv"), pytest.raises(SystemExit):
        load_env()


def test_list_existing_r2_objects() -> None:
    mock_s3 = MagicMock()
    mock_paginator = MagicMock()
    mock_s3.get_paginator.return_value = mock_paginator
    mock_paginator.paginate.return_value = [
        {"Contents": [{"Key": "images/test.webp", "ETag": '"etag1"', "Size": 123}]}
    ]

    objs = list_existing_r2_objects(mock_s3, "test-bucket", "images")
    assert "images/test.webp" in objs
    assert objs["images/test.webp"]["size"] == 123


def test_upload_single_file(tmp_path: Path) -> None:
    test_file = tmp_path / "img.webp"
    test_file.write_bytes(b"webpdata")

    mock_s3 = MagicMock()
    # Dry run
    assert upload_single_file(mock_s3, "bucket", test_file, "images/img.webp", dry_run=True) is True
    mock_s3.upload_file.assert_not_called()

    # Real run
    assert upload_single_file(mock_s3, "bucket", test_file, "images/img.webp", dry_run=False) is True
    mock_s3.upload_file.assert_called_once()

    # Exception handling
    mock_s3.upload_file.side_effect = Exception("Upload error")
    assert upload_single_file(mock_s3, "bucket", test_file, "images/img.webp", dry_run=False) is False


def test_compute_file_md5(tmp_path: Path) -> None:
    from scripts.sync_images_r2 import compute_file_md5

    test_file = tmp_path / "img.webp"
    test_file.write_bytes(b"sample bytes")
    assert compute_file_md5(test_file) == "1c9760fe707208d0ae9ff600ddf6cc9d"


def test_sync_images_main_flow(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://example.com")
    monkeypatch.setenv("R2_BUCKET_NAME", "media")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_URL", "https://media.justme.dev")

    img_dir = tmp_path / "public" / "images"
    img_dir.mkdir(parents=True)
    (img_dir / "logo.webp").write_bytes(b"fake-image")

    monkeypatch.chdir(tmp_path)

    with (
        patch("boto3.client") as mock_client_factory,
        patch("sys.argv", ["sync_images_r2.py", "--dry-run"]),
    ):
        mock_s3 = MagicMock()
        mock_client_factory.return_value = mock_s3
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = []

        main()
