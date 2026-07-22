#!/usr/bin/env node
// Executable tests for the DEPLOY-STATE Git-source checks in
// scripts/validate-claude-project-context.mjs.
//
// Each case builds an isolated fixture: a throwaway copy of docs/ plus the
// validator, and a throwaway Git repository standing in for the production
// lineage. Nothing here reads the real production ledger, and the validator is
// exercised as a subprocess exactly as the npm script invokes it.
//
// The generated artifact is produced by scripts/planning-pack/git_source.py, so
// these cases also prove the Python generator and the JavaScript validator agree
// on the provenance format.
//
// Run: node scripts/planning-pack/test-validate-claude-project-context.mjs

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..", "..");
const validatorSource = path.join(repositoryRoot, "scripts", "validate-claude-project-context.mjs");
const generatorSource = path.join(scriptDirectory, "git_source.py");

const CANONICAL_REF = "fix/canonical-production-lineage";
const CANONICAL_PATH = "DEPLOY-STATE.md";
const CANONICAL_BODY = "# Deploy state\n\nWorker version: `aaaaaaaa-0000-0000-0000-000000000000`\n";
const STALE_BODY = "# Deploy state\n\nWorker version: `bbbbbbbb-1111-1111-1111-111111111111` (stale)\n";

let passed = 0;
const failures = [];

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

function makeFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "tm-validator-test-"));
  const redesign = path.join(base, "redesign");
  const lineage = path.join(base, "lineage");
  const generated = path.join(base, "generated");
  fs.mkdirSync(redesign);
  fs.mkdirSync(lineage);
  fs.mkdirSync(generated);

  // The production lineage stand-in: the canonical file is committed on a ref
  // that is not checked out, and a contradictory copy sits in the working tree.
  git(lineage, "init", "--quiet", "--initial-branch=main");
  git(lineage, "config", "user.email", "test@example.invalid");
  git(lineage, "config", "user.name", "Validator Test");
  git(lineage, "config", "core.autocrlf", "false");
  fs.writeFileSync(path.join(lineage, "README.md"), "seed\n");
  git(lineage, "add", "README.md");
  git(lineage, "commit", "--quiet", "-m", "seed");
  git(lineage, "checkout", "--quiet", "-b", CANONICAL_REF);
  fs.writeFileSync(path.join(lineage, CANONICAL_PATH), CANONICAL_BODY);
  git(lineage, "add", CANONICAL_PATH);
  git(lineage, "commit", "--quiet", "-m", "record a production release");
  git(lineage, "checkout", "--quiet", "main");
  fs.writeFileSync(path.join(lineage, CANONICAL_PATH), STALE_BODY);

  // The redesign repository stand-in.
  fs.cpSync(path.join(repositoryRoot, "docs"), path.join(redesign, "docs"), { recursive: true });
  for (const rootFile of ["AGENTS.md", "CLAUDE.md"]) {
    fs.copyFileSync(path.join(repositoryRoot, rootFile), path.join(redesign, rootFile));
  }
  fs.mkdirSync(path.join(redesign, "scripts"));
  fs.copyFileSync(validatorSource, path.join(redesign, "scripts", "validate-claude-project-context.mjs"));
  git(redesign, "init", "--quiet", "--initial-branch=main");
  git(redesign, "config", "user.email", "test@example.invalid");
  git(redesign, "config", "user.name", "Validator Test");
  git(redesign, "config", "core.autocrlf", "false");
  git(redesign, "add", "-A");
  git(redesign, "commit", "--quiet", "-m", "fixture baseline");

  const fixture = { base, redesign, lineage, generated };
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    sourceType: "git",
    repository: lineage,
    ref: CANONICAL_REF,
    path: CANONICAL_PATH,
  });
  return fixture;
}

function manifestPath(fixture) {
  return path.join(fixture.redesign, "docs", "redesign", "CLAUDE-PROJECT-SOURCES.json");
}

