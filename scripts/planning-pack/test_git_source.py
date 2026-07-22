"""Executable tests for the planning pack's Git source resolution.

Every test builds its own throwaway Git repository, so nothing here depends on
the real TM Stats checkout, its branches, or its history.

Run with any Python 3.11+ interpreter:

    python scripts/planning-pack/test_git_source.py
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import git_source
from git_source import (
    GitSourceError,
    GitSourceSpec,
    body_digest,
    parse_generated_document,
    parse_git_source,
    resolve_git_source,
    verify_generated_document,
    write_generated_git_source,
)


CANONICAL_REF = "fix/canonical-lineage"
CANONICAL_PATH = "DEPLOY-STATE.md"
CANONICAL_BODY = (
    "# Deploy state\n"
    "\n"
    "## Current production\n"
    "\n"
    "| | |\n"
    "|---|---|\n"
    "| Worker version | `6ef56761-3c41-4c90-b83c-19db0060c048` |\n"
    "| Source commit | `d12e33ad09e976ec5779a6f0d79b621846912964` |\n"
)
STALE_BODY = "# Deploy state\n\nWorker version: `178229f3` - stale working copy.\n"


def git(repository: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repository), *arguments],
        capture_output=True,
        check=True,
        text=True,
    )
    return completed.stdout


class GitSourceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = tempfile.TemporaryDirectory(prefix="tm_git_source_test_")
        self.addCleanup(self._temporary.cleanup)
        base = Path(self._temporary.name)
        self.repository = base / "repo"
        self.generated = base / "generated"
        self.repository.mkdir()
        self.generated.mkdir()

        git(self.repository, "init", "--quiet", "--initial-branch=main")
        git(self.repository, "config", "user.email", "test@example.invalid")
        git(self.repository, "config", "user.name", "Planning Pack Test")
        git(self.repository, "config", "commit.gpgsign", "false")

        (self.repository / "README.md").write_text("seed\n", encoding="utf-8")
        git(self.repository, "add", "README.md")
        git(self.repository, "commit", "--quiet", "-m", "seed")

        git(self.repository, "checkout", "--quiet", "-b", CANONICAL_REF)
        self.write_canonical(CANONICAL_BODY, "record the current production release")

    def write_canonical(self, body: str, message: str) -> None:
        (self.repository / CANONICAL_PATH).write_text(body, encoding="utf-8", newline="\n")
        git(self.repository, "add", CANONICAL_PATH)
        git(self.repository, "commit", "--quiet", "-m", message)

    def spec(self, ref: str = CANONICAL_REF, path: str = CANONICAL_PATH) -> GitSourceSpec:
        return GitSourceSpec(self.repository, ref, path)

    def entry(self, **overrides: object) -> dict[str, object]:
        entry: dict[str, object] = {
            "key": "deploy-state",
            "title": "DEPLOY-STATE",
            "sourceType": "git",
            "repository": str(self.repository),
            "ref": CANONICAL_REF,
            "path": CANONICAL_PATH,
        }
        entry.update(overrides)
        return entry

    def generate(self) -> Path:
        return write_generated_git_source(
            self.spec(), self.generated, "deploy-state", "DEPLOY-STATE"
        )

    # -- manifest parsing --------------------------------------------------

    def test_parses_a_valid_git_entry(self) -> None:
        spec = parse_git_source(self.entry(), "documents[0]")
        self.assertEqual(spec.repository, self.repository)
        self.assertEqual(spec.ref, CANONICAL_REF)
        self.assertEqual(spec.path, CANONICAL_PATH)

    def test_rejects_a_filesystem_root_entry(self) -> None:
        entry = {"key": "deploy-state", "title": "DEPLOY-STATE", "root": "live", "path": CANONICAL_PATH}
        with self.assertRaises(GitSourceError):
            parse_git_source(entry, "documents[0]")

    def test_rejects_an_entry_declaring_a_fallback(self) -> None:
        for extra in ("fallback", "fallbackPath", "root", "localPath"):
            with self.subTest(extra=extra):
                with self.assertRaises(GitSourceError) as raised:
                    parse_git_source(self.entry(**{extra: "anything"}), "documents[0]")
                self.assertIn("no filesystem fallback", str(raised.exception))

    def test_rejects_an_absolute_path(self) -> None:
        with self.assertRaises(GitSourceError):
            parse_git_source(
                self.entry(path=str(self.repository / CANONICAL_PATH)), "documents[0]"
            )

    def test_rejects_a_path_escaping_the_repository(self) -> None:
        with self.assertRaises(GitSourceError):
            parse_git_source(self.entry(path="../DEPLOY-STATE.md"), "documents[0]")

    # -- resolution --------------------------------------------------------

    def test_reads_the_configured_ref_correctly(self) -> None:
        resolution = resolve_git_source(self.spec())
        self.assertEqual(resolution.body, CANONICAL_BODY)
        self.assertEqual(resolution.body_sha256, body_digest(CANONICAL_BODY))
        self.assertEqual(
            resolution.tip_commit, git(self.repository, "rev-parse", CANONICAL_REF).strip()
        )
        self.assertEqual(
            resolution.path_commit,
            git(
                self.repository, "log", "-1", "--format=%H", CANONICAL_REF, "--", CANONICAL_PATH
            ).strip(),
        )

    def test_resolves_the_configured_ref_not_the_checked_out_branch(self) -> None:
        git(self.repository, "checkout", "--quiet", "main")
        resolution = resolve_git_source(self.spec())
        self.assertEqual(resolution.body, CANONICAL_BODY)

    def test_tracks_a_new_commit_on_the_configured_ref(self) -> None:
        first = resolve_git_source(self.spec())
        appended = CANONICAL_BODY + "\n## A newer release\n"
        self.write_canonical(appended, "record a newer release")
        second = resolve_git_source(self.spec())
        self.assertEqual(second.body, appended)
        self.assertNotEqual(second.path_commit, first.path_commit)

    def test_unreadable_ref_fails(self) -> None:
        with self.assertRaises(GitSourceError) as raised:
            resolve_git_source(self.spec(ref="fix/does-not-exist"))
        self.assertIn("fix/does-not-exist", str(raised.exception))

    def test_missing_file_at_the_ref_fails(self) -> None:
        with self.assertRaises(GitSourceError):
            resolve_git_source(self.spec(path="NOT-DEPLOY-STATE.md"))

    def test_path_that_is_a_directory_fails(self) -> None:
        (self.repository / "notes").mkdir()
        (self.repository / "notes" / "a.md").write_text("a\n", encoding="utf-8")
        git(self.repository, "add", "notes/a.md")
        git(self.repository, "commit", "--quiet", "-m", "add a directory")
        with self.assertRaises(GitSourceError):
            resolve_git_source(self.spec(path="notes"))

    def test_missing_repository_fails(self) -> None:
        missing = GitSourceSpec(self.repository.parent / "absent", CANONICAL_REF, CANONICAL_PATH)
        with self.assertRaises(GitSourceError) as raised:
            resolve_git_source(missing)
        self.assertIn("does not exist", str(raised.exception))

    def test_a_directory_that_is_not_a_repository_fails(self) -> None:
        plain = self.repository.parent / "plain"
        plain.mkdir()
        (plain / CANONICAL_PATH).write_text(STALE_BODY, encoding="utf-8")
        with self.assertRaises(GitSourceError):
            resolve_git_source(GitSourceSpec(plain, CANONICAL_REF, CANONICAL_PATH))

    def test_normalizes_crlf_to_lf(self) -> None:
        (self.repository / CANONICAL_PATH).write_bytes(
            CANONICAL_BODY.replace("\n", "\r\n").encode("utf-8")
        )
        git(self.repository, "add", "--renormalize", CANONICAL_PATH)
        git(self.repository, "-c", "core.autocrlf=false", "add", CANONICAL_PATH)
        git(self.repository, "commit", "--quiet", "-m", "windows line endings")
        self.assertEqual(resolve_git_source(self.spec()).body, CANONICAL_BODY)

    # -- generation and provenance ----------------------------------------

    def test_generates_a_provenance_block_and_exact_body(self) -> None:
        destination = self.generate()
        provenance, body = parse_generated_document(
            destination.read_text(encoding="utf-8")
        )
        self.assertEqual(body, CANONICAL_BODY)
        self.assertEqual(provenance["source_type"], "git")
        self.assertEqual(provenance["repository"], str(self.repository))
        self.assertEqual(provenance["ref"], CANONICAL_REF)
        self.assertEqual(provenance["path"], CANONICAL_PATH)
        self.assertEqual(
            provenance["source_tip_commit"],
            git(self.repository, "rev-parse", CANONICAL_REF).strip(),
        )
        self.assertEqual(
            provenance["path_commit"],
            git(
                self.repository, "log", "-1", "--format=%H", CANONICAL_REF, "--", CANONICAL_PATH
            ).strip(),
        )
        self.assertEqual(provenance["body_sha256"], body_digest(CANONICAL_BODY))
        self.assertGreaterEqual(provenance["generated_at"], provenance["path_commit_time"])

    def test_generation_is_stable_while_the_source_is_unchanged(self) -> None:
        first = self.generate().read_bytes()
        second = self.generate().read_bytes()
        self.assertEqual(first, second)

    def test_generation_restamps_when_the_source_changes(self) -> None:
        destination = self.generate()
        before, _ = parse_generated_document(destination.read_text(encoding="utf-8"))
        self.write_canonical(CANONICAL_BODY + "\n## Later\n", "a later release")
        self.generate()
        after, body = parse_generated_document(destination.read_text(encoding="utf-8"))
        self.assertNotEqual(after["path_commit"], before["path_commit"])
        self.assertEqual(body, CANONICAL_BODY + "\n## Later\n")

    def test_generated_body_matches_git_show_byte_for_byte(self) -> None:
        destination = self.generate()
        _, body = parse_generated_document(destination.read_text(encoding="utf-8"))
        expected = subprocess.run(
            ["git", "-C", str(self.repository), "show", f"{CANONICAL_REF}:{CANONICAL_PATH}"],
            capture_output=True,
            check=True,
        ).stdout.decode("utf-8")
        self.assertEqual(body, expected)

    # -- no filesystem fallback -------------------------------------------

    def test_a_stale_working_tree_copy_is_ignored(self) -> None:
        git(self.repository, "checkout", "--quiet", "main")
        (self.repository / CANONICAL_PATH).write_text(STALE_BODY, encoding="utf-8")
        destination = self.generate()
        _, body = parse_generated_document(destination.read_text(encoding="utf-8"))
        self.assertEqual(body, CANONICAL_BODY)
        self.assertNotIn("178229f3", body)
        self.assertNotIn("stale working copy", destination.read_text(encoding="utf-8"))

    def test_no_fallback_after_git_resolution_fails(self) -> None:
        # A readable, plausible working-tree copy exists at exactly the path the
        # old manifest used. Resolution must still fail rather than read it.
        git(self.repository, "checkout", "--quiet", "main")
        (self.repository / CANONICAL_PATH).write_text(STALE_BODY, encoding="utf-8")
        with self.assertRaises(GitSourceError):
            write_generated_git_source(
                self.spec(ref="fix/does-not-exist"),
                self.generated,
                "deploy-state",
                "DEPLOY-STATE",
            )
        self.assertFalse((self.generated / "deploy-state.md").exists())

    def test_failure_does_not_overwrite_a_previous_good_artifact(self) -> None:
        destination = self.generate()
        good = destination.read_bytes()
        with self.assertRaises(GitSourceError):
            write_generated_git_source(
                self.spec(path="NOT-DEPLOY-STATE.md"),
                self.generated,
                "deploy-state",
                "DEPLOY-STATE",
            )
        self.assertEqual(destination.read_bytes(), good)

    # -- verification ------------------------------------------------------

    def test_verification_accepts_a_freshly_generated_artifact(self) -> None:
        destination = self.generate()
        provenance = verify_generated_document(destination, self.spec())
        self.assertEqual(provenance["ref"], CANONICAL_REF)

    def test_verification_rejects_a_stale_artifact(self) -> None:
        destination = self.generate()
        stale = destination.read_text(encoding="utf-8")
        self.write_canonical(CANONICAL_BODY + "\n## Shipped later\n", "ship later")
        with self.assertRaises(GitSourceError) as raised:
            verify_generated_document(destination, self.spec())
        self.assertIn("commit is", str(raised.exception))
        # The artifact on disk is still the pre-release one: verification, not
        # regeneration, is what rejected it.
        self.assertEqual(destination.read_text(encoding="utf-8"), stale)

    def test_verification_rejects_a_stale_file_touch_commit(self) -> None:
        # A commit that does not touch the file moves the tip but not the
        # file-touch commit, so stamp each independently and prove the
        # file-touch check is not shadowed by the tip check.
        destination = self.generate()
        good, _ = parse_generated_document(destination.read_text(encoding="utf-8"))
        (self.repository / "UNRELATED.md").write_text("unrelated\n", encoding="utf-8")
        git(self.repository, "add", "UNRELATED.md")
        git(self.repository, "commit", "--quiet", "-m", "an unrelated commit")
        self.generate()
        refreshed, _ = parse_generated_document(destination.read_text(encoding="utf-8"))
        self.assertNotEqual(refreshed["source_tip_commit"], good["source_tip_commit"])
        self.assertEqual(refreshed["path_commit"], good["path_commit"])

        forged = destination.read_text(encoding="utf-8").replace(
            f"`path_commit`: `{refreshed['path_commit']}`",
            f"`path_commit`: `{'0' * 40}`",
        )
        destination.write_text(forged, encoding="utf-8", newline="\n")
        with self.assertRaises(GitSourceError) as raised:
            verify_generated_document(destination, self.spec())
        self.assertIn("path_commit", str(raised.exception))

    def test_verification_rejects_a_tampered_body(self) -> None:
        destination = self.generate()
        destination.write_text(
            destination.read_text(encoding="utf-8").replace("6ef56761", "178229f3"),
            encoding="utf-8",
            newline="\n",
        )
        with self.assertRaises(GitSourceError):
            verify_generated_document(destination, self.spec())

    def test_verification_rejects_a_missing_provenance_block(self) -> None:
        destination = self.generated / "deploy-state.md"
        destination.write_text(CANONICAL_BODY, encoding="utf-8", newline="\n")
        with self.assertRaises(GitSourceError) as raised:
            verify_generated_document(destination, self.spec())
        self.assertIn("provenance block", str(raised.exception))

    def test_verification_rejects_a_missing_artifact(self) -> None:
        with self.assertRaises(GitSourceError):
            verify_generated_document(self.generated / "absent.md", self.spec())

    def test_generation_refuses_a_time_predating_the_source_commit(self) -> None:
        with self.assertRaises(GitSourceError) as raised:
            write_generated_git_source(
                self.spec(),
                self.generated,
                "deploy-state",
                "DEPLOY-STATE",
                now=lambda: "1999-01-01T00:00:00+00:00",
            )
        self.assertIn("predates", str(raised.exception))

    def test_parse_rejects_an_incomplete_provenance_block(self) -> None:
        destination = self.generate()
        text = destination.read_text(encoding="utf-8")
        without_hash = "\n".join(
            line for line in text.split("\n") if "`body_sha256`" not in line
        )
        with self.assertRaises(GitSourceError) as raised:
            parse_generated_document(without_hash)
        self.assertIn("body_sha256", str(raised.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
