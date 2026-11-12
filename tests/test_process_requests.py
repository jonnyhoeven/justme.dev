# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
"""
Tests for scripts/process_requests.py

Mocks `urlopen` with small fake responses and uses a `tmp_path` fixture to
avoid touching the real filesystem or the network.
"""

# Make the scripts directory importable
import io
import sys
import textwrap
import urllib.error
from email.message import Message
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

from process_requests import (
    FetchError,
    GenerateFiles,
    ProjectRequest,
    absolutize_links,
    fetch_text,
    get_wrapper_template,
)

URLOPEN = "process_requests.urllib.request.urlopen"


class FakeResponse:
    """Minimal stand-in for the object returned by urlopen()."""

    def __init__(self, body: bytes = b"", status: int = 200, content_type: str | None = None):
        self._body = body
        self.status = status
        self.headers = Message()
        if content_type:
            self.headers["Content-Type"] = content_type

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def ok(text: str) -> FakeResponse:
    return FakeResponse(text.encode("utf-8"))


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("http://x", code, "err", Message(), io.BytesIO(b""))

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def minimal_yaml_data() -> dict:
    return {
        "title": "Test Project",
        "date": "2024-01-01",
        "image": "test.webp",
        "gitlink": "https://github.com/foo/bar",
        "languages": "Python",
        "intro": "A test project.",
    }


@pytest.fixture()
def full_yaml_data() -> dict:
    return {
        "title": "Full Project",
        "type": "project",
        "date": "2024-06-15",
        "image": "full.webp",
        "fetchReadme": True,
        "gitlink": "https://github.com/foo/full",
        "user": "foo",
        "project": "full",
        "branch": "main",
        "readmeFile": "README.md",
        "languages": ["Python", "TypeScript"],
        "outline": "deep",
        "intro": "A full project.",
    }


@pytest.fixture()
def generator(tmp_path: Path) -> GenerateFiles:
    """Return a GenerateFiles instance pointing at tmp_path."""
    gen = GenerateFiles()
    gen.req_path = tmp_path / "requests"
    gen.dst_dir = tmp_path / "projects"
    gen.req_path.mkdir()
    gen.dst_dir.mkdir()
    return gen


# ---------------------------------------------------------------------------
# ProjectRequest model validation
# ---------------------------------------------------------------------------


class TestProjectRequest:
    def test_minimal_valid_request(self, minimal_yaml_data):
        req = ProjectRequest(**minimal_yaml_data)
        assert req.title == "Test Project"
        assert req.fetchReadme is False
        assert req.branch == "main"

    def test_gitlink_is_optional(self, minimal_yaml_data):
        del minimal_yaml_data["gitlink"]
        req = ProjectRequest(**minimal_yaml_data)
        assert req.gitlink is None

    def test_title_is_required(self, minimal_yaml_data):
        del minimal_yaml_data["title"]
        with pytest.raises(ValidationError):
            ProjectRequest(**minimal_yaml_data)

    def test_intro_is_required(self, minimal_yaml_data):
        del minimal_yaml_data["intro"]
        with pytest.raises(ValidationError):
            ProjectRequest(**minimal_yaml_data)

    def test_invalid_gitlink_raises(self, minimal_yaml_data):
        minimal_yaml_data["gitlink"] = "not-a-url"
        with pytest.raises(ValidationError):
            ProjectRequest(**minimal_yaml_data)

    def test_fetch_readme_requires_user_and_project(self, minimal_yaml_data):
        minimal_yaml_data["fetchReadme"] = True
        with pytest.raises(ValidationError):
            ProjectRequest(**minimal_yaml_data)

    def test_languages_can_be_list(self, minimal_yaml_data):
        minimal_yaml_data["languages"] = ["Python", "TypeScript"]
        req = ProjectRequest(**minimal_yaml_data)
        assert req.languages == ["Python", "TypeScript"]

    def test_fetch_readme_default_false(self, minimal_yaml_data):
        req = ProjectRequest(**minimal_yaml_data)
        assert req.fetchReadme is False

    def test_full_valid_request(self, full_yaml_data):
        req = ProjectRequest(**full_yaml_data)
        assert req.fetchReadme is True
        assert req.user == "foo"
        assert req.project == "full"


