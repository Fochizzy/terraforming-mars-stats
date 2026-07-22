"""Source-isolation regression tests for the planning-pack updater.

The planning pack reads 45 documents from the redesign checkout and exactly one
- DEPLOY-STATE - from the production lineage via Git. Several documents exist
under both checkouts with the same name, so a change that re-rooted an entry
would publish the wrong content under a stable Drive ID.

These tests prove that adding the Git source type changed the resolution of
exactly one entry and nothing else. Everything runs against temporary
directories; no real machine path is required.

The manifest-dispatch cases import ``update_planning_pack``, which needs the
updater's third-party dependencies. Run them with the installed updater
interpreter:

    %LOCALAPPDATA%\\TMPlanningPackUpdater\\.venv\\Scripts\\python.exe \\
        scripts/planning-pack/test_source_isolation.py

Cases that only exercise ``source_snapshot`` run under any Python 3.11+.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from source_snapshot import (
    SNAPSHOT_VERSION,
    SourceIsolationError,
    assert_source_isolation,
    build_snapshot,
    compare_snapshots,
)

try:  # The dispatch tests need the updater's Google/DOCX dependencies.
    import update_planning_pack as updater
except ImportError as exc:  # pragma: no cover - environment dependent
    updater = None
    UPDATER_IMPORT_ERROR = str(exc)

REDESIGN_ROOT_NAME = "Terraforming Mars Redesign"
LIVE_ROOT_NAME = "Terraforming Mars"
CANONICAL_REF = "fix/canonical-production-lineage"
CANONICAL_BODY = "# Deploy state\n\nWorker version: `canonical-from-git`\n"
STALE_BODY = "# Deploy state\n\nWorker version: `stale-working-tree-copy`\n"
SHARED_NAME = "MASTER-RULES.md"
REDESIGN_TEXT = "# Master rules\n\nThe redesign copy, which is the real source.\n"
STALE_REDESIGN_TEXT = "# Master rules\n\nAn OLD copy under the live checkout.\n"


def git(repository: Path, *arguments: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repository), *arguments],
        capture_output=True,
        check=True,
        text=True,
    ).stdout


def snapshot_document(key: str, root: str, **overrides: object) -> dict[str, object]:
    document: dict[str, object] = {
        "key": key,
        "title": key.upper(),
        "order": 0,
        "source_type": "filesystem",
        "root": root,
        "ref": None,
        "relative_path": f"{key}.md",
        "drive_id": f"drive-{key}",
    }
    document.update(overrides)
    return document


class SnapshotComparisonTests(unittest.TestCase):
    """The pre-publication gate, exercised without touching the real machine."""

    def setUp(self) -> None:
        self.before = {
            "version": SNAPSHOT_VERSION,
            "documents": [
                snapshot_document("master-rules", rf"C:\X\{REDESIGN_ROOT_NAME}\docs", order=0),
                snapshot_document("decisions", rf"C:\X\{REDESIGN_ROOT_NAME}\docs", order=1),
                snapshot_document(
                    "deploy-state",
                    rf"C:\X\{LIVE_ROOT_NAME}",
                    order=2,
                    relative_path="DEPLOY-STATE.md",
                ),
            ],
        }

    def after(self, **deploy_state_overrides: object) -> dict[str, object]:
        documents = [dict(document) for document in self.before["documents"]]
        documents[2].update(
            {
                "source_type": "git",
                "root": rf"C:\X\{LIVE_ROOT_NAME}",
                "ref": CANONICAL_REF,
                "relative_path": "DEPLOY-STATE.md",
            }
        )
        documents[2].update(deploy_state_overrides)
        return {"version": SNAPSHOT_VERSION, "documents": documents}

    def test_only_deploy_state_may_change(self) -> None:
        self.assertEqual(
            compare_snapshots(self.before, self.after(), frozenset({"deploy-state"})), []
        )

    def test_a_global_root_replacement_fails_isolation(self) -> None:
        # The exact mistake this gate exists to catch: rewriting every
        # "Terraforming Mars Redesign" root to "Terraforming Mars".
        rewritten = {
            "version": SNAPSHOT_VERSION,
            "documents": [
                dict(document, root=str(document["root"]).replace(REDESIGN_ROOT_NAME, LIVE_ROOT_NAME))
                for document in self.after()["documents"]
            ],
        }
        differences = compare_snapshots(self.before, rewritten, frozenset({"deploy-state"}))
        self.assertTrue(any("master-rules" in item and "root changed" in item for item in differences))
        self.assertTrue(any("decisions" in item and "root changed" in item for item in differences))

    def test_reordering_fails_isolation(self) -> None:
        reordered = self.after()
        reordered["documents"][0]["order"] = 1
        reordered["documents"][1]["order"] = 0
        differences = compare_snapshots(self.before, reordered, frozenset({"deploy-state"}))
        self.assertEqual(len(differences), 2)
        self.assertTrue(all("order changed" in item for item in differences))

    def test_retitling_fails_isolation(self) -> None:
        retitled = self.after()
        retitled["documents"][0]["title"] = "RENAMED"
        differences = compare_snapshots(self.before, retitled, frozenset({"deploy-state"}))
        self.assertEqual(differences, ["master-rules: title changed from 'MASTER-RULES' to 'RENAMED'."])

    def test_added_and_removed_entries_fail_isolation(self) -> None:
        changed = self.after()
        changed["documents"].pop(1)
        changed["documents"].append(snapshot_document("brand-new", rf"C:\X\{REDESIGN_ROOT_NAME}", order=3))
        differences = compare_snapshots(self.before, changed, frozenset({"deploy-state"}))
        self.assertIn("decisions: removed from the source catalog.", differences)
        self.assertIn("brand-new: added to the source catalog.", differences)

    def test_a_changed_drive_id_fails_even_for_deploy_state(self) -> None:
        differences = compare_snapshots(
            self.before, self.after(drive_id="a-different-drive-id"), frozenset({"deploy-state"})
        )
        self.assertEqual(len(differences), 1)
        self.assertIn("drive_id changed", differences[0])

    def test_gate_requires_deploy_state_to_resolve_through_git(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            snapshot_path = Path(temporary) / "before.json"
            snapshot_path.write_text(
                __import__("json").dumps(self.before), encoding="utf-8"
            )
            required = {"deploy-state": (rf"C:\X\{LIVE_ROOT_NAME}", CANONICAL_REF)}
            assert_source_isolation(
                snapshot_path, self.after(), frozenset({"deploy-state"}), required
            )
            # Same content, but resolved from the filesystem instead of Git.
            fell_back = self.after(source_type="filesystem", ref=None)
            with self.assertRaises(SourceIsolationError) as raised:
                assert_source_isolation(
                    snapshot_path, fell_back, frozenset({"deploy-state"}), required
                )
            self.assertIn("not through Git", str(raised.exception))

    def test_gate_rejects_deploy_state_on_another_branch(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            snapshot_path = Path(temporary) / "before.json"
            snapshot_path.write_text(__import__("json").dumps(self.before), encoding="utf-8")
            with self.assertRaises(SourceIsolationError) as raised:
                assert_source_isolation(
                    snapshot_path,
                    self.after(ref="some/other-branch"),
                    frozenset({"deploy-state"}),
                    {"deploy-state": (rf"C:\X\{LIVE_ROOT_NAME}", CANONICAL_REF)},
                )
            self.assertIn("not the required", str(raised.exception))


@unittest.skipIf(updater is None, f"updater dependencies unavailable: {globals().get('UPDATER_IMPORT_ERROR')}")
class ManifestDispatchTests(unittest.TestCase):
    """Per-entry dispatch: adding a Git source changes no filesystem entry."""

    def setUp(self) -> None:
        self._temporary = tempfile.TemporaryDirectory(prefix="tm_source_isolation_")
        self.addCleanup(self._temporary.cleanup)
        base = Path(self._temporary.name)

        # Two checkouts holding same-named documents, exactly like the machine.
        self.redesign = base / REDESIGN_ROOT_NAME
        self.live = base / LIVE_ROOT_NAME
        self.generated = base / "generated"
        (self.redesign / "docs").mkdir(parents=True)
        (self.live / "docs").mkdir(parents=True)
        self.generated.mkdir()
        (self.redesign / "docs" / SHARED_NAME).write_text(REDESIGN_TEXT, encoding="utf-8")
        (self.live / "docs" / SHARED_NAME).write_text(STALE_REDESIGN_TEXT, encoding="utf-8")

        git(self.live.parent, "init", "--quiet", str(self.live))
        git(self.live, "config", "user.email", "test@example.invalid")
        git(self.live, "config", "user.name", "Isolation Test")
        git(self.live, "config", "core.autocrlf", "false")
        (self.live / "DEPLOY-STATE.md").write_text(CANONICAL_BODY, encoding="utf-8")
        git(self.live, "add", "-A")
        git(self.live, "commit", "--quiet", "-m", "canonical ledger")
        git(self.live, "branch", "--quiet", CANONICAL_REF)
        # The working tree now disagrees with the canonical ref, as it did in
        # the real checkout.
        (self.live / "DEPLOY-STATE.md").write_text(STALE_BODY, encoding="utf-8")

        for name, value in (("ROOT", self.redesign), ("GENERATED_DIR", self.generated)):
            original = getattr(updater, name)
            setattr(updater, name, value)
            self.addCleanup(setattr, updater, name, original)

    def filesystem_entry(self) -> dict[str, object]:
        return {
            "key": "master-rules",
            "title": "MASTER-RULES",
            "root": "redesign",
            "path": f"docs/{SHARED_NAME}",
        }

    def git_entry(self) -> dict[str, object]:
        return {
            "key": "deploy-state",
            "title": "DEPLOY-STATE",
            "sourceType": "git",
            "repository": str(self.live),
            "ref": CANONICAL_REF,
            "path": "DEPLOY-STATE.md",
        }

    def test_filesystem_source_still_reads_from_the_redesign_root(self) -> None:
        source = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        self.assertEqual(source.path, (self.redesign / "docs" / SHARED_NAME).resolve())
        self.assertEqual(source.path.read_text(encoding="utf-8"), REDESIGN_TEXT)
        self.assertIsNone(source.git_spec)

    def test_a_same_named_file_under_the_live_checkout_is_ignored(self) -> None:
        source = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        text = source.path.read_text(encoding="utf-8")
        self.assertNotIn("OLD copy", text)
        # Compare by path ancestry, not substring: the live root's name is a
        # prefix of the redesign root's name on the real machine too, so a
        # substring check here would pass for the wrong reason.
        self.assertIn(self.redesign.resolve(), source.path.parents)
        self.assertNotIn(self.live.resolve(), source.path.parents)

    def test_adding_the_git_entry_does_not_alter_a_filesystem_entry(self) -> None:
        before = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        updater.manifest_source(self.git_entry(), "documents[1]")
        after = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        self.assertEqual(before, after)
        self.assertEqual(after.path.read_text(encoding="utf-8"), REDESIGN_TEXT)

    def test_only_deploy_state_carries_git_provenance(self) -> None:
        filesystem = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        git_source = updater.manifest_source(self.git_entry(), "documents[1]")
        self.assertIsNone(filesystem.git_spec)
        self.assertIsNotNone(git_source.git_spec)
        self.assertNotIn("Generated source provenance", filesystem.path.read_text(encoding="utf-8"))
        self.assertIn("Generated source provenance", git_source.path.read_text(encoding="utf-8"))

    def test_no_other_document_inherits_the_deploy_state_ref(self) -> None:
        updater.manifest_source(self.git_entry(), "documents[1]")
        filesystem = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        text = filesystem.path.read_text(encoding="utf-8")
        self.assertNotIn(CANONICAL_REF, text)
        self.assertNotIn(CANONICAL_REF, str(filesystem.path))

    def test_the_git_repository_is_not_reused_as_a_root(self) -> None:
        # A filesystem entry cannot borrow the DEPLOY-STATE repository.
        entry = self.filesystem_entry() | {"repository": str(self.live), "ref": CANONICAL_REF}
        with self.assertRaises(RuntimeError) as raised:
            updater.manifest_source(entry, "documents[0]")
        self.assertIn("declares Git fields", str(raised.exception))

    def test_the_retired_live_root_is_rejected(self) -> None:
        entry = {"key": "deploy-state", "title": "DEPLOY-STATE", "root": "live", "path": "DEPLOY-STATE.md"}
        with self.assertRaises(RuntimeError) as raised:
            updater.manifest_source(entry, "documents[0]")
        self.assertIn("unknown root", str(raised.exception))

    def test_git_source_reads_the_ref_not_the_working_tree(self) -> None:
        source = updater.manifest_source(self.git_entry(), "documents[1]")
        text = source.path.read_text(encoding="utf-8")
        self.assertIn("canonical-from-git", text)
        self.assertNotIn("stale-working-tree-copy", text)

    def test_manifest_override_selects_the_file_only(self) -> None:
        # A manifest committed in an isolated worktree may be selected for a
        # run, but relative paths must still resolve under ROOT, never against
        # the overriding manifest's own directory.
        elsewhere = Path(self._temporary.name) / "isolated-worktree"
        (elsewhere / "docs").mkdir(parents=True)
        (elsewhere / "docs" / SHARED_NAME).write_text(
            "# Master rules\n\nA DECOY beside the overriding manifest.\n", encoding="utf-8"
        )
        manifest = elsewhere / "CLAUDE-PROJECT-SOURCES.json"
        manifest.write_text("{}", encoding="utf-8")

        original = updater.SOURCE_MANIFEST
        self.addCleanup(setattr, updater, "SOURCE_MANIFEST", original)
        self.assertEqual(updater.set_source_manifest(manifest), manifest.resolve())

        source = updater.manifest_source(self.filesystem_entry(), "documents[0]")
        self.assertEqual(source.path, (self.redesign / "docs" / SHARED_NAME).resolve())
        self.assertEqual(source.path.read_text(encoding="utf-8"), REDESIGN_TEXT)
        self.assertNotIn(elsewhere.resolve(), source.path.parents)

    def test_manifest_override_defaults_back_to_the_fixed_path(self) -> None:
        original = updater.SOURCE_MANIFEST
        self.addCleanup(setattr, updater, "SOURCE_MANIFEST", original)
        self.assertEqual(updater.set_source_manifest(None), updater.DEFAULT_SOURCE_MANIFEST)
        self.assertEqual(
            updater.DEFAULT_SOURCE_MANIFEST.parent.parent.parent,
            Path(r"C:\Users\izzyh\Documents\Terraforming Mars Redesign"),
        )

    def test_manifest_override_rejects_a_missing_file(self) -> None:
        original = updater.SOURCE_MANIFEST
        self.addCleanup(setattr, updater, "SOURCE_MANIFEST", original)
        with self.assertRaises(RuntimeError):
            updater.set_source_manifest(Path(self._temporary.name) / "absent.json")

    def test_snapshot_records_one_git_and_one_filesystem_source(self) -> None:
        sources = [
            updater.manifest_source(self.filesystem_entry(), "documents[0]"),
            updater.manifest_source(self.git_entry(), "documents[1]"),
        ]
        snapshot = build_snapshot(sources, {"master-rules": "id-a", "deploy-state": "id-b"})
        by_key = {document["key"]: document for document in snapshot["documents"]}
        self.assertEqual(by_key["master-rules"]["source_type"], "filesystem")
        self.assertEqual(by_key["master-rules"]["root"], str(self.redesign / "docs"))
        self.assertIsNone(by_key["master-rules"]["ref"])
        self.assertEqual(by_key["deploy-state"]["source_type"], "git")
        self.assertEqual(by_key["deploy-state"]["ref"], CANONICAL_REF)
        self.assertEqual([document["order"] for document in snapshot["documents"]], [0, 1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
