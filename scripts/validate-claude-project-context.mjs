#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const manifestPath = path.join(
  repositoryRoot,
  "docs",
  "redesign",
  "CLAUDE-PROJECT-SOURCES.json",
);
const statePath = path.join(repositoryRoot, "docs", "REDESIGN_STATE.md");
const contextContractPath = path.join(
  repositoryRoot,
  "docs",
  "redesign",
  "CLAUDE-PROJECT-CONTEXT.md",
);
const requireMaintenance = process.argv.slice(2).includes("--require-maintenance");
const errors = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Could not read valid JSON from ${path.relative(repositoryRoot, filePath)}: ${error.message}`);
    return null;
  }
}

function normalizeRelative(value) {
  return value.replaceAll("\\", "/");
}

function resolveWithin(base, relativePath, label) {
  check(typeof relativePath === "string" && relativePath.length > 0, `${label} must have a non-empty path.`);
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return null;
  }
  check(!path.isAbsolute(relativePath), `${label} path must be relative: ${relativePath}`);
  const resolved = path.resolve(base, relativePath);
  const relation = path.relative(base, resolved);
  check(
    relation !== ".." && !relation.startsWith(`..${path.sep}`) && !path.isAbsolute(relation),
    `${label} escapes its declared root: ${relativePath}`,
  );
  return resolved;
}

function firstContiguousHandoffGroup(stateText) {
  const lines = stateText.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === "## Latest handoff");
  check(headingIndex >= 0, "REDESIGN_STATE.md must contain exactly one ## Latest handoff section.");
  check(
    lines.filter((line) => line.trim() === "## Latest handoff").length === 1,
    "REDESIGN_STATE.md contains more than one ## Latest handoff section.",
  );
  if (headingIndex < 0) {
    return [];
  }

  const handoffs = [];
  let started = false;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === "") {
      if (started) {
        break;
      }
      continue;
    }
    if (/^##\s/.test(trimmed)) {
      break;
    }
    if (/^-\s+/.test(trimmed)) {
      started = true;
      const match = trimmed.match(/^-\s+`?([^`\s]+\.md)`?(?:\s|$)/);
      check(Boolean(match), `Unparseable active-handoff item: ${trimmed}`);
      if (match) {
        handoffs.push(normalizeRelative(match[1]));
      }
      continue;
    }
    if (started && /^\s/.test(line)) {
      continue;
    }
    if (started) {
      break;
    }
    errors.push(`Unexpected content before the active-handoff list: ${trimmed}`);
    break;
  }
  check(handoffs.length > 0, "The active-handoff group must not be empty.");
  check(new Set(handoffs.map((item) => item.toLowerCase())).size === handoffs.length, "The active-handoff group contains duplicates.");
  return handoffs;
}

function gitLines(args) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split(/\r?\n/)
      .map((line) => normalizeRelative(line.trim()))
      .filter(Boolean);
  } catch (error) {
    errors.push(`Git inspection failed: ${error.message}`);
    return [];
  }
}

// Mirrors scripts/planning-pack/git_source.py. Both sides must agree exactly or
// a generated artifact cannot be verified against the ref it claims.
const GIT_SOURCE_TYPE = "git";
const PROVENANCE_MARKER =
  "> **Generated source provenance - updater metadata, not a production ledger entry.**";
const BODY_SEPARATOR = "---";
const PROVENANCE_FIELDS = [
  "source_type",
  "repository",
  "ref",
  "source_tip_commit",
  "path",
  "path_commit",
  "path_commit_time",
  "body_sha256",
  "generated_at",
];
const ALLOWED_GIT_ENTRY_KEYS = new Set([
  "key",
  "title",
  "sourceType",
  "repository",
  "ref",
  "path",
]);
const GIT_SOURCED_KEYS = new Set(["deploy-state"]);
const generatedDirectory =
  process.env.TM_PLANNING_PACK_GENERATED_DIR ??
  path.join(
    process.env.LOCALAPPDATA ?? path.join(process.env.USERPROFILE ?? "", "AppData", "Local"),
    "TMPlanningPackUpdater",
    "generated",
  );

