# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
from pathlib import Path
from unittest.mock import MagicMock, patch

from scripts.r2_common import (
    create_s3_client,
    delete_orphaned_objects,
    is_up_to_date,
    list_existing_r2_objects,
)


def test_create_s3_client() -> None:
    cfg = {
        "endpoint_url": "https://example.com",
        "access_key_id": "key",
        "secret_access_key": "secret",
    }
    with patch("boto3.client") as mock_boto:
        create_s3_client(cfg)
        mock_boto.assert_called_once_with(
            "s3",
            endpoint_url="https://example.com",
            aws_access_key_id="key",
            aws_secret_access_key="secret",
            region_name="auto",
        )


def test_delete_orphaned_objects_dry_run() -> None:
    mock_s3 = MagicMock()
    delete_orphaned_objects(mock_s3, "bucket", ["key1", "key2"], dry_run=True)
    mock_s3.delete_objects.assert_not_called()


def test_delete_orphaned_objects_empty() -> None:
    mock_s3 = MagicMock()
    delete_orphaned_objects(mock_s3, "bucket", [], dry_run=False)
    mock_s3.delete_objects.assert_not_called()


def test_list_existing_r2_objects_trailing_slash_handling() -> None:
    mock_s3 = MagicMock()
    mock_paginator = MagicMock()
    mock_s3.get_paginator.return_value = mock_paginator
    mock_paginator.paginate.return_value = []

    list_existing_r2_objects(mock_s3, "bucket", "audio///")
    mock_paginator.paginate.assert_called_once_with(Bucket="bucket", Prefix="audio/")


def test_is_up_to_date_size_mismatch(tmp_path: Path) -> None:
    file = tmp_path / "test.bin"
    file.write_bytes(b"12345")
    assert is_up_to_date(file, {"size": 10, "etag": "abc"}) is False
