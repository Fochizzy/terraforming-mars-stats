"""Align the installed planning-pack updater with the versioned one.

The updater runs from an installed copy outside Git:

    %LOCALAPPDATA%\\TMPlanningPackUpdater\\

Changing only the repository copy is cosmetic, because the desktop launcher
invokes the installed one. These two copies were previously aligned by hand,
which is how they drift.

This script copies only the versioned program files. It never touches
credentials, tokens, the Drive map, run summaries, logs, generated documents, or
the virtual environment, so local configuration and stable Drive identity are
preserved.

    python scripts/planning-pack/sync_installed_updater.py --check
    python scripts/planning-pack/sync_installed_updater.py --apply

Comparison ignores line endings: the repository stores CRLF and the installed
copy has historically been mixed, which is not a functional difference.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
from pathlib import Path


SOURCE_DIR = Path(__file__).resolve().parent

#: The program files that must match. Everything else in the installed
#: directory is local state and is deliberately left alone.
SYNCED_FILES = (
    "update_planning_pack.py",
    "git_source.py",
    "source_snapshot.py",
    "verify_drive.py",
    "google_docs_title_sanitize.py",
)

#: Never copied or removed, even if a name above were to change.
PROTECTED_NAMES = frozenset(
    {
        "credentials.json",
        "token.json",
        "drive-map.json",
        "last-run-summary.json",
        "update.lock",
        "run-updater.bat",
        "google-docs-reference.docx",
        ".venv",
        "logs",
        "generated",
    }
)


def installed_dir() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        raise SystemExit("LOCALAPPDATA is not set; cannot locate the installed updater.")
    return Path(local_app_data) / "TMPlanningPackUpdater"


def file_digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalized_digest(path: Path) -> str:
    """Hash with newlines normalized, so CRLF/LF differences are not drift."""

    return hashlib.sha256(
        path.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    ).hexdigest()


def report(destination: Path) -> tuple[list[str], list[str]]:
    identical: list[str] = []
    drifted: list[str] = []
    for name in SYNCED_FILES:
        source = SOURCE_DIR / name
        if not source.is_file():
            raise SystemExit(f"Versioned updater file is missing: {source}")
        target = destination / name
        if not target.is_file():
            drifted.append(f"{name}: absent from the installed updater")
            continue
        if normalized_digest(source) == normalized_digest(target):
            identical.append(name)
        else:
            drifted.append(f"{name}: installed copy differs from the versioned copy")
    return identical, drifted


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Report drift without changing anything.")
    mode.add_argument("--apply", action="store_true", help="Copy the versioned files over the installed ones.")
    arguments = parser.parse_args()

    destination = installed_dir()
    if not destination.is_dir():
        raise SystemExit(f"The installed updater directory does not exist: {destination}")

    if arguments.apply:
        for name in SYNCED_FILES:
            if name in PROTECTED_NAMES:
                raise SystemExit(f"Refusing to overwrite protected local state: {name}")
            shutil.copyfile(SOURCE_DIR / name, destination / name)

    identical, drifted = report(destination)
    for name in SYNCED_FILES:
        target = destination / name
        marker = "ok  " if name in identical else "DRIFT"
        digest = file_digest(target) if target.is_file() else "absent"
        print(f"{marker} {name}\n      versioned {file_digest(SOURCE_DIR / name)}\n      installed {digest}")
    if drifted:
        print("\nDrift detected:")
        for item in drifted:
            print(f"- {item}")
        return 1
    print(f"\nAll {len(SYNCED_FILES)} versioned updater files match the installed copies.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