function setManifestEntry(fixture, entry) {
  const file = manifestPath(fixture);
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.documents = manifest.documents.map((document) =>
    document.key === "deploy-state" ? entry : document,
  );
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

function generateArtifact(fixture) {
  const entry = JSON.parse(fs.readFileSync(manifestPath(fixture), "utf8")).documents.find(
    (document) => document.key === "deploy-state",
  );
  const result = spawnSync(
    "python",
    [
      "-c",
      [
        "import json,sys",
        `sys.path.insert(0, ${JSON.stringify(scriptDirectory)})`,
        "from pathlib import Path",
        "from git_source import parse_git_source, write_generated_git_source",
        "entry = json.loads(sys.argv[1])",
        "spec = parse_git_source(entry, 'documents[deploy-state]')",
        `write_generated_git_source(spec, Path(${JSON.stringify(fixture.generated)}), 'deploy-state', 'DEPLOY-STATE')`,
      ].join("\n"),
      JSON.stringify(entry),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Artifact generation failed: ${result.stderr || result.stdout}`);
  }
  return path.join(fixture.generated, "deploy-state.md");
}

function markMaintenanceDirty(fixture) {
  const state = path.join(fixture.redesign, "docs", "REDESIGN_STATE.md");
  fs.appendFileSync(state, "\n<!-- fixture maintenance edit -->\n");
  const referenced = fs
    .readFileSync(state, "utf8")
    .match(/docs\/agent-handoffs\/[A-Za-z0-9._-]+\.md/g)[0];
  fs.appendFileSync(path.join(fixture.redesign, referenced), "\n<!-- fixture maintenance edit -->\n");
}

function runValidator(fixture, { maintenance = false, generatedDir = fixture.generated } = {}) {
  const args = [path.join(fixture.redesign, "scripts", "validate-claude-project-context.mjs")];
  if (maintenance) args.push("--require-maintenance");
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, TM_PLANNING_PACK_GENERATED_DIR: generatedDir },
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function editArtifact(artifact, from, to) {
  const text = fs.readFileSync(artifact, "utf8");
  if (!text.includes(from)) throw new Error(`Fixture edit target not present: ${from}`);
  fs.writeFileSync(artifact, text.replace(from, to));
}

function test(name, body) {
  const fixture = makeFixture();
  try {
    body(fixture);
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`FAIL - ${name}\n    ${error.message.split("\n").join("\n    ")}`);
  } finally {
    fs.rmSync(fixture.base, { recursive: true, force: true });
  }
}

function assertPasses(fixture, options) {
  const { status, output } = runValidator(fixture, options);
  if (status !== 0) throw new Error(`Expected success, got exit ${status}:\n${output}`);
  return output;
}

function assertFails(fixture, expected, options) {
  const { status, output } = runValidator(fixture, options);
  if (status === 0) throw new Error(`Expected failure, got success:\n${output}`);
  if (!output.includes(expected)) {
    throw new Error(`Expected message containing "${expected}", got:\n${output}`);
  }
  return output;
}

// --- accepted ---------------------------------------------------------------

test("accepts a freshly generated artifact matching the configured ref", (fixture) => {
  generateArtifact(fixture);
  const output = assertPasses(fixture);
  if (!output.includes('"gitSourcesChecked": 1')) {
    throw new Error(`Expected one checked Git source:\n${output}`);
  }
});

test("accepts the manifest without an artifact outside maintenance mode", (fixture) => {
  assertPasses(fixture);
});

// --- manifest shape ---------------------------------------------------------

test("rejects a manifest that still points at a working-tree path", (fixture) => {
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    root: "live",
    path: CANONICAL_PATH,
  });
  assertFails(fixture, "must be a Git source");
});

test("rejects a Git entry that also declares a filesystem fallback", (fixture) => {
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    sourceType: "git",
    repository: fixture.lineage,
    ref: CANONICAL_REF,
    path: CANONICAL_PATH,
    fallbackPath: path.join(fixture.lineage, CANONICAL_PATH),
  });
  assertFails(fixture, "no filesystem fallback");
});

test("rejects an unreadable configured ref", (fixture) => {
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    sourceType: "git",
    repository: fixture.lineage,
    ref: "fix/does-not-exist",
    path: CANONICAL_PATH,
  });
  assertFails(fixture, "configured ref is unreadable");
});

test("rejects an unreadable configured repository", (fixture) => {
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    sourceType: "git",
    repository: path.join(fixture.base, "absent"),
    ref: CANONICAL_REF,
    path: CANONICAL_PATH,
  });
  assertFails(fixture, "configured repository is unreadable");
});

test("rejects a configured path absent at the ref", (fixture) => {
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    sourceType: "git",
    repository: fixture.lineage,
    ref: CANONICAL_REF,
    path: "NOT-DEPLOY-STATE.md",
  });
  assertFails(fixture, "no history on");
});

test("rejects an absolute filesystem path on a Git entry", (fixture) => {
  setManifestEntry(fixture, {
    key: "deploy-state",
    title: "DEPLOY-STATE",
    sourceType: "git",
    repository: fixture.lineage,
    ref: CANONICAL_REF,
    path: path.join(fixture.lineage, CANONICAL_PATH),
  });
  assertFails(fixture, "must be repository-relative");
});

// --- generated artifact -----------------------------------------------------

test("rejects a missing artifact in maintenance mode", (fixture) => {
  markMaintenanceDirty(fixture);
  assertFails(fixture, "has no generated artifact", { maintenance: true });
});

test("accepts a generated artifact in maintenance mode", (fixture) => {
  generateArtifact(fixture);
  markMaintenanceDirty(fixture);
  assertPasses(fixture, { maintenance: true });
});

test("rejects an artifact with no provenance block", (fixture) => {
  const artifact = generateArtifact(fixture);
  fs.writeFileSync(artifact, CANONICAL_BODY);
  assertFails(fixture, "provenance block is absent");
});

test("rejects an artifact missing a provenance field", (fixture) => {
  const artifact = generateArtifact(fixture);
  const kept = fs
    .readFileSync(artifact, "utf8")
    .split("\n")
    .filter((line) => !line.includes("`body_sha256`"))
    .join("\n");
  fs.writeFileSync(artifact, kept);
  assertFails(fixture, "missing fields: body_sha256");
});

test("rejects a stamped ref that differs from the manifest", (fixture) => {
  const artifact = generateArtifact(fixture);
  editArtifact(artifact, `\`ref\`: \`${CANONICAL_REF}\``, "`ref`: `fix/some-other-lineage`");
  assertFails(fixture, "generated ref is");
});

test("rejects a stamped source-tip commit that differs from git rev-parse", (fixture) => {
  const artifact = generateArtifact(fixture);
  const tip = git(fixture.lineage, "rev-parse", CANONICAL_REF).trim();
  editArtifact(artifact, `\`source_tip_commit\`: \`${tip}\``, `\`source_tip_commit\`: \`${"0".repeat(40)}\``);
  assertFails(fixture, "generated source_tip_commit is");
});

test("rejects a stamped file-touch commit that differs from git log", (fixture) => {
  const artifact = generateArtifact(fixture);
  const touch = git(fixture.lineage, "log", "-1", "--format=%H", CANONICAL_REF, "--", CANONICAL_PATH).trim();
  editArtifact(artifact, `\`path_commit\`: \`${touch}\``, `\`path_commit\`: \`${"1".repeat(40)}\``);
  assertFails(fixture, "generated path_commit is");
});

test("rejects a generation time predating the file-touch commit", (fixture) => {
  const artifact = generateArtifact(fixture);
  const stamped = fs.readFileSync(artifact, "utf8").match(/`generated_at`: `([^`]+)`/)[1];
  editArtifact(artifact, `\`generated_at\`: \`${stamped}\``, "`generated_at`: `1999-01-01T00:00:00+00:00`");
  assertFails(fixture, "predates the source commit time");
});

