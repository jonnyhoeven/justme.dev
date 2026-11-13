# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import json
import logging
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit

import yaml
from pydantic import BaseModel, HttpUrl, ValidationError, model_validator

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

USER_AGENT = "justme.dev-etl"


class FetchError(Exception):
    """Raised when a remote text resource cannot be fetched."""


def fetch_text(url: str, timeout: float = 10) -> str:
    """GET `url` and return the body decoded as text (UTF-8 unless the headers say otherwise).

    Raises:
        FetchError: on HTTP errors (message includes the status code), network
            errors, timeouts, non-2xx responses, or an undecodable body.
    """
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = response.status
            if not 200 <= status < 300:
                raise FetchError(f"HTTP {status} for url: {url}")
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset)
    except urllib.error.HTTPError as e:
        raise FetchError(f"HTTP {e.code} for url: {url}") from e
    except urllib.error.URLError as e:
        raise FetchError(f"{e.reason} for url: {url}") from e
    except TimeoutError as e:
        raise FetchError(f"Timed out after {timeout}s for url: {url}") from e
    except (LookupError, UnicodeDecodeError) as e:
        raise FetchError(f"Cannot decode response from {url}: {e}") from e


GITHUB_API = "https://api.github.com"


def fetch_repo_stats(user: str, project: str, token: str | None = None, timeout: float = 10) -> dict[str, int]:
    """Fetch star, fork and watcher counts for a GitHub repository.

    Returns a dict with `stars`, `forks` and `watchers` (GitHub's
    `subscribers_count`; omitted when the API does not report it).

    Raises:
        FetchError: on HTTP errors (a 403/429 with no quota left is reported as
            a rate limit), network errors, timeouts, or an unexpected body.
    """
    url = f"{GITHUB_API}/repos/{user}/{project}"
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
        stats = {"stars": int(data["stargazers_count"]), "forks": int(data["forks_count"])}
        if data.get("subscribers_count") is not None:
            stats["watchers"] = int(data["subscribers_count"])
        return stats
    except urllib.error.HTTPError as e:
        if e.code in (403, 429) and e.headers is not None and e.headers.get("X-RateLimit-Remaining") == "0":
            raise FetchError(f"GitHub API rate limit exceeded (HTTP {e.code}) for url: {url}") from e
        raise FetchError(f"HTTP {e.code} for url: {url}") from e
    except urllib.error.URLError as e:
        raise FetchError(f"{e.reason} for url: {url}") from e
    except TimeoutError as e:
        raise FetchError(f"Timed out after {timeout}s for url: {url}") from e
    except (ValueError, KeyError, TypeError, AttributeError) as e:
        raise FetchError(f"Unexpected response from {url}: {e}") from e


class ProjectRequest(BaseModel):
    title: str
    type: str = "project"
    date: date | str
    image: str
    fetchReadme: bool = False
    gitlink: HttpUrl | None = None
    user: str | None = None
    project: str | None = None
    branch: str = "main"
    readmeFile: str = "README.md"
    languages: str | list[str]
    outline: str = "deep"
    intro: str
    content: str | None = None
    externalUrl: HttpUrl | None = None
    externalUrlLabel: str | None = None

    @model_validator(mode="after")
    def check_readme_requirements(self) -> "ProjectRequest":
        if self.fetchReadme and (not self.user or not self.project):
            raise ValueError("user and project are required when fetchReadme is True")
        return self


def get_wrapper_template(readme_content: str) -> str:
    """Returns the Vue component wrapper for the post."""
    return f'<ArticleItem :frontmatter="$frontmatter"/>\n\n{readme_content}\n'


# Fenced code blocks (```...``` or ~~~...~~~) and Markdown links/images
_MD_TOKEN = re.compile(
    r"(?ms)(?P<fence_block>^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n.*?(?:(?<=\n)[ \t]*(?P=fence)[ \t]*(?:\r?\n|\Z)|\Z))|"
    r"(?P<md_link>(?P<bang>!?)\[(?P<text>[^\]]*)\]\(\s*(?P<target>[^)\s]+)(?P<title>(?:\s+\"[^\"]*\")?)\s*\))"
)


