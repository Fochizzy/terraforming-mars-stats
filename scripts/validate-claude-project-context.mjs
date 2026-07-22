#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const liveRoot = path.resolve(repositoryRoot, "..", "Terraforming Mars");
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

const manifest = readJson(manifestPath);
const stateText = fs.readFileSync(statePath, "utf8");
check(
  fs.existsSync(contextContractPath) && fs.statSync(contextContractPath).isFile(),
  "The canonical Claude Project context contract is missing.",
);
const roots = { redesign: repositoryRoot, live: liveRoot };
const keys = new Set();
const titles = new Set();
const catalogPaths = new Set();
let fixedDocumentCount = 0;
let phaseDocumentCount = 0;
let dynamicDocumentCount = 0;
let externalSourcesChecked = 0;

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
    check(Object.hasOwn(roots, document.root), `${label} has an unknown root: ${document.root}`);
    if (typeof document.key === "string") {
      check(!keys.has(document.key.toLowerCase()), `Duplicate document key: ${document.key}`);
      keys.add(document.key.toLowerCase());
    }
    if (typeof document.title === "string") {
      check(!titles.has(document.title.toLowerCase()), `Duplicate document title: ${document.title}`);
      titles.add(document.title.toLowerCase());
    }
    if (!Object.hasOwn(roots, document.root)) continue;
    const resolved = resolveWithin(roots[document.root], document.path, label);
    if (!resolved) continue;
    const normalizedPath = `${document.root}:${normalizeRelative(document.path)}`.toLowerCase();
    check(!catalogPaths.has(normalizedPath), `Duplicate catalog path: ${document.root}:${document.path}`);
    catalogPaths.add(normalizedPath);
    if (document.root === "redesign" || fs.existsSync(roots[document.root])) {
      check(fs.existsSync(resolved) && fs.statSync(resolved).isFile(), `${label} source file is missing: ${document.path}`);
      if (document.root !== "redesign") externalSourcesChecked += 1;
    }
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
      externalSourcesChecked,
      maintenanceMode: requireMaintenance,
      changedHandoffs: changedHandoffs.length,
    },
    null,
    2,
  ),
);
