# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later
import re
import tomllib
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def normalize_package_name(name: str) -> str:
    """Normalize Python package names (lowercase, '-' vs '_')."""
    return name.lower().replace("_", "-")


def parse_flake_packages(flake_content: str) -> set[str]:
    """Extract Python package names from flake.nix python3.withPackages block."""
    match = re.search(r"python3\.withPackages\s*\([^\[]*\[(.*?)\]\)", flake_content, re.DOTALL)
    assert match, "Could not find python3.withPackages block in flake.nix"
    pkgs = set()
    for line in match.group(1).splitlines():
        line = line.split("#")[0].strip()
        for word in line.split():
            pkgs.add(normalize_package_name(word))
    return pkgs


def parse_pyproject_packages(pyproject_content: str) -> set[str]:
    """Extract Python package names from pyproject.toml [project].dependencies and [dependency-groups].dev."""
    data = tomllib.loads(pyproject_content)
    raw_deps: list[str] = list(data.get("project", {}).get("dependencies", []))
    raw_deps.extend(data.get("dependency-groups", {}).get("dev", []))
    pkgs = set()
    for dep in raw_deps:
        name = re.split(r"[<>=!~;]", dep, maxsplit=1)[0].strip()
        if name:
            pkgs.add(normalize_package_name(name))
    return pkgs


def test_flake_and_pyproject_python_dependencies_in_sync() -> None:
    flake_path = ROOT_DIR / "flake.nix"
    pyproject_path = ROOT_DIR / "pyproject.toml"

    assert flake_path.exists(), f"{flake_path} does not exist"
    assert pyproject_path.exists(), f"{pyproject_path} does not exist"

    flake_pkgs = parse_flake_packages(flake_path.read_text(encoding="utf-8"))
    pyproject_pkgs = parse_pyproject_packages(pyproject_path.read_text(encoding="utf-8"))

    assert flake_pkgs == pyproject_pkgs, (
        f"flake.nix and pyproject.toml Python packages differ: "
        f"flake-only: {flake_pkgs - pyproject_pkgs}, "
        f"pyproject-only: {pyproject_pkgs - flake_pkgs}"
    )
