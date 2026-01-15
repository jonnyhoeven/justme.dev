import logging
import textwrap
from pathlib import Path
from typing import Any, Dict

import requests
import yaml

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def get_wrapper_template(post_content: str, readme_content: str) -> str:
    """Returns the Vue component wrapper for the post."""
    return (
        f"<script setup>\n"
        f" import ArticleItem from '/components/ArticleItem.vue';\n"
        f" import ArticleFooter from '/components/ArticleFooter.vue';\n"
        f"</script>\n"
        f'<ArticleItem :frontmatter="$frontmatter"/>\n'
        f"{post_content}\n"
        f"{readme_content}\n\n"
        f'<ArticleFooter :frontmatter="$frontmatter"/>\n'
    )


class GenerateFiles:
    def __init__(self) -> None:
        self.max_width = 120
        self.req_path = Path("generate/requests")

    def get_readme(self, user: str, project: str, branch: str, readme_file: str) -> str:
        """Fetch README content from GitHub."""
        if not all([user, project, readme_file]):
            logger.warning(f"Missing user, project, or readme_file for {user}/{project}")
            return ""

        url = f"https://raw.githubusercontent.com/{user}/{project}/{branch}/{readme_file}"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                logger.error(f"Error: No 200 response {url}")
                return ""
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
            logger.info(f"Loading {req_file.name}")
            try:
                with req_file.open("r") as file:
                    request = yaml.safe_load(file)

                if not request:
                    logger.error(f"Error loading {req_file}")
                    continue

                if "type" not in request:
                    logger.error(f"Error: Missing type in {req_file}")
                    continue

                self.process_request(request, req_file)
            except yaml.YAMLError as e:
                logger.error(f"Error parsing YAML {req_file}: {e}")
            except Exception as e:
                logger.error(f"Unexpected error processing {req_file}: {e}")

    def process_request(self, request: Dict[str, Any], req_file: Path) -> None:
        """Process a single request and generate the markdown file."""
        my_wrap = textwrap.TextWrapper(width=self.max_width)
        basename = req_file.stem
        request_type = request["type"]
        dst_dir = Path(f"{request_type}s")
        dst_path = dst_dir / f"{basename}.md"

        readme = ""
        post = ""
        logger.info(f"Processing {basename}")

        if request.get("fetchReadme", False):
            readme = self.get_readme(
                request.get("user", ""),
                request.get("project", ""),
                request.get("branch", "main"),
                request.get("readmeFile", ""),
            )

        self.save_post(request, dst_path, post, readme, my_wrap)

    @staticmethod
    def save_post(
        request: Dict[str, Any],
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
                yaml.safe_dump(request, pst_file, width=120)
                pst_file.write("---\n")
                pst_file.write(content_template)
        except IOError as e:
            logger.error(f"Error writing to {dst_path}: {e}")


if __name__ == "__main__":
    handler = GenerateFiles()
    handler.process_requests()