# ---------------------------------------------------------------------------
# get_wrapper_template
# ---------------------------------------------------------------------------


class TestGetWrapperTemplate:
    def test_contains_article_item(self):
        result = get_wrapper_template("readme")
        assert '<ArticleItem :frontmatter="$frontmatter"/>' in result

    def test_contains_article_footer(self):
        result = get_wrapper_template("readme")
        assert '<ArticleFooter :frontmatter="$frontmatter"/>' in result

    def test_embeds_readme_content(self):
        result = get_wrapper_template("MY README CONTENT")
        assert "MY README CONTENT" in result

    def test_has_no_script_setup_block(self):
        # ArticleItem / ArticleFooter are registered globally in the theme
        result = get_wrapper_template("")
        assert "<script" not in result
        assert "import " not in result


# ---------------------------------------------------------------------------
# absolutize_links
# ---------------------------------------------------------------------------


class TestAbsolutizeLinks:
    BLOB = "https://github.com/foo/bar/blob/main"

    def _run(self, text: str, readme_file: str = "README.md") -> str:
        return absolutize_links(text, "foo", "bar", "main", readme_file)

    def test_relative_link_points_at_github_blob(self):
        assert self._run("[License](LICENSE)") == f"[License]({self.BLOB}/LICENSE)"

    def test_dot_slash_and_parent_paths_resolve(self):
        assert self._run("[a](./docs/a.md)") == f"[a]({self.BLOB}/docs/a.md)"
        assert (
            self._run("[b](../b.md)", "docs/README.md") == f"[b]({self.BLOB}/b.md)"
        )

    def test_image_points_at_raw_content(self):
        assert self._run("![x](img/x.png)") == (
            "![x](https://raw.githubusercontent.com/foo/bar/main/img/x.png)"
        )

    def test_absolute_anchor_and_root_links_untouched(self):
        for text in (
            "[a](https://example.com/x)",
            "[b](#section)",
            "[c](/site/root)",
            "[d](mailto:me@example.com)",
        ):
            assert self._run(text) == text

    def test_keeps_link_title(self):
        assert self._run('[a](LICENSE "GPL")') == f'[a]({self.BLOB}/LICENSE "GPL")'

    def test_ignores_links_inside_fenced_code_blocks(self):
        text = textwrap.dedent("""
            Outside [link](relative.md) and ![img](image.png).

            ```markdown
            Inside code block: [link](relative.md) and ![img](image.png).
            ```

            ~~~
            Tilde code block: [link2](other.md)
            ~~~

            After fence [link3](more.md).
        """).strip()

        expected = textwrap.dedent(f"""
            Outside [link]({self.BLOB}/relative.md) and ![img](https://raw.githubusercontent.com/foo/bar/main/image.png).

            ```markdown
            Inside code block: [link](relative.md) and ![img](image.png).
            ```

            ~~~
            Tilde code block: [link2](other.md)
            ~~~

            After fence [link3]({self.BLOB}/more.md).
        """).strip()

        assert self._run(text) == expected


# ---------------------------------------------------------------------------
# fetch_text (mocked urlopen)
# ---------------------------------------------------------------------------


