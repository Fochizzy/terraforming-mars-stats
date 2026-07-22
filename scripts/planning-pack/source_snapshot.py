"""Source-isolation snapshot and comparison for the planning pack.

The planning pack reads most of its documents from the redesign checkout. Only
``DEPLOY-STATE`` is owned by a different repository lineage. A same-named file
exists under the live checkout for several of these documents, so a change that
quietly re-rooted an entry would publish the wrong content under a stable Drive
ID and be very hard to notice.

This module renders the resolved source configuration for every managed document
and compares it against a recorded snapshot. The updater runs the comparison
before it writes anything to Drive.

Standard library only, so it can be exercised without the updater's Google and
DOCX dependencies.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


SNAPSHOT_VERSION = 1

TABLE_COLUMNS = ("KEY", "SOURCE TYPE", "ROOT/REPOSITORY", "REF", "RELATIVE PATH", "DRIVE ID")


class SourceIsolationError(RuntimeError):
    """The resolved source configuration drifted from its recorded snapshot."""


def describe_source(source: Any, order: int, drive_id: str | None) -> dict[str, Any]:
    """Render one resolved source as a comparable record."""

    if source.git_spec is not None:
        return {
            "key": source.key,
            "title": source.title,
            "order": order,
            "source_type": "git",
            "root": str(source.git_spec.repository),
            "ref": source.git_spec.ref,
            "relative_path": source.git_spec.path,
            "drive_id": drive_id,
        }
    return {
        "key": source.key,
        "title": source.title,
        "order": order,
        "source_type": "filesystem",
        "root": str(source.path.parent),
        "ref": None,
        "relative_path": source.path.name,
        "drive_id": drive_id,
    }


def build_snapshot(sources: list[Any], drive_ids: dict[str, str]) -> dict[str, Any]:
    return {
        "version": SNAPSHOT_VERSION,
        "documents": [
            describe_source(source, order, drive_ids.get(source.key))
            for order, source in enumerate(sources)
        ],
    }


def render_table(snapshot: dict[str, Any]) -> str:
    rows = [
        (
            document["key"],
            document["source_type"],
            document["root"],
            document["ref"] or "-",
            document["relative_path"],
            document["drive_id"] or "-",
        )
        for document in snapshot["documents"]
    ]
    widths = [
        max(len(column), *(len(row[index]) for row in rows)) if rows else len(column)
        for index, column in enumerate(TABLE_COLUMNS)
    ]
    lines = [" | ".join(column.ljust(widths[index]) for index, column in enumerate(TABLE_COLUMNS))]
    lines.append("-+-".join("-" * width for width in widths))
    lines.extend(
        " | ".join(cell.ljust(widths[index]) for index, cell in enumerate(row)) for row in rows
    )
    return "\n".join(lines)


def load_snapshot(path: Path) -> dict[str, Any]:
    try:
        snapshot = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SourceIsolationError(f"Source snapshot is unreadable: {path}") from exc
    if snapshot.get("version") != SNAPSHOT_VERSION:
        raise SourceIsolationError(f"Unsupported source snapshot version in {path}.")
    if not isinstance(snapshot.get("documents"), list):
        raise SourceIsolationError(f"Source snapshot has no documents array: {path}")
    return snapshot


def compare_snapshots(
    before: dict[str, Any],
    after: dict[str, Any],
    allowed_changed_keys: frozenset[str],
    rotating_keys: frozenset[str] = frozenset(),
) -> list[str]:
    """Return every difference that is not an explicitly allowed change.

    ``rotating_keys`` names documents whose resolved file is selected
    dynamically rather than fixed by the manifest - the active-handoff entry
    tracks the newest handoff, so its filename changes whenever one is added.
    Only ``relative_path`` is exempt for those keys; their root, title, order,
    source type, and Drive ID are still compared, so a rotating document cannot
    silently move to another checkout.
    """

    differences: list[str] = []
    before_documents = {document["key"]: document for document in before["documents"]}
    after_documents = {document["key"]: document for document in after["documents"]}

    for key in sorted(set(before_documents) - set(after_documents)):
        differences.append(f"{key}: removed from the source catalog.")
    for key in sorted(set(after_documents) - set(before_documents)):
        differences.append(f"{key}: added to the source catalog.")

    for key in sorted(set(before_documents) & set(after_documents)):
        old = before_documents[key]
        new = after_documents[key]
        for field in ("title", "order", "source_type", "root", "ref", "relative_path", "drive_id"):
            if old.get(field) == new.get(field):
                continue
            if key in allowed_changed_keys and field != "drive_id":
                # The one entry this change is authorised to re-source. Its Drive
                # identity must still be stable.
                continue
            if key in rotating_keys and field == "relative_path":
                # Dynamically selected document; rotating to a different file is
                # its designed behaviour, not source drift.
                continue
            differences.append(
                f"{key}: {field} changed from {old.get(field)!r} to {new.get(field)!r}."
            )
    return differences


def assert_source_isolation(
    snapshot_path: Path,
    current: dict[str, Any],
    allowed_changed_keys: frozenset[str],
    required_git_keys: dict[str, tuple[str, str]],
    rotating_keys: frozenset[str] = frozenset(),
) -> None:
    """Fail closed unless the resolved sources match the recorded snapshot.

    ``required_git_keys`` maps a document key to the ``(repository, ref)`` pair
    it must resolve through, so a Git-sourced document cannot silently fall back
    to a filesystem path or drift onto another branch.
    """

    differences = compare_snapshots(
        load_snapshot(snapshot_path), current, allowed_changed_keys, rotating_keys
    )
    if differences:
        raise SourceIsolationError(
            "The resolved planning-pack sources differ from the recorded snapshot. "
            "Refusing to publish.\n- " + "\n- ".join(differences)
        )

    documents = {document["key"]: document for document in current["documents"]}
    for key, (repository, ref) in required_git_keys.items():
        document = documents.get(key)
        if document is None:
            raise SourceIsolationError(f"{key} is absent from the resolved source set.")
        if document["source_type"] != "git":
            raise SourceIsolationError(
                f"{key} resolved as {document['source_type']}, not through Git."
            )
        if document["root"] != repository or document["ref"] != ref:
            raise SourceIsolationError(
                f"{key} resolved through {document['root']}@{document['ref']}, "
                f"not the required {repository}@{ref}."
            )
