#!/usr/bin/env python3
"""Generate the local-file-compatible viewer script from the original JSON export."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PREFIX = "// Generated from data.json by scripts/export_viewer_data.py; do not edit.\nwindow.RESULTS_DATA = "


def viewer_script() -> str:
    """Preserve all data and experiment order while removing JSON whitespace."""
    data = json.loads((ROOT / "results/data.json").read_text())
    return PREFIX + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n"


if __name__ == "__main__":
    (ROOT / "results/data.js").write_text(viewer_script())
    print("Updated results/data.js from results/data.json.")