class TestFetchText:
    def test_returns_decoded_body(self):
        with patch(URLOPEN, return_value=ok("héllo")):
            assert fetch_text("https://example.com/x") == "héllo"

    def test_sends_user_agent_and_timeout(self):
        with patch(URLOPEN, return_value=ok("x")) as m:
            fetch_text("https://example.com/x", timeout=3)
        request = m.call_args.args[0]
        assert request.full_url == "https://example.com/x"
        assert request.get_header("User-agent") == "justme.dev-etl"
        assert m.call_args.kwargs["timeout"] == 3

    def test_respects_charset_header(self):
        body = "café".encode("latin-1")
        resp = FakeResponse(body, content_type="text/plain; charset=latin-1")
        with patch(URLOPEN, return_value=resp):
            assert fetch_text("https://example.com/x") == "café"

    def test_http_error_includes_status(self):
        with (
            patch(URLOPEN, side_effect=http_error(404)),
            pytest.raises(FetchError, match="404"),
        ):
            fetch_text("https://example.com/x")

    def test_url_error_becomes_fetch_error(self):
        with (
            patch(URLOPEN, side_effect=urllib.error.URLError("boom")),
            pytest.raises(FetchError, match="boom"),
        ):
            fetch_text("https://example.com/x")

    def test_timeout_becomes_fetch_error(self):
        with (
            patch(URLOPEN, side_effect=TimeoutError("timed out")),
            pytest.raises(FetchError, match="Timed out"),
        ):
            fetch_text("https://example.com/x")

    def test_non_2xx_becomes_fetch_error(self):
        with (
            patch(URLOPEN, return_value=FakeResponse(b"", status=304)),
            pytest.raises(FetchError, match="304"),
        ):
            fetch_text("https://example.com/x")

    def test_undecodable_body_becomes_fetch_error(self):
        with (
            patch(URLOPEN, return_value=FakeResponse(b"\xff\xfe\xfa")),
            pytest.raises(FetchError, match="decode"),
        ):
            fetch_text("https://example.com/x")


# ---------------------------------------------------------------------------
# GenerateFiles.get_readme (mocked HTTP)
# ---------------------------------------------------------------------------


class TestGetReadme:
    def test_fetches_readme_successfully(self, generator):
        with patch(URLOPEN, return_value=ok("# Hello World")) as m:
            result = generator.get_readme("foo", "bar", "main", "README.md")
        assert result == "# Hello World"
        assert (
            m.call_args.args[0].full_url
            == "https://raw.githubusercontent.com/foo/bar/main/README.md"
        )

    def test_returns_empty_on_404(self, generator):
        with patch(URLOPEN, side_effect=http_error(404)):
            result = generator.get_readme("foo", "bar", "main", "README.md")
        assert result == ""

    def test_returns_empty_on_connection_error(self, generator):
        with patch(URLOPEN, side_effect=urllib.error.URLError("Network error")):
            result = generator.get_readme("foo", "bar", "main", "README.md")
        assert result == ""

    def test_returns_empty_when_user_missing(self, generator):
        result = generator.get_readme("", "bar", "main", "README.md")
        assert result == ""

    def test_returns_empty_when_project_missing(self, generator):
        result = generator.get_readme("foo", "", "main", "README.md")
        assert result == ""

    def test_respects_custom_branch_and_readme_file(self, generator):
        with patch(URLOPEN, return_value=ok("# Docs")) as m:
            result = generator.get_readme("foo", "bar", "develop", "DOCS.md")
        assert result == "# Docs"
        assert (
            m.call_args.args[0].full_url
            == "https://raw.githubusercontent.com/foo/bar/develop/DOCS.md"
        )


# ---------------------------------------------------------------------------
# GenerateFiles.save_post
# ---------------------------------------------------------------------------


