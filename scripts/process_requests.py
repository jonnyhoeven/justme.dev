import logging
import textwrap
from datetime import date
from pathlib import Path
from typing import List, Optional, Union

import yaml
from pydantic import BaseModel, HttpUrl

import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


class ProjectRequest(BaseModel):
    title: str
    type: str = "project"
    date: Union[date, str]
    image: str
    fetchReadme: bool = False
    gitlink: HttpUrl
    user: Optional[str] = None
    project: Optional[str] = None
    branch: str = "main"
    readmeFile: str = "README.md"
    languages: Union[str, List[str]]
    fetchML: bool = False
    outline: str = "deep"
    intro: str


def get_wrapper_template(post_content: str, readme_content: str) -> str:
    """Returns the Vue component wrapper for the post."""
    return (
        f"<script setup>\n"
        f" import ArticleItem from '/components/ArticleItem.vue';\n"
        f" import ArticleFooter from '/components/ArticleFooter.vue';\n"
        f"</script>\n\n"
        f'<ArticleItem :frontmatter="$frontmatter"/>\n\n'
        f"{post_content}\n"
        f"{readme_content}\n\n"
        f'<ArticleFooter :frontmatter="$frontmatter"/>\n'
    )


class GenerateFiles:
    def __init__(self) -> None:
        self.max_width = 120
        self.req_path = Path("requests")
        self.dst_dir = Path("projects")

    def get_readme(self, user: str, project: str, branch: str, readme_file: str) -> str:
        """Fetch README content from GitHub."""
        if not all([user, project, readme_file]):
            logger.warning(f"Missing user, project, or readme_file: {user}/{project}")
            return ""

        url = f"https://raw.githubusercontent.com/{user}/{project}/{branch}/{readme_file}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Failed to fetch README from {url}: {e}")
            return ""

    def process_requests(self) -> None:
        """Process all request YAML files in the requests directory."""
        if not self.req_path.exists():
            logger.error(f"Requests directory {self.req_path} does not exist.")
            return

        for req_file in self.req_path.glob("*.yaml"):
            try:
                with req_file.open("r") as file:
                    data = yaml.safe_load(file)

                if data is None:
                    logger.warning(f"Skipping empty request file: {req_file}")
                    continue

                # Validate with Pydantic
                request = ProjectRequest(**data)
                self.process_request(request, req_file)

            except yaml.YAMLError as e:
                logger.error(f"Error parsing YAML in {req_file}: {e}")
            except Exception as e:
                logger.error(f"Validation error for {req_file}: {e}")

    def process_request(self, request: ProjectRequest, req_file: Path) -> None:
        """Process a single request and generate the markdown file."""
        my_wrap = textwrap.TextWrapper(width=self.max_width)
        basename = req_file.stem
        dst_path = self.dst_dir / f"{basename}.md"

        readme = ""
        post = ""
        logger.info(f"Processing project: {request.title} ({basename})")

        if request.fetchReadme:
            readme = self.get_readme(
                request.user or "",
                request.project or "",
                request.branch,
                request.readmeFile,
            )

        self.save_post(request, dst_path, post, readme, my_wrap)

    @staticmethod
    def save_post(
        request: ProjectRequest,
        dst_path: Path,
        post: str,
        readme: str,
        my_wrap: textwrap.TextWrapper,
    ) -> None:
        """Save the generated content to a markdown file."""
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Saving to {dst_path}")

        wrapped_post = my_wrap.fill(post)
        content_template = get_wrapper_template(wrapped_post, readme)

        try:
            with dst_path.open("w") as pst_file:
                pst_file.write("---\n")
                # Convert model to dict for YAML dumping, exclude None values to keep it clean
                frontmatter = request.model_dump(exclude_none=True)
                # Convert HttpUrl to string for YAML serialization
                if "gitlink" in frontmatter:
                    frontmatter["gitlink"] = str(frontmatter["gitlink"])

                yaml.safe_dump(frontmatter, pst_file, width=120, sort_keys=False)
                pst_file.write("---\n")
                pst_file.write(content_template)
        except IOError as e:
            logger.error(f"Error writing to {dst_path}: {e}")


if __name__ == "__main__":
    handler = GenerateFiles()
    handler.process_requests()
