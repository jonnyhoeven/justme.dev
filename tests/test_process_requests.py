# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
"""
Tests for scripts/process_requests.py

Mocks `urlopen` with small fake responses and uses a `tmp_path` fixture to
avoid touching the real filesystem or the network.
"""

# Make the scripts directory importable
import io
import json
import sys
import textwrap
import urllib.error
from datetime import UTC, datetime
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
    fetch_repo_stats,
    fetch_text,
    get_wrapper_template,
    parse_frontmatter,
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
    gen.blog_path = tmp_path / "blog"
    gen.blog_stats_path = tmp_path / "projects-cache" / "blog-stats.json"
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

    def test_does_not_contain_article_footer(self):
        result = get_wrapper_template("readme")
        assert "<ArticleFooter" not in result

    def test_embeds_readme_content(self):
        result = get_wrapper_template("MY README CONTENT")
        assert "MY README CONTENT" in result

    def test_has_no_script_setup_block(self):
        # ArticleItem is registered globally in the theme
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
        assert self._run("[b](../b.md)", "docs/README.md") == f"[b]({self.BLOB}/b.md)"

    def test_image_points_at_raw_content(self):
        assert self._run("![x](img/x.png)") == ("![x](https://raw.githubusercontent.com/foo/bar/main/img/x.png)")

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
        assert m.call_args.args[0].full_url == "https://raw.githubusercontent.com/foo/bar/main/README.md"

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
        assert m.call_args.args[0].full_url == "https://raw.githubusercontent.com/foo/bar/develop/DOCS.md"


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


# ---------------------------------------------------------------------------
# fetch_repo_stats
# ---------------------------------------------------------------------------

REPO_JSON = {"stargazers_count": 1234, "forks_count": 34, "subscribers_count": 7}


def api_ok(payload: dict | None = None) -> FakeResponse:
    return ok(json.dumps(REPO_JSON if payload is None else payload))


class TestFetchRepoStats:
    def test_success(self):
        with patch(URLOPEN, return_value=api_ok()) as m:
            stats = fetch_repo_stats("foo", "bar")
        assert stats == {"stars": 1234, "forks": 34, "watchers": 7}
        request = m.call_args.args[0]
        assert request.full_url == "https://api.github.com/repos/foo/bar"
        assert request.get_header("Accept") == "application/vnd.github+json"
        assert request.get_header("X-github-api-version") == "2022-11-28"

    def test_watchers_omitted_when_missing(self):
        with patch(URLOPEN, return_value=api_ok({"stargazers_count": 1, "forks_count": 2})):
            assert fetch_repo_stats("foo", "bar") == {"stars": 1, "forks": 2}

    def test_token_header_present(self):
        with patch(URLOPEN, return_value=api_ok()) as m:
            fetch_repo_stats("foo", "bar", token="secret")
        assert m.call_args.args[0].get_header("Authorization") == "Bearer secret"

    def test_token_header_absent(self):
        with patch(URLOPEN, return_value=api_ok()) as m:
            fetch_repo_stats("foo", "bar")
        assert m.call_args.args[0].get_header("Authorization") is None

    def test_404(self):
        with patch(URLOPEN, side_effect=http_error(404)), pytest.raises(FetchError, match="HTTP 404"):
            fetch_repo_stats("foo", "bar")

    def test_rate_limit_403(self):
        headers = Message()
        headers["X-RateLimit-Remaining"] = "0"
        err = urllib.error.HTTPError("http://x", 403, "forbidden", headers, io.BytesIO(b""))
        with patch(URLOPEN, side_effect=err), pytest.raises(FetchError, match="rate limit"):
            fetch_repo_stats("foo", "bar")

    def test_plain_403_is_not_rate_limit(self):
        with patch(URLOPEN, side_effect=http_error(403)), pytest.raises(FetchError, match="HTTP 403"):
            fetch_repo_stats("foo", "bar")

    def test_network_error(self):
        with patch(URLOPEN, side_effect=urllib.error.URLError("boom")), pytest.raises(FetchError, match="boom"):
            fetch_repo_stats("foo", "bar")

    def test_timeout(self):
        with patch(URLOPEN, side_effect=TimeoutError()), pytest.raises(FetchError, match="Timed out"):
            fetch_repo_stats("foo", "bar")

    def test_malformed_body(self):
        with patch(URLOPEN, return_value=ok("not json")), pytest.raises(FetchError, match="Unexpected"):
            fetch_repo_stats("foo", "bar")

    def test_missing_fields(self):
        with patch(URLOPEN, return_value=api_ok({"forks_count": 1})), pytest.raises(FetchError):
            fetch_repo_stats("foo", "bar")