test("rejects a stamped body hash that does not match the Git body", (fixture) => {
  const artifact = generateArtifact(fixture);
  const stamped = fs.readFileSync(artifact, "utf8").match(/`body_sha256`: `([a-f0-9]{64})`/)[1];
  editArtifact(artifact, `\`body_sha256\`: \`${stamped}\``, `\`body_sha256\`: \`${"a".repeat(64)}\``);
  assertFails(fixture, "generated body_sha256 is");
});

test("rejects a published body that differs from git show", (fixture) => {
  const artifact = generateArtifact(fixture);
  editArtifact(artifact, "aaaaaaaa-0000-0000-0000-000000000000", "cccccccc-2222-2222-2222-222222222222");
  assertFails(fixture, "generated body differs from git show");
});

test("rejects an artifact left stale after the source advanced", (fixture) => {
  generateArtifact(fixture);
  fs.writeFileSync(path.join(fixture.lineage, CANONICAL_PATH), `${CANONICAL_BODY}\n## A newer release\n`);
  git(fixture.lineage, "add", CANONICAL_PATH);
  git(fixture.lineage, "commit", "--quiet", "-m", "a newer release");
  git(fixture.lineage, "branch", "--quiet", "-f", CANONICAL_REF, "HEAD");
  assertFails(fixture, "generated source_tip_commit is");
});

// --- no filesystem fallback -------------------------------------------------

test("ignores the stale working-tree copy in the configured repository", (fixture) => {
  const artifact = generateArtifact(fixture);
  const text = fs.readFileSync(artifact, "utf8");
  if (text.includes("bbbbbbbb-1111-1111-1111-111111111111")) {
    throw new Error("The generated artifact contains the stale working-tree copy.");
  }
  if (!text.includes("aaaaaaaa-0000-0000-0000-000000000000")) {
    throw new Error("The generated artifact does not contain the canonical Git body.");
  }
  assertPasses(fixture);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const name of failures) console.log(`  failed: ${name}`);
  process.exit(1);
}