class TestSavePost:
    def test_creates_markdown_file(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project.md"
        GenerateFiles.save_post(req, dst, "")

        assert dst.exists()

    def test_markdown_file_has_frontmatter(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project.md"
        GenerateFiles.save_post(req, dst, "")

        content = dst.read_text()
        assert content.startswith("---\n")
        assert "title: Test Project" in content

    def test_gitlink_serialized_as_string(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project.md"
        GenerateFiles.save_post(req, dst, "")

        content = dst.read_text()
        # gitlink must be a plain URL string, not a Pydantic HttpUrl repr
        assert "https://github.com/foo/bar" in content

    def test_gitlink_omitted_when_none(self, generator, minimal_yaml_data, tmp_path):
        del minimal_yaml_data["gitlink"]
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project-no-git.md"
        GenerateFiles.save_post(req, dst, "")

        content = dst.read_text()
        assert "gitlink:" not in content

    def test_creates_parent_directories(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = tmp_path / "deep" / "nested" / "output.md"
        GenerateFiles.save_post(req, dst, "")

        assert dst.exists()


# ---------------------------------------------------------------------------
# GenerateFiles.process_requests (integration-style)
# ---------------------------------------------------------------------------


class TestProcessRequests:
    def test_processes_single_yaml(self, generator, minimal_yaml_data):
        yaml_file = generator.req_path / "myproject.yaml"
        yaml_file.write_text(yaml.dump(minimal_yaml_data))

        assert generator.process_requests() is True

        output = generator.dst_dir / "myproject.md"
        assert output.exists()
        content = output.read_text()
        assert "Test Project" in content

    def test_skips_empty_yaml(self, generator):
        yaml_file = generator.req_path / "empty.yaml"
        yaml_file.write_text("")

        assert generator.process_requests() is True
        assert not (generator.dst_dir / "empty.md").exists()

    def test_handles_invalid_yaml_returns_failure(self, generator):
        yaml_file = generator.req_path / "bad.yaml"
        yaml_file.write_text("title: [unclosed")

        assert generator.process_requests() is False

    def test_handles_validation_error_returns_failure(self, generator, minimal_yaml_data):
        del minimal_yaml_data["title"]
        yaml_file = generator.req_path / "invalid.yaml"
        yaml_file.write_text(yaml.dump(minimal_yaml_data))

        assert generator.process_requests() is False

    def test_handles_missing_requests_dir(self, generator):
        generator.req_path = Path("/nonexistent/path/requests")
        assert generator.process_requests() is False

    def test_fetches_readme_when_flag_set(self, generator, full_yaml_data):
        yaml_file = generator.req_path / "full.yaml"
        yaml_file.write_text(yaml.dump(full_yaml_data))

        with patch(URLOPEN, return_value=ok("# Full README")):
            assert generator.process_requests() is True

        output = generator.dst_dir / "full.md"
        assert output.exists()
        content = output.read_text()
        assert "# Full README" in content

    def test_fails_on_readme_network_error(self, generator, full_yaml_data):
        yaml_file = generator.req_path / "full.yaml"
        yaml_file.write_text(yaml.dump(full_yaml_data))

        with patch(URLOPEN, side_effect=http_error(404)):
            assert generator.process_requests() is False
        assert not (generator.dst_dir / "full.md").exists()

    def test_fails_on_io_error_writing_post(self, generator, minimal_yaml_data, monkeypatch):
        yaml_file = generator.req_path / "myproject.yaml"
        yaml_file.write_text(yaml.dump(minimal_yaml_data))

        original_open = Path.open

        def mock_open(self, mode="r", *args, **kwargs):
            if "w" in mode and str(self).endswith(".md"):
                raise OSError("Disk full")
            return original_open(self, mode, *args, **kwargs)

        monkeypatch.setattr(Path, "open", mock_open)
        assert generator.process_requests() is False

    def test_uses_inline_content_and_external_url(self, generator, minimal_yaml_data):
        minimal_yaml_data["content"] = "## Inline Content\nDirect markdown details."
        minimal_yaml_data["externalUrl"] = "https://example.com/demo"
        minimal_yaml_data["externalUrlLabel"] = "Launch Demo"
        yaml_file = generator.req_path / "inline.yaml"
        yaml_file.write_text(yaml.dump(minimal_yaml_data))

        assert generator.process_requests() is True

        output = generator.dst_dir / "inline.md"
        assert output.exists()
        content = output.read_text()
        assert "## Inline Content" in content
        assert "Direct markdown details." in content
        assert "externalUrl: https://example.com/demo" in content
        assert "externalUrlLabel: Launch Demo" in content