class TestStatsFrontmatter:
    def _write(self, generator, data):
        (generator.req_path / "p.yaml").write_text(yaml.dump(data))

    def _frontmatter(self, generator) -> dict:
        text = (generator.dst_dir / "p.md").read_text()
        return yaml.safe_load(text.split("---\n")[1])

    def test_stats_written_to_frontmatter(self, generator, full_yaml_data, monkeypatch):
        monkeypatch.setenv("GITHUB_TOKEN", "tok")
        full_yaml_data["fetchReadme"] = False
        self._write(generator, full_yaml_data)
        with patch(URLOPEN, return_value=api_ok()) as m:
            assert generator.process_requests() is True
        assert m.call_args.args[0].get_header("Authorization") == "Bearer tok"
        fm = self._frontmatter(generator)
        assert (fm["stars"], fm["forks"], fm["watchers"]) == (1234, 34, 7)
        assert fm["statsFetched"] == datetime.now(UTC).date().isoformat()

    def test_stats_failure_does_not_fail_build(self, generator, full_yaml_data, monkeypatch, caplog):
        monkeypatch.delenv("GITHUB_TOKEN", raising=False)
        full_yaml_data["fetchReadme"] = False
        self._write(generator, full_yaml_data)
        with patch(URLOPEN, side_effect=http_error(403)):
            assert generator.process_requests() is True
        fm = self._frontmatter(generator)
        assert not {"stars", "forks", "watchers", "statsFetched"} & fm.keys()
        assert "Could not fetch repo stats" in caplog.text

    def test_no_request_without_user_and_project(self, generator, minimal_yaml_data):
        self._write(generator, minimal_yaml_data)
        with patch(URLOPEN) as m:
            assert generator.process_requests() is True
        m.assert_not_called()
        assert "stars" not in self._frontmatter(generator)

    def test_readme_failure_still_fails_build(self, generator, full_yaml_data):
        self._write(generator, full_yaml_data)
        with patch(URLOPEN, side_effect=http_error(404)):
            assert generator.process_requests() is False

    def test_missing_github_token_logged_only_once(self, generator, full_yaml_data, monkeypatch, caplog):
        import logging

        caplog.set_level(logging.INFO)
        monkeypatch.delenv("GITHUB_TOKEN", raising=False)
        req = ProjectRequest(**full_yaml_data)
        with patch(URLOPEN, return_value=api_ok()):
            generator.get_stats(req)
            generator.get_stats(req)
        token_messages = [rec.message for rec in caplog.records if "GITHUB_TOKEN not set" in rec.message]
        assert len(token_messages) == 1


class TestParseFrontmatter:
    def test_parses_valid_frontmatter(self, tmp_path: Path):
        file = tmp_path / "post.md"
        file.write_text("---\nuser: alice\nproject: bob\n---\nBody text\n")
        assert parse_frontmatter(file) == {"user": "alice", "project": "bob"}

    def test_missing_file_returns_empty_dict(self, tmp_path: Path):
        assert parse_frontmatter(tmp_path / "nonexistent.md") == {}

    def test_missing_leading_dashes_returns_empty_dict(self, tmp_path: Path):
        file = tmp_path / "post.md"
        file.write_text("user: alice\nproject: bob\n---\nBody\n")
        assert parse_frontmatter(file) == {}

    def test_missing_closing_dashes_returns_empty_dict(self, tmp_path: Path):
        file = tmp_path / "post.md"
        file.write_text("---\nuser: alice\nproject: bob\nBody\n")
        assert parse_frontmatter(file) == {}

    def test_invalid_yaml_returns_empty_dict(self, tmp_path: Path):
        file = tmp_path / "post.md"
        file.write_text("---\n: [invalid yaml\n---\nBody\n")
        assert parse_frontmatter(file) == {}

    def test_non_dict_yaml_returns_empty_dict(self, tmp_path: Path):
        file = tmp_path / "post.md"
        file.write_text("---\n- item1\n- item2\n---\nBody\n")
        assert parse_frontmatter(file) == {}


class TestProcessBlogStats:
    def test_no_op_when_blog_path_missing(self, generator):
        generator.process_blog_stats()
        assert not generator.blog_stats_path.exists()

    def test_fetches_stats_deduplicates_and_writes_json(self, generator):
        generator.blog_path.mkdir(parents=True)
        (generator.blog_path / "post1.md").write_text("---\nuser: repo-owner\nproject: repo-one\n---\n")
        (generator.blog_path / "post2.md").write_text("---\nuser: repo-owner\nproject: repo-one\n---\n")
        (generator.blog_path / "post3.md").write_text("---\nuser: second-owner\nproject: repo-two\n---\n")
        (generator.blog_path / "post4.md").write_text("---\ntitle: No Repo\n---\n")

        with patch(URLOPEN, return_value=api_ok()) as m:
            generator.process_blog_stats()

        assert m.call_count == 2
        assert generator.blog_stats_path.exists()

        data = json.loads(generator.blog_stats_path.read_text(encoding="utf-8"))
        assert set(data.keys()) == {"repo-owner/repo-one", "second-owner/repo-two"}
        assert data["repo-owner/repo-one"]["stars"] == 1234
        assert data["repo-owner/repo-one"]["forks"] == 34
        assert data["repo-owner/repo-one"]["watchers"] == 7
        assert data["repo-owner/repo-one"]["statsFetched"] == datetime.now(UTC).date().isoformat()

    def test_skips_cleanly_on_fetch_error(self, generator):
        generator.blog_path.mkdir(parents=True)
        (generator.blog_path / "post.md").write_text("---\nuser: fail-owner\nproject: fail-repo\n---\n")

        with patch(URLOPEN, side_effect=http_error(404)):
            generator.process_blog_stats()

        assert generator.blog_stats_path.exists()
        data = json.loads(generator.blog_stats_path.read_text(encoding="utf-8"))
        assert data == {}

    def test_process_requests_runs_process_blog_stats(self, generator):
        generator.blog_path.mkdir(parents=True)
        (generator.blog_path / "post.md").write_text("---\nuser: my-user\nproject: my-proj\n---\n")

        with patch(URLOPEN, return_value=api_ok()):
            assert generator.process_requests() is True

        assert generator.blog_stats_path.exists()
        data = json.loads(generator.blog_stats_path.read_text(encoding="utf-8"))
        assert "my-user/my-proj" in data