function normalizeNewlines(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

// Local Git inspection only. This validator never contacts Wrangler,
// Cloudflare, Supabase, a database, or any production endpoint.
function gitCapture(cwd, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return { ok: false, message: (error.stderr || error.message || "").toString().trim() };
  }
}

function parseGeneratedDocument(text) {
  const lines = normalizeNewlines(text).split("\n");
  const markerCount = lines.filter((line) => line === PROVENANCE_MARKER).length;
  if (markerCount === 0) return { error: "the generated provenance block is absent" };
  if (markerCount > 1) return { error: "the generated document has more than one provenance block" };
  const separatorIndex = lines.indexOf(BODY_SEPARATOR);
  if (separatorIndex < 0) return { error: "the generated document has no body separator" };
  if (separatorIndex < lines.indexOf(PROVENANCE_MARKER)) {
    return { error: "the generated body separator precedes the provenance block" };
  }

  const provenance = {};
  for (const line of lines.slice(0, separatorIndex)) {
    const match = line.trim().match(/^> - `([a-z0-9_]+)`: `(.*)`$/);
    if (!match) continue;
    if (Object.hasOwn(provenance, match[1])) {
      return { error: `duplicate provenance field: ${match[1]}` };
    }
    provenance[match[1]] = match[2];
  }
  const missing = PROVENANCE_FIELDS.filter((field) => !Object.hasOwn(provenance, field));
  if (missing.length > 0) {
    return { error: `the provenance block is missing fields: ${missing.join(", ")}` };
  }
  let body = lines.slice(separatorIndex + 1).join("\n");
  if (body.startsWith("\n")) body = body.slice(1);
  return { provenance, body };
}

