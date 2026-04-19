"""
Tests for scripts/process_requests.py

Uses `responses` to mock HTTP calls and a `tmp_path` fixture to avoid
touching the real filesystem.
"""

# Make the scripts directory importable
import sys
import textwrap
from pathlib import Path

import pytest
import responses as rsps_lib
import yaml

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

from process_requests import (
    GenerateFiles,
    ProjectRequest,
    get_wrapper_template,
)

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
        "fetchML": False,
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

    def test_gitlink_is_required(self, minimal_yaml_data):
        del minimal_yaml_data["gitlink"]
        with pytest.raises(Exception):
            ProjectRequest(**minimal_yaml_data)

    def test_title_is_required(self, minimal_yaml_data):
        del minimal_yaml_data["title"]
        with pytest.raises(Exception):
            ProjectRequest(**minimal_yaml_data)

    def test_intro_is_required(self, minimal_yaml_data):
        del minimal_yaml_data["intro"]
        with pytest.raises(Exception):
            ProjectRequest(**minimal_yaml_data)

    def test_invalid_gitlink_raises(self, minimal_yaml_data):
        minimal_yaml_data["gitlink"] = "not-a-url"
        with pytest.raises(Exception):
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
        result = get_wrapper_template("post", "readme")
        assert "ArticleItem" in result

    def test_contains_article_footer(self):
        result = get_wrapper_template("post", "readme")
        assert "ArticleFooter" in result

    def test_embeds_post_content(self):
        result = get_wrapper_template("MY POST CONTENT", "")
        assert "MY POST CONTENT" in result

    def test_embeds_readme_content(self):
        result = get_wrapper_template("", "MY README CONTENT")
        assert "MY README CONTENT" in result

    def test_has_script_setup_block(self):
        result = get_wrapper_template("", "")
        assert "<script setup>" in result


# ---------------------------------------------------------------------------
# GenerateFiles.get_readme (mocked HTTP)
# ---------------------------------------------------------------------------


class TestGetReadme:
    @rsps_lib.activate
    def test_fetches_readme_successfully(self, generator):
        url = "https://raw.githubusercontent.com/foo/bar/main/README.md"
        rsps_lib.add(rsps_lib.GET, url, body="# Hello World", status=200)

        result = generator.get_readme("foo", "bar", "main", "README.md")
        assert result == "# Hello World"

    @rsps_lib.activate
    def test_returns_empty_on_404(self, generator):
        url = "https://raw.githubusercontent.com/foo/bar/main/README.md"
        rsps_lib.add(rsps_lib.GET, url, status=404)

        result = generator.get_readme("foo", "bar", "main", "README.md")
        assert result == ""

    @rsps_lib.activate
    def test_returns_empty_on_connection_error(self, generator):

        import requests as req_lib

        url = "https://raw.githubusercontent.com/foo/bar/main/README.md"
        rsps_lib.add(rsps_lib.GET, url, body=req_lib.ConnectionError("Network error"))

        result = generator.get_readme("foo", "bar", "main", "README.md")
        assert result == ""

    def test_returns_empty_when_user_missing(self, generator):
        result = generator.get_readme("", "bar", "main", "README.md")
        assert result == ""

    def test_returns_empty_when_project_missing(self, generator):
        result = generator.get_readme("foo", "", "main", "README.md")
        assert result == ""

    @rsps_lib.activate
    def test_respects_custom_branch_and_readme_file(self, generator):
        url = "https://raw.githubusercontent.com/foo/bar/develop/DOCS.md"
        rsps_lib.add(rsps_lib.GET, url, body="# Docs", status=200)

        result = generator.get_readme("foo", "bar", "develop", "DOCS.md")
        assert result == "# Docs"


# ---------------------------------------------------------------------------
# GenerateFiles.save_post
# ---------------------------------------------------------------------------


class TestSavePost:
    def test_creates_markdown_file(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project.md"
        wrapper = textwrap.TextWrapper(width=120)
        GenerateFiles.save_post(req, dst, "", "", wrapper)

        assert dst.exists()

    def test_markdown_file_has_frontmatter(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project.md"
        wrapper = textwrap.TextWrapper(width=120)
        GenerateFiles.save_post(req, dst, "", "", wrapper)

        content = dst.read_text()
        assert content.startswith("---\n")
        assert "title: Test Project" in content

    def test_gitlink_serialized_as_string(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = generator.dst_dir / "test-project.md"
        wrapper = textwrap.TextWrapper(width=120)
        GenerateFiles.save_post(req, dst, "", "", wrapper)

        content = dst.read_text()
        # gitlink must be a plain URL string, not a Pydantic HttpUrl repr
        assert "https://github.com/foo/bar" in content

    def test_creates_parent_directories(self, generator, minimal_yaml_data, tmp_path):
        req = ProjectRequest(**minimal_yaml_data)
        dst = tmp_path / "deep" / "nested" / "output.md"
        wrapper = textwrap.TextWrapper(width=120)
        GenerateFiles.save_post(req, dst, "", "", wrapper)

        assert dst.exists()


# ---------------------------------------------------------------------------
# GenerateFiles.process_requests (integration-style)
# ---------------------------------------------------------------------------


class TestProcessRequests:
    def test_processes_single_yaml(self, generator, minimal_yaml_data):
        yaml_file = generator.req_path / "myproject.yaml"
        yaml_file.write_text(yaml.dump(minimal_yaml_data))

        generator.process_requests()

        output = generator.dst_dir / "myproject.md"
        assert output.exists()
        content = output.read_text()
        assert "Test Project" in content

    def test_skips_empty_yaml(self, generator):
        yaml_file = generator.req_path / "empty.yaml"
        yaml_file.write_text("")

        # Should not raise
        generator.process_requests()
        assert not (generator.dst_dir / "empty.md").exists()

    def test_handles_invalid_yaml_gracefully(self, generator):
        yaml_file = generator.req_path / "bad.yaml"
        yaml_file.write_text("title: [unclosed")

        # Should not raise — logs an error and continues
        generator.process_requests()

    def test_handles_missing_requests_dir(self, generator):
        generator.req_path = Path("/nonexistent/path/requests")
        # Should not raise
        generator.process_requests()

    @rsps_lib.activate
    def test_fetches_readme_when_flag_set(self, generator, full_yaml_data):
        url = "https://raw.githubusercontent.com/foo/full/main/README.md"
        rsps_lib.add(rsps_lib.GET, url, body="# Full README", status=200)

        yaml_file = generator.req_path / "full.yaml"
        yaml_file.write_text(yaml.dump(full_yaml_data))

        generator.process_requests()

        output = generator.dst_dir / "full.md"
        assert output.exists()
        content = output.read_text()
        assert "# Full README" in content
