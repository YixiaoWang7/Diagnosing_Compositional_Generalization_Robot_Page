#!/usr/bin/env python3
"""Check the static site's local references, viewer data, and JavaScript syntax."""

import json
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    """Collect IDs and local resource references from an HTML document."""

    def __init__(self, path: Path) -> None:
        super().__init__()
        self.path = path
        self.ids: set[str] = set()
        self.references: list[str] = []
        self.errors: list[str] = []
        self.feed(path.read_text())

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if value is None:
                continue
            if name == "id":
                if value in self.ids:
                    self.errors.append(f"duplicate ID: {value}")
                self.ids.add(value)
            if name in ("src", "href", "data-results-src"):
                self.references.append(value)
            if name.startswith("on"):
                self.errors.append(f"inline event handler: {name}")


def check_viewer(path: Path) -> None:
    """Check that the viewer's task cells agree with its metadata."""
    data = json.loads(path.read_text())
    meta = data["meta"]
    axes = [meta[key] for key in ("objects", "receptacles", "colors")]
    tasks = meta["all_tasks"]
    assert len(set(tasks)) == len(tasks), "duplicate task identities"
    assert len(tasks) == len(axes[0]) * len(axes[1]) * len(axes[2]), "incomplete task grid"
    assert data["experiments"], "no experiments"
    assert meta["experiment_order"] == list(data["experiments"]), "experiment order differs"
    for name, experiment in data["experiments"].items():
        cells = experiment["cells"]
        assert len(cells) == len(tasks), f"{name}: incomplete task cells"
        assert {cell["task"] for cell in cells} == set(tasks), f"{name}: task identities differ"
        coordinates = {tuple(cell["coords"]) for cell in cells}
        assert len(coordinates) == len(tasks), f"{name}: duplicate coordinates"
        for cell in cells:
            assert len(cell["coords"]) == 3, f"{name}: expected three coordinates"
            for axis, coordinate, key in zip(axes, cell["coords"], ("object", "receptacle", "color")):
                assert isinstance(coordinate, int) and 0 <= coordinate < len(axis), f"{name}: invalid coordinate"
                assert axis[coordinate] == cell[key], f"{name}: coordinate label differs"


def main() -> None:
    """Report broken references and exit unsuccessfully if a check fails."""
    pages = {
        path.resolve(): Page(path)
        for path in ROOT.rglob("*.html")
        if not any(part.startswith(".") or part == "tmp" for part in path.relative_to(ROOT).parts)
    }
    errors = []
    for source, page in pages.items():
        label = source.relative_to(ROOT)
        errors.extend(f"{label}: {message}" for message in page.errors)
        for reference in page.references:
            link = urlsplit(reference)
            if link.scheme or link.netloc:
                continue
            if link.path.startswith("/"):
                errors.append(f"{label}: use a relative URL: {reference}")
                continue
            target = (source.parent / unquote(link.path)).resolve() if link.path else source
            if target.is_dir():
                target /= "index.html"
            if not target.is_relative_to(ROOT) or not target.is_file():
                errors.append(f"{label}: missing local target: {reference}")
            elif link.fragment and target in pages and unquote(link.fragment) not in pages[target].ids:
                errors.append(f"{label}: missing fragment: {reference}")

    for stylesheet in (ROOT / "assets/css").glob("*.css"):
        for reference in re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", stylesheet.read_text()):
            link = urlsplit(reference)
            if not link.scheme and not link.netloc and link.path:
                if not (stylesheet.parent / unquote(link.path)).is_file():
                    errors.append(f"{stylesheet.relative_to(ROOT)}: missing CSS asset: {reference}")

    dataset = ROOT / "results/data.json"
    if dataset.exists():
        try:
            check_viewer(dataset)
        except (AssertionError, KeyError, TypeError, ValueError) as error:
            errors.append(f"results/data.json: {error}")

    scripts = sorted((ROOT / "assets/js").rglob("*.js"))
    node = shutil.which("node")
    if node:
        for script in scripts:
            result = subprocess.run([node, "--check", str(script)], capture_output=True, text=True)
            if result.returncode:
                errors.append(result.stderr.strip())
    else:
        print("Node.js not installed; JavaScript syntax checks skipped.")

    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Passed: {len(pages)} HTML pages, local assets, viewer data, and {len(scripts) if node else 0} JavaScript syntax checks.")


if __name__ == "__main__":
    main()