function checkGitSource(document, label) {
  const entry = `${label} (${document.key})`;
  const unexpected = Object.keys(document).filter((name) => !ALLOWED_GIT_ENTRY_KEYS.has(name));
  check(
    unexpected.length === 0,
    `${entry} declares unsupported Git-source keys: ${unexpected.join(", ")}. A Git source must have no filesystem fallback.`,
  );
  for (const field of ["repository", "ref", "path"]) {
    check(
      typeof document[field] === "string" && document[field].trim().length > 0,
      `${entry} has a missing or empty ${field}.`,
    );
  }
  if (
    typeof document.repository !== "string" ||
    typeof document.ref !== "string" ||
    typeof document.path !== "string"
  ) {
    return false;
  }
  const inTreePath = normalizeRelative(document.path).trim();
  check(
    !path.isAbsolute(inTreePath) && !inTreePath.includes(":"),
    `${entry} path must be repository-relative, not a filesystem path: ${document.path}`,
  );
  check(
    !inTreePath.startsWith("../") && !inTreePath.includes("/../") && inTreePath !== "..",
    `${entry} path must not escape the repository: ${document.path}`,
  );

  const repository = document.repository;
  if (!fs.existsSync(repository) || !fs.statSync(repository).isDirectory()) {
    errors.push(`${entry} configured repository is unreadable: ${repository}`);
    return false;
  }
  const tip = gitCapture(repository, ["rev-parse", "--verify", "--quiet", `${document.ref}^{commit}`]);
  if (!tip.ok || tip.stdout.trim().length === 0) {
    errors.push(`${entry} configured ref is unreadable: ${document.ref}. ${tip.message ?? ""}`.trim());
    return false;
  }
  const tipCommit = tip.stdout.trim();
  const history = gitCapture(repository, [
    "log",
    "-1",
    "--format=%H%x00%cI",
    document.ref,
    "--",
    inTreePath,
  ]);
  if (!history.ok || !history.stdout.includes("\0")) {
    errors.push(`${entry} configured path has no history on ${document.ref}: ${inTreePath}`);
    return false;
  }
  const [pathCommit, pathCommitTime] = history.stdout.trim().split("\0");
  const shown = gitCapture(repository, ["show", `${document.ref}:${inTreePath}`]);
  if (!shown.ok) {
    errors.push(`${entry} configured path is unreadable at ${document.ref}: ${inTreePath}`);
    return false;
  }
  const canonicalBody = normalizeNewlines(shown.stdout);

  const artifactPath = path.join(generatedDirectory, `${document.key}.md`);
  if (!fs.existsSync(artifactPath)) {
    // In maintenance mode this is the pre-publication gate, so a never-generated
    // artifact is a failure. Outside it (build/test preflights) the updater may
    // simply not be installed on this machine.
    check(
      !requireMaintenance,
      `${entry} has no generated artifact at ${artifactPath}. Run the planning-pack updater before the completion commit.`,
    );
    return true;
  }

  const parsed = parseGeneratedDocument(fs.readFileSync(artifactPath, "utf8"));
  if (parsed.error) {
    errors.push(`${entry} generated artifact is invalid: ${parsed.error}`);
    return false;
  }
  const { provenance, body } = parsed;
  const expected = {
    source_type: GIT_SOURCE_TYPE,
    repository,
    ref: document.ref,
    source_tip_commit: tipCommit,
    path: inTreePath,
    path_commit: pathCommit,
    path_commit_time: pathCommitTime,
    body_sha256: sha256(canonicalBody),
  };
  for (const [field, value] of Object.entries(expected)) {
    check(
      provenance[field] === value,
      `${entry} generated ${field} is "${provenance[field]}" but Git resolves "${value}".`,
    );
  }
  check(
    body === canonicalBody,
    `${entry} generated body differs from git show ${document.ref}:${inTreePath}. The published document is stale.`,
  );
  check(
    sha256(body) === provenance.body_sha256,
    `${entry} stamped body hash does not match the generated body.`,
  );
  const generatedAt = Date.parse(provenance.generated_at);
  const touchedAt = Date.parse(pathCommitTime);
  check(
    Number.isFinite(generatedAt),
    `${entry} generated_at is not a parseable ISO-8601 timestamp: ${provenance.generated_at}`,
  );
  check(
    !Number.isFinite(generatedAt) || !Number.isFinite(touchedAt) || generatedAt >= touchedAt,
    `${entry} generated_at ${provenance.generated_at} predates the source commit time ${pathCommitTime}.`,
  );
  return true;
}

const manifest = readJson(manifestPath);
const stateText = fs.readFileSync(statePath, "utf8");
check(
  fs.existsSync(contextContractPath) && fs.statSync(contextContractPath).isFile(),
  "The canonical Claude Project context contract is missing.",
);
// `redesign` is the only working-tree root. There is deliberately no root that
// reads another checkout's working tree: such a copy goes stale the moment that
// lineage is committed to from elsewhere, which is exactly how a stale
// DEPLOY-STATE reached the planning pack. Cross-lineage documents use a Git
// source instead.
const roots = { redesign: repositoryRoot };
const keys = new Set();
const titles = new Set();
const catalogPaths = new Set();
let fixedDocumentCount = 0;
let phaseDocumentCount = 0;
let dynamicDocumentCount = 0;
let gitSourcesChecked = 0;

