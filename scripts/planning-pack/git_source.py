"""Resolve planning-pack documents directly from Git.

Some planning-pack documents are owned by a different repository lineage than
the redesign checkout the updater runs from. ``DEPLOY-STATE.md`` is the
motivating case: it is committed on the production lineage, and a working-tree
copy in any other checkout is stale by construction.

This module resolves such a document from a configured repository, ref, and
in-tree path, and renders a generated document whose provenance block names the
exact commits it came from. Every failure mode is fatal. There is deliberately
no filesystem fallback: if Git cannot resolve the configured source, the
updater stops rather than publishing a working-tree copy.

Only the standard library is imported here so the fail-closed logic stays
testable without the updater's Google and DOCX dependencies.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable


GIT_SOURCE_TYPE = "git"

#: Filesystem entries keep their existing behaviour. ``sourceType`` is optional
#: on them, so adding the Git type required no manifest migration and changed no
#: existing entry.
FILESYSTEM_SOURCE_TYPE = "filesystem"
FILESYSTEM_SOURCE_TYPES = frozenset({FILESYSTEM_SOURCE_TYPE, "file"})

#: Keys accepted on a Git-sourced manifest entry. Anything else is fatal, so a
#: filesystem fallback cannot be introduced by adding a key to the manifest.
ALLOWED_GIT_ENTRY_KEYS = frozenset(
    {"key", "title", "sourceType", "repository", "ref", "path"}
)

PROVENANCE_MARKER = (
    "> **Generated source provenance - updater metadata, not a production "
    "ledger entry.**"
)
BODY_SEPARATOR = "---"

PROVENANCE_FIELDS = (
    "source_type",
    "repository",
    "ref",
    "source_tip_commit",
    "path",
    "path_commit",
    "path_commit_time",
    "body_sha256",
    "generated_at",
)

GIT_TIMEOUT_SECONDS = 120


class GitSourceError(RuntimeError):
    """A configured Git source could not be resolved or verified."""


@dataclass(frozen=True)
class GitSourceSpec:
    repository: Path
    ref: str
    path: str

    def describe(self) -> str:
        return f"{self.repository}@{self.ref}:{self.path}"


@dataclass(frozen=True)
class GitSourceResolution:
    spec: GitSourceSpec
    tip_commit: str
    path_commit: str
    path_commit_time: str
    body: str
    body_sha256: str


def normalize_newlines(text: str) -> str:
    """Normalize CRLF and lone CR to LF.

    This is the only transformation applied to the canonical body. It is
    documented in the generated provenance block and mirrored by the validator
    so a byte comparison against ``git show`` stays exact.
    """

    return text.replace("\r\n", "\n").replace("\r", "\n")


def body_digest(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def parse_git_source(entry: Any, label: str) -> GitSourceSpec:
    """Validate a Git-sourced manifest entry. Every problem is fatal."""

    if not isinstance(entry, dict):
        raise GitSourceError(f"{label} must be an object.")
    if entry.get("sourceType") != GIT_SOURCE_TYPE:
        raise GitSourceError(
            f"{label} is not a Git source: sourceType={entry.get('sourceType')!r}"
        )

    unexpected = sorted(set(entry) - ALLOWED_GIT_ENTRY_KEYS)
    if unexpected:
        raise GitSourceError(
            f"{label} declares unsupported Git-source keys: {', '.join(unexpected)}. "
            "A Git source has no filesystem fallback."
        )

    repository = entry.get("repository")
    ref = entry.get("ref")
    path = entry.get("path")
    for name, value in (("repository", repository), ("ref", ref), ("path", path)):
        if not isinstance(value, str) or not value.strip():
            raise GitSourceError(f"{label} has a missing or empty {name}.")

    normalized_path = path.replace("\\", "/").strip()
    if normalized_path.startswith("/") or ":" in normalized_path:
        raise GitSourceError(
            f"{label} path must be repository-relative, not a filesystem path: {path}"
        )
    if normalized_path == ".." or normalized_path.startswith("../") or "/../" in normalized_path:
        raise GitSourceError(f"{label} path must not escape the repository: {path}")

    return GitSourceSpec(Path(repository), ref.strip(), normalized_path)


def _run_git(spec: GitSourceSpec, arguments: list[str], label: str) -> bytes:
    if not spec.repository.is_dir():
        raise GitSourceError(
            f"{label}: configured Git repository does not exist: {spec.repository}"
        )
    command = ["git", "-C", str(spec.repository), *arguments]
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            check=False,
            timeout=GIT_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        raise GitSourceError(
            f"{label}: the git executable is unavailable for {spec.describe()}"
        ) from exc
    except subprocess.SubprocessError as exc:
        raise GitSourceError(
            f"{label}: git invocation failed for {spec.describe()}: {exc}"
        ) from exc
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise GitSourceError(
            f"{label}: git {' '.join(arguments)} failed for {spec.describe()} "
            f"(exit {completed.returncode}): {detail}"
        )
    return completed.stdout


def _decode(raw: bytes, label: str, what: str) -> str:
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GitSourceError(f"{label}: {what} is not valid UTF-8: {exc}") from exc


def resolve_git_source(spec: GitSourceSpec, label: str = "Git source") -> GitSourceResolution:
    """Resolve the configured ref and path. Never falls back to the filesystem."""

    tip_commit = _decode(
        _run_git(spec, ["rev-parse", "--verify", "--quiet", f"{spec.ref}^{{commit}}"], label),
        label,
        "the resolved ref",
    ).strip()
    if not tip_commit:
        raise GitSourceError(f"{label}: ref does not resolve to a commit: {spec.ref}")

    object_type = _decode(
        _run_git(spec, ["cat-file", "-t", f"{spec.ref}:{spec.path}"], label),
        label,
        "the resolved object type",
    ).strip()
    if object_type != "blob":
        raise GitSourceError(
            f"{label}: {spec.ref}:{spec.path} is a {object_type or 'missing object'}, "
            "not a file."
        )

    log_line = _decode(
        _run_git(
            spec,
            ["log", "-1", "--format=%H%x00%cI", spec.ref, "--", spec.path],
            label,
        ),
        label,
        "the file history",
    ).strip()
    if not log_line or "\0" not in log_line:
        raise GitSourceError(
            f"{label}: no commit touches {spec.path} on {spec.ref}."
        )
    path_commit, path_commit_time = log_line.split("\0", 1)
    path_commit = path_commit.strip()
    path_commit_time = path_commit_time.strip()
    if len(path_commit) != 40 or not path_commit_time:
        raise GitSourceError(
            f"{label}: unusable file-touch history for {spec.describe()}: {log_line!r}"
        )

    body = normalize_newlines(
        _decode(
            _run_git(spec, ["show", f"{spec.ref}:{spec.path}"], label),
            label,
            "the source body",
        )
    )
    if not body.strip():
        raise GitSourceError(f"{label}: resolved an empty body for {spec.describe()}.")
    if body.lstrip("\n").startswith(f"{BODY_SEPARATOR}\n"):
        raise GitSourceError(
            f"{label}: the canonical body starts with '{BODY_SEPARATOR}', which would "
            "make the generated body separator ambiguous."
        )

    return GitSourceResolution(
        spec=spec,
        tip_commit=tip_commit,
        path_commit=path_commit,
        path_commit_time=path_commit_time,
        body=body,
        body_sha256=body_digest(body),
    )


def render_generated_document(
    resolution: GitSourceResolution, title: str, generated_at: str
) -> str:
    """Render the provenance wrapper followed by the exact canonical body."""

    values = {
        "source_type": GIT_SOURCE_TYPE,
        "repository": str(resolution.spec.repository),
        "ref": resolution.spec.ref,
        "source_tip_commit": resolution.tip_commit,
        "path": resolution.spec.path,
        "path_commit": resolution.path_commit,
        "path_commit_time": resolution.path_commit_time,
        "body_sha256": resolution.body_sha256,
        "generated_at": generated_at,
    }
    lines = [
        f"# {title} (generated from Git)",
        "",
        PROVENANCE_MARKER,
        ">",
        "> The TM planning-pack updater generated this page directly from Git. The",
        "> canonical body begins after the horizontal rule below and is identical to",
        f"> `git show {resolution.spec.ref}:{resolution.spec.path}` in the repository named",
        "> here, after normalizing CRLF and lone CR to LF and nothing else.",
        ">",
        "> This block is updater metadata. It is not a deploy ledger entry, and no",
        "> production fact may be added to it. Production facts belong in the canonical",
        "> file on the production lineage, committed there.",
        ">",
    ]
    lines.extend(f"> - `{field}`: `{values[field]}`" for field in PROVENANCE_FIELDS)
    lines.extend(["", BODY_SEPARATOR, ""])
    return "\n".join(lines) + "\n" + resolution.body


def parse_generated_document(text: str) -> tuple[dict[str, str], str]:
    """Split a generated document into its provenance fields and canonical body.

    Raises :class:`GitSourceError` when the provenance block is absent,
    incomplete, or duplicated.
    """

    normalized = normalize_newlines(text)
    lines = normalized.split("\n")
    if PROVENANCE_MARKER not in lines:
        raise GitSourceError("The generated document has no provenance block.")
    if lines.count(PROVENANCE_MARKER) != 1:
        raise GitSourceError("The generated document has more than one provenance block.")

    try:
        separator_index = lines.index(BODY_SEPARATOR)
    except ValueError as exc:
        raise GitSourceError(
            "The generated document has no body separator after the provenance block."
        ) from exc
    if separator_index < lines.index(PROVENANCE_MARKER):
        raise GitSourceError(
            "The generated document's body separator precedes its provenance block."
        )

    provenance: dict[str, str] = {}
    for line in lines[:separator_index]:
        stripped = line.strip()
        if not stripped.startswith("> - `"):
            continue
        remainder = stripped[len("> - `") :]
        name, sep, value = remainder.partition("`: `")
        if not sep or not value.endswith("`"):
            raise GitSourceError(f"Unparseable provenance line: {stripped}")
        if name in provenance:
            raise GitSourceError(f"Duplicate provenance field: {name}")
        provenance[name] = value[:-1]

    missing = [field for field in PROVENANCE_FIELDS if field not in provenance]
    if missing:
        raise GitSourceError(
            "The provenance block is missing fields: " + ", ".join(missing)
        )
    unexpected = sorted(set(provenance) - set(PROVENANCE_FIELDS))
    if unexpected:
        raise GitSourceError(
            "The provenance block has unexpected fields: " + ", ".join(unexpected)
        )

    body = "\n".join(lines[separator_index + 1 :])
    if body.startswith("\n"):
        body = body[1:]
    return provenance, body


def _expected_provenance(resolution: GitSourceResolution) -> dict[str, str]:
    return {
        "source_type": GIT_SOURCE_TYPE,
        "repository": str(resolution.spec.repository),
        "ref": resolution.spec.ref,
        "source_tip_commit": resolution.tip_commit,
        "path": resolution.spec.path,
        "path_commit": resolution.path_commit,
        "path_commit_time": resolution.path_commit_time,
        "body_sha256": resolution.body_sha256,
    }


def _reusable_generated_at(
    destination: Path, resolution: GitSourceResolution
) -> str | None:
    """Return the stamped time of an existing generated file that still matches.

    The generation timestamp is only re-stamped when the resolved Git provenance
    or body actually changed. That keeps the artifact byte-stable across runs,
    which is what lets an unchanged source leave the Google Doc unchanged.
    """

    if not destination.is_file():
        return None
    try:
        provenance, body = parse_generated_document(
            destination.read_text(encoding="utf-8")
        )
    except (GitSourceError, OSError, UnicodeDecodeError):
        return None
    expected = _expected_provenance(resolution)
    if any(provenance.get(field) != value for field, value in expected.items()):
        return None
    if body != resolution.body or body_digest(body) != resolution.body_sha256:
        return None
    generated_at = provenance.get("generated_at", "")
    if not generated_at or not _is_at_or_after(generated_at, resolution.path_commit_time):
        return None
    return generated_at


def _is_at_or_after(candidate: str, floor: str) -> bool:
    try:
        return datetime.fromisoformat(candidate) >= datetime.fromisoformat(floor)
    except ValueError:
        return False


def current_timestamp() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def write_generated_git_source(
    spec: GitSourceSpec,
    generated_dir: Path,
    key: str,
    title: str,
    label: str = "Git source",
    now: Callable[[], str] = current_timestamp,
) -> Path:
    """Resolve the Git source and write its generated document. Fails closed."""

    resolution = resolve_git_source(spec, label)
    destination = generated_dir / f"{key}.md"
    generated_at = _reusable_generated_at(destination, resolution) or now()
    if not _is_at_or_after(generated_at, resolution.path_commit_time):
        raise GitSourceError(
            f"{label}: generation time {generated_at} predates the source commit time "
            f"{resolution.path_commit_time}. Refusing to stamp a contradictory "
            "provenance block."
        )

    content = render_generated_document(resolution, title, generated_at)
    generated_dir.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".md.tmp")
    temporary.write_text(content, encoding="utf-8", newline="\n")
    os.replace(temporary, destination)

    verify_generated_document(destination, spec, label)
    return destination


def verify_generated_document(
    destination: Path, spec: GitSourceSpec, label: str = "Git source"
) -> dict[str, str]:
    """Re-resolve Git and prove the generated file still matches it exactly.

    This runs after generation and before publication, so a stale or tampered
    artifact stops the run instead of reaching Google Drive.
    """

    if not destination.is_file():
        raise GitSourceError(f"{label}: generated document is missing: {destination}")
    try:
        text = destination.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        raise GitSourceError(
            f"{label}: generated document is unreadable: {destination}"
        ) from exc

    provenance, body = parse_generated_document(text)
    resolution = resolve_git_source(spec, label)
    for field, expected in _expected_provenance(resolution).items():
        actual = provenance.get(field)
        if actual != expected:
            raise GitSourceError(
                f"{label}: generated {field} is {actual!r} but Git resolves {expected!r}."
            )
    if body != resolution.body:
        raise GitSourceError(
            f"{label}: the generated body differs from "
            f"git show {spec.ref}:{spec.path}."
        )
    if body_digest(body) != provenance["body_sha256"]:
        raise GitSourceError(
            f"{label}: the stamped body hash does not match the generated body."
        )
    if not _is_at_or_after(provenance["generated_at"], resolution.path_commit_time):
        raise GitSourceError(
            f"{label}: stamped generation time {provenance['generated_at']} predates "
            f"the source commit time {resolution.path_commit_time}."
        )
    return provenance


# ---------------------------------------------------------------------------
# Committed-tree reads for same-lineage sources (Design B).
#
# ``resolve_git_source`` / ``write_generated_git_source`` above wrap a
# cross-lineage document (``deploy-state``) in a provenance block. The functions
# below read a same-lineage document's exact committed bytes with the same
# ``git show <ref>:<path>`` mechanism but WITHOUT a provenance wrapper, so the
# published content is byte-identical to the canonical file. They exist so the
# updater can source every document from a pinned commit rather than the working
# tree, which is what makes an uncommitted working-tree edit unable to reach the
# publish payload by construction. Every failure mode remains fatal: there is no
# filesystem fallback here either.
# ---------------------------------------------------------------------------


def resolve_ref_to_commit(
    repository: Path, ref: str, label: str = "Committed source"
) -> str:
    """Resolve ``ref`` to a concrete commit SHA once. Fails closed.

    The updater calls this a single time per run and reads every same-lineage
    source at the returned SHA, so a publish is a consistent snapshot of one
    commit even if new commits land while the run is in progress.
    """

    spec = GitSourceSpec(repository, ref, "-")
    sha = _decode(
        _run_git(spec, ["rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"], label),
        label,
        "the resolved ref",
    ).strip()
    if not sha:
        raise GitSourceError(f"{label}: ref does not resolve to a commit: {ref}")
    return sha


def read_committed_blob(spec: GitSourceSpec, label: str = "Committed source") -> bytes:
    """Return the exact bytes of ``<ref>:<path>``. Fails closed.

    Used for binary sources (for example the ``.docx`` master guide) where a
    text decode would be wrong. A path that resolves to a tree or is absent
    stops the run rather than falling back to the filesystem.
    """

    object_type = _decode(
        _run_git(spec, ["cat-file", "-t", f"{spec.ref}:{spec.path}"], label),
        label,
        "the resolved object type",
    ).strip()
    if object_type != "blob":
        raise GitSourceError(
            f"{label}: {spec.ref}:{spec.path} is a {object_type or 'missing object'}, "
            "not a file."
        )
    return _run_git(spec, ["show", f"{spec.ref}:{spec.path}"], label)


def read_committed_text(spec: GitSourceSpec, label: str = "Committed source") -> str:
    """Return ``<ref>:<path>`` as text with CRLF and lone CR normalized to LF.

    Newline normalization is the only transformation, mirroring
    ``resolve_git_source`` so the committed bytes are treated identically whether
    a document is same-lineage or cross-lineage.
    """

    return normalize_newlines(
        _decode(read_committed_blob(spec, label), label, "the source body")
    )


def materialize_committed_file(
    spec: GitSourceSpec,
    destination: Path,
    label: str = "Committed source",
    binary: bool = False,
) -> Path:
    """Write ``<ref>:<path>`` to ``destination`` atomically. Fails closed.

    ``destination`` is an updater-owned staging path, never a source checkout.
    Text is stored as UTF-8 with LF newlines so an unchanged source produces a
    byte-stable artifact across runs; binary content is stored verbatim. If Git
    cannot resolve the source, nothing is written and no previous artifact is
    overwritten.
    """

    data = read_committed_blob(spec, label) if binary else read_committed_text(
        spec, label
    ).encode("utf-8")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_bytes(data)
    os.replace(temporary, destination)
    return destination


def committed_path_commit_time(
    repository: Path, sha: str, repo_rel: str, label: str = "Committed source"
) -> int:
    """Return the committer UNIX time of the newest commit touching ``repo_rel``.

    ``latest-handoff`` selects the newest handoff over the pinned commit rather
    than by working-tree mtime; an mtime is meaningless once content is read from
    Git. A path with no touching commit is fatal.
    """

    spec = GitSourceSpec(repository, sha, repo_rel)
    raw = _decode(
        _run_git(spec, ["log", "-1", "--format=%ct", sha, "--", repo_rel], label),
        label,
        "the file history",
    ).strip()
    if not raw:
        raise GitSourceError(f"{label}: no commit touches {repo_rel} at {sha}.")
    try:
        return int(raw)
    except ValueError as exc:
        raise GitSourceError(
            f"{label}: unusable commit time for {repo_rel}: {raw!r}"
        ) from exc


def list_committed_blobs(
    repository: Path, sha: str, repo_rel_dir: str, label: str = "Committed source"
) -> list[str]:
    """List repository-relative blob paths directly under ``repo_rel_dir`` at ``sha``.

    Enumerates from the pinned commit with ``git ls-tree`` rather than a working
    directory scan, so a file present on disk but not committed is not listed,
    and a file committed but absent from disk still is. Only blobs are returned;
    subtrees are ignored. A missing directory yields an empty list, which the
    caller turns into a fail-closed error when it expected entries.
    """

    normalized = repo_rel_dir.replace("\\", "/").strip("/")
    spec = GitSourceSpec(repository, sha, normalized or "-")
    raw = _run_git(spec, ["ls-tree", "-z", sha, f"{normalized}/"], label).decode(
        "utf-8", errors="surrogateescape"
    )
    entries: list[str] = []
    for record in raw.split("\0"):
        if not record.strip():
            continue
        meta, tab, path = record.partition("\t")
        if not tab:
            continue
        fields = meta.split()
        if len(fields) >= 2 and fields[1] == "blob":
            entries.append(path)
    return entries