def absolutize_links(readme: str, user: str, project: str, branch: str, readme_file: str) -> str:
    """Point relative links in a fetched README at the source repository.

    A README links to sibling files (`LICENSE`, `docs/x.md`) relative to its own
    repo, which are dead links once the text is rendered on this site. Links go
    to the GitHub blob view, images to raw.githubusercontent.com. Absolute URLs,
    `#anchors` and site-root paths are left alone. Links inside fenced code blocks
    are preserved untouched.
    """
    blob_base = f"https://github.com/{user}/{project}/blob/{branch}/{readme_file}"
    raw_base = f"https://raw.githubusercontent.com/{user}/{project}/{branch}/{readme_file}"

    def rewrite(match: re.Match[str]) -> str:
        if match.group("fence_block"):
            return match.group("fence_block")
        bang = match.group("bang") or ""
        text = match.group("text") or ""
        target = match.group("target") or ""
        title = match.group("title") or ""
        if target.startswith(("#", "/")) or urlsplit(target).scheme:
            return match.group(0)
        resolved = urljoin(raw_base if bang else blob_base, target)
        return f"{bang}[{text}]({resolved}{title})"

    return _MD_TOKEN.sub(rewrite, readme)


_FRONTMATTER_PATTERN = re.compile(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", re.DOTALL)


def parse_frontmatter(path: Path) -> dict[str, Any]:
    """Read YAML frontmatter between leading `---` and closing `---` from a file.

    Returns an empty dict if the file is missing, does not contain frontmatter,
    or the frontmatter is invalid.
    """
    try:
        content = path.read_text(encoding="utf-8-sig")
    except OSError:
        return {}

    match = _FRONTMATTER_PATTERN.match(content)
    if not match:
        return {}

    try:
        data = yaml.safe_load(match.group(1))
        return data if isinstance(data, dict) else {}
    except yaml.YAMLError:
        return {}


class GenerateFiles:
    def __init__(self) -> None:
        self.req_path = Path("requests")
        self.dst_dir = Path("projects")
        self.blog_path = Path("blog")
        self.blog_stats_path = Path("public/projects-cache/blog-stats.json")
        self._github_token_warned: bool = False
        self._stats_cache: dict[tuple[str, str], dict[str, int | str]] = {}

    def get_readme(self, user: str, project: str, branch: str, readme_file: str) -> str:
        """Fetch README content from GitHub."""
        if not all([user, project, readme_file]):
            logger.warning("Missing user, project, or readme_file: %s/%s", user, project)
            return ""

        url = f"https://raw.githubusercontent.com/{user}/{project}/{branch}/{readme_file}"
        try:
            text = fetch_text(url, timeout=10)
            return absolutize_links(text, user, project, branch, readme_file)
        except FetchError as e:
            logger.error("Failed to fetch README from %s: %s", url, e)
            return ""

    def process_requests(self) -> bool:
        """Process all request YAML files in the requests directory.

        Returns:
            True if all manifests were processed successfully, False otherwise.
        """
        if not self.req_path.exists():
            logger.error("Requests directory %s does not exist.", self.req_path)
            return False

        error_count = 0
        for req_file in sorted(self.req_path.glob("*.yaml")):
            try:
                with req_file.open("r") as file:
                    data = yaml.safe_load(file)

                if data is None:
                    logger.warning("Skipping empty request file: %s", req_file)
                    continue

                # Validate with Pydantic
                request = ProjectRequest(**data)
                self.process_request(request, req_file)

            except yaml.YAMLError as e:
                error_count += 1
                logger.error("Error parsing YAML in %s: %s", req_file, e)
            except ValidationError as e:
                error_count += 1
                logger.error("Validation error for %s: %s", req_file, e)
            except FetchError as e:
                error_count += 1
                logger.error("Network error fetching README for %s: %s", req_file, e)
            except OSError as e:
                error_count += 1
                logger.error("File I/O error for %s: %s", req_file, e)

        if self.blog_path.exists():
            self.process_blog_stats()

        return error_count == 0

    def process_blog_stats(self) -> None:
        """Fetch and cache GitHub repo stats for blog posts."""
        if not self.blog_path.exists():
            return

        results: dict[str, dict[str, int | str]] = {}
        for md_file in sorted(self.blog_path.glob("*.md")):
            frontmatter = parse_frontmatter(md_file)
            user = frontmatter.get("user")
            project = frontmatter.get("project")
            if isinstance(user, str) and user and isinstance(project, str) and project:
                stats = self.get_repo_stats(user, project)
                if stats:
                    results[f"{user}/{project}"] = stats

        self.blog_stats_path.parent.mkdir(parents=True, exist_ok=True)
        self.blog_stats_path.write_text(f"{json.dumps(results, indent=2)}\n", encoding="utf-8")

    def process_request(self, request: ProjectRequest, req_file: Path) -> None:
        """Process a single request and generate the markdown file."""
        basename = req_file.stem
        dst_path = self.dst_dir / f"{basename}.md"

        readme = ""
        logger.info("Processing project: %s (%s)", request.title, basename)

        if request.content:
            readme = request.content
        elif request.fetchReadme:
            readme = self.get_readme(
                request.user or "",
                request.project or "",
                request.branch,
                request.readmeFile,
            )
            if not readme:
                raise FetchError(f"Failed to fetch README for {request.title}")

        self.save_post(request, dst_path, readme, self.get_stats(request))

    def get_repo_stats(self, user: str | None, project: str | None) -> dict[str, int | str]:
        """Fetch repository stats for a GitHub repo; caches results and never fails the build."""
        if not user or not project:
            return {}
        if (user, project) in self._stats_cache:
            return dict(self._stats_cache[(user, project)])

        token = os.environ.get("GITHUB_TOKEN") or None
        if not token and not self._github_token_warned:
            logger.info("GITHUB_TOKEN not set; fetching repo stats unauthenticated (60 requests/hour)")
            self._github_token_warned = True
        try:
            stats: dict[str, int | str] = dict(fetch_repo_stats(user, project, token))
        except FetchError as e:
            logger.warning("Could not fetch repo stats for %s/%s: %s", user, project, e)
            return {}
        stats["statsFetched"] = datetime.now(UTC).date().isoformat()
        self._stats_cache[(user, project)] = stats
        return dict(stats)

    def get_stats(self, request: ProjectRequest) -> dict[str, int | str]:
        """Fetch repository stats for the badges; never fails the build.

        Returns an empty dict when the repo is unknown or the fetch fails.
        """
        return self.get_repo_stats(request.user, request.project)

    @staticmethod
    def save_post(
        request: ProjectRequest,
        dst_path: Path,
        readme: str,
        stats: dict[str, int | str] | None = None,
    ) -> None:
        """Save the generated content to a markdown file."""
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Saving to %s", dst_path)

        content_template = get_wrapper_template(readme)

        try:
            with dst_path.open("w") as pst_file:
                pst_file.write("---\n")
                # Convert model to dict for YAML dumping, exclude None values to keep it clean
                frontmatter = request.model_dump(exclude_none=True)
                # Convert HttpUrl to string for YAML serialization
                if "gitlink" in frontmatter:
                    frontmatter["gitlink"] = str(frontmatter["gitlink"])
                if "externalUrl" in frontmatter:
                    frontmatter["externalUrl"] = str(frontmatter["externalUrl"])
                if "content" in frontmatter:
                    del frontmatter["content"]
                if stats:
                    frontmatter.update(stats)

                yaml.safe_dump(frontmatter, pst_file, width=120, sort_keys=False)
                pst_file.write("---\n")
                pst_file.write(content_template)
        except OSError as e:
            logger.error("Error writing to %s: %s", dst_path, e)
            raise


if __name__ == "__main__":
    handler = GenerateFiles()
    if not handler.process_requests():
        sys.exit(1)