if (manifest) {
  check(manifest.version === 1, "CLAUDE-PROJECT-SOURCES.json must use version 1.");
  check(Array.isArray(manifest.documents), "The source manifest must contain a documents array.");
  const documents = Array.isArray(manifest.documents) ? manifest.documents : [];
  fixedDocumentCount = documents.length;
  for (const [index, document] of documents.entries()) {
    const label = `documents[${index}]`;
    check(document && typeof document === "object", `${label} must be an object.`);
    if (!document || typeof document !== "object") continue;
    check(/^[a-z0-9][a-z0-9-]*$/.test(document.key ?? ""), `${label} has an invalid key.`);
    check(typeof document.title === "string" && document.title.trim().length > 0, `${label} must have a title.`);
    if (typeof document.key === "string") {
      check(!keys.has(document.key.toLowerCase()), `Duplicate document key: ${document.key}`);
      keys.add(document.key.toLowerCase());
    }
    if (typeof document.title === "string") {
      check(!titles.has(document.title.toLowerCase()), `Duplicate document title: ${document.title}`);
      titles.add(document.title.toLowerCase());
    }

    const isGitSource = document.sourceType === GIT_SOURCE_TYPE;
    check(
      !GIT_SOURCED_KEYS.has(document.key) || isGitSource,
      `${label} (${document.key}) must be a Git source. It is owned by another repository lineage, so a working-tree path would publish a stale copy.`,
    );
    if (isGitSource) {
      if (checkGitSource(document, label)) gitSourcesChecked += 1;
      const normalizedGitPath = `git:${document.ref}:${normalizeRelative(document.path ?? "")}`.toLowerCase();
      check(!catalogPaths.has(normalizedGitPath), `Duplicate catalog path: ${normalizedGitPath}`);
      catalogPaths.add(normalizedGitPath);
      continue;
    }

    check(
      document.sourceType === undefined || document.sourceType === "file",
      `${label} has an unknown sourceType: ${document.sourceType}`,
    );
    check(
      Object.hasOwn(roots, document.root),
      `${label} has an unknown root: ${document.root}. Only "redesign" is a working-tree root; cross-lineage documents must declare sourceType "git".`,
    );
    if (!Object.hasOwn(roots, document.root)) continue;
    const resolved = resolveWithin(roots[document.root], document.path, label);
    if (!resolved) continue;
    const normalizedPath = `${document.root}:${normalizeRelative(document.path)}`.toLowerCase();
    check(!catalogPaths.has(normalizedPath), `Duplicate catalog path: ${document.root}:${document.path}`);
    catalogPaths.add(normalizedPath);
    check(fs.existsSync(resolved) && fs.statSync(resolved).isFile(), `${label} source file is missing: ${document.path}`);
  }

  for (const key of GIT_SOURCED_KEYS) {
    check(
      documents.some((document) => document?.key === key),
      `Required Git-sourced document is absent from the catalog: ${key}`,
    );
  }

  const phases = manifest.phaseDocuments;
  check(phases && typeof phases === "object", "The source manifest must contain phaseDocuments.");
  if (phases && typeof phases === "object" && Object.hasOwn(roots, phases.root)) {
    const phaseDirectory = resolveWithin(roots[phases.root], phases.directory, "phaseDocuments");
    check(Number.isInteger(phases.first), "phaseDocuments.first must be an integer.");
    check(Number.isInteger(phases.last), "phaseDocuments.last must be an integer.");
    check(phases.first <= phases.last, "phaseDocuments.first must not exceed phaseDocuments.last.");
    if (phaseDirectory && Number.isInteger(phases.first) && Number.isInteger(phases.last)) {
      for (let number = phases.first; number <= phases.last; number += 1) {
        const prefix = `${String(number).padStart(2, "0")}-`;
        const matches = fs
          .readdirSync(phaseDirectory)
          .filter((name) => name.startsWith(prefix) && name.endsWith(".md"));
        check(matches.length === 1, `Expected exactly one phase ${prefix.slice(0, 2)} file; found ${matches.length}.`);
        if (matches.length === 1) phaseDocumentCount += 1;
      }
    }
  }

  const dynamicDocuments = manifest.dynamicDocuments;
  check(Array.isArray(dynamicDocuments), "The source manifest must contain dynamicDocuments.");
  dynamicDocumentCount = Array.isArray(dynamicDocuments) ? dynamicDocuments.length : 0;
  for (const [index, document] of (dynamicDocuments ?? []).entries()) {
    const label = `dynamicDocuments[${index}]`;
    check(/^[a-z0-9][a-z0-9-]*$/.test(document.key ?? ""), `${label} has an invalid key.`);
    check(typeof document.title === "string" && document.title.trim().length > 0, `${label} must have a title.`);
    if (typeof document.key === "string") {
      check(!keys.has(document.key.toLowerCase()), `Duplicate document key: ${document.key}`);
      keys.add(document.key.toLowerCase());
    }
    if (typeof document.title === "string") {
      check(!titles.has(document.title.toLowerCase()), `Duplicate document title: ${document.title}`);
      titles.add(document.title.toLowerCase());
    }
  }
  check(
    new Set((dynamicDocuments ?? []).map((item) => item.key)).has("latest-handoff") &&
      new Set((dynamicDocuments ?? []).map((item) => item.key)).has("tm-project-master-context"),
    "dynamicDocuments must declare latest-handoff and tm-project-master-context.",
  );

  const requiredCatalogPaths = [
    "redesign:AGENTS.md",
    "redesign:CLAUDE.md",
    "redesign:docs/CURRENT_STATUS.md",
    "redesign:docs/AUTHORITATIVE_DOCUMENTS.md",
    "redesign:docs/REDESIGN_STATE.md",
    "redesign:docs/agent-prompts/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md",
    "redesign:docs/redesign/MASTER-RULES.md",
    "redesign:docs/redesign/MASTER-PLAN.md",
    "redesign:docs/redesign/DECISIONS.md",
  ];
  for (const requiredPath of requiredCatalogPaths) {
    check(catalogPaths.has(requiredPath.toLowerCase()), `Required source is absent from the catalog: ${requiredPath}`);
  }
}

