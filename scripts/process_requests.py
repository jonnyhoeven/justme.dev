# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import logging
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import yaml
from pydantic import BaseModel, HttpUrl, ValidationError, model_validator

import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


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
    return (
        f'<ArticleItem :frontmatter="$frontmatter"/>\n\n'
        f"{readme_content}\n\n"
        f'<ArticleFooter :frontmatter="$frontmatter"/>\n'
    )


# Fenced code blocks (```...``` or ~~~...~~~) and Markdown links/images
_MD_TOKEN = re.compile(
    r"(?ms)(?P<fence_block>^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n.*?(?:(?<=\n)[ \t]*(?P=fence)[ \t]*(?:\r?\n|\Z)|\Z))|"
    r"(?P<md_link>(?P<bang>!?)\[(?P<text>[^\]]*)\]\(\s*(?P<target>[^)\s]+)(?P<title>(?:\s+\"[^\"]*\")?)\s*\))"
)


def absolutize_links(
    readme: str, user: str, project: str, branch: str, readme_file: str
) -> str:
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


class GenerateFiles:
    def __init__(self) -> None:
        self.req_path = Path("requests")
        self.dst_dir = Path("projects")

    def get_readme(self, user: str, project: str, branch: str, readme_file: str) -> str:
        """Fetch README content from GitHub."""
        if not all([user, project, readme_file]):
            logger.warning("Missing user, project, or readme_file: %s/%s", user, project)
            return ""

        url = f"https://raw.githubusercontent.com/{user}/{project}/{branch}/{readme_file}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return absolutize_links(response.text, user, project, branch, readme_file)
        except requests.RequestException as e:
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
            except requests.RequestException as e:
                error_count += 1
                logger.error("Network error fetching README for %s: %s", req_file, e)
            except OSError as e:
                error_count += 1
                logger.error("File I/O error for %s: %s", req_file, e)

        return error_count == 0

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
                raise requests.RequestException(
                    f"Failed to fetch README for {request.title}"
                )

        self.save_post(request, dst_path, readme)

    @staticmethod
    def save_post(
        request: ProjectRequest,
        dst_path: Path,
        readme: str,
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