const currentSection = stateText.match(/^## Current substep\s*$([\s\S]*?)(?=^##\s|\Z)/m);
check(Boolean(currentSection), "REDESIGN_STATE.md has no Current substep section.");
const phaseMatch = currentSection?.[1]?.match(/Phase\s+(\d+)/i);
check(Boolean(phaseMatch), "Could not determine the current phase from REDESIGN_STATE.md.");
const currentPhase = phaseMatch ? Number(phaseMatch[1]) : null;
if (manifest?.phaseDocuments && currentPhase !== null) {
  check(
    currentPhase >= manifest.phaseDocuments.first && currentPhase <= manifest.phaseDocuments.last,
    `Current phase ${currentPhase} is outside the manifest phase range.`,
  );
}

const activeHandoffs = firstContiguousHandoffGroup(stateText);
for (const handoff of activeHandoffs) {
  const resolved = resolveWithin(repositoryRoot, handoff, `Active handoff ${handoff}`);
  check(handoff.startsWith("docs/agent-handoffs/"), `Active handoff is outside docs/agent-handoffs: ${handoff}`);
  if (resolved) check(fs.existsSync(resolved) && fs.statSync(resolved).isFile(), `Active handoff is missing: ${handoff}`);
}

let changedHandoffs = [];
if (requireMaintenance) {
  const changed = new Set([
    ...gitLines(["diff", "--name-only", "HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);
  check(changed.has("docs/REDESIGN_STATE.md"), "Maintenance mode requires docs/REDESIGN_STATE.md to be updated.");
  changedHandoffs = [...changed].filter(
    (item) => item.startsWith("docs/agent-handoffs/") && item.endsWith(".md"),
  );
  check(changedHandoffs.length > 0, "Maintenance mode requires a handoff file to be created or updated.");
  const referencedHandoffs = new Set(
    [...stateText.matchAll(/docs\/agent-handoffs\/[A-Za-z0-9._-]+\.md/g)].map((match) => match[0]),
  );
  for (const handoff of changedHandoffs) {
    check(referencedHandoffs.has(handoff), `Changed handoff is not referenced by REDESIGN_STATE.md: ${handoff}`);
  }
}

if (errors.length > 0) {
  console.error("Claude Project context validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      success: true,
      manifestDocuments: fixedDocumentCount,
      phaseDocuments: phaseDocumentCount,
      dynamicDocuments: dynamicDocumentCount,
      totalPlanningPackDocuments: fixedDocumentCount + phaseDocumentCount + dynamicDocumentCount,
      currentPhase,
      activeHandoffs: activeHandoffs.length,
      gitSourcesChecked,
      maintenanceMode: requireMaintenance,
      changedHandoffs: changedHandoffs.length,
    },
    null,
    2,
  ),
);
