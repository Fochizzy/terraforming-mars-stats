---
name: tm-validation-battery
description: Use before starting and again before finishing any TM Stats change — code, migration, or documentation — to run the repository's validation checks and compare the results against recorded baselines. Fires on: run the tests, is it green, did I break anything, what do I run before committing, check types, lint, build, vitest, the executable PostgreSQL harness, validate:claude-context, measure a baseline, is this a regression.
---

# Validation battery

This skill is procedure. It authorizes nothing. Passing the battery does not make
a change correct, in scope, or releasable, and it is not evidence that a report
is accurate.

## The checks

Run from the repository root. The scripts are defined in `package.json`; the
harness is `supabase/tests/executable/run.sh` and documents itself in
`supabase/tests/executable/README.md`.

| Check | Command |
|---|---|
| Executable PostgreSQL harness | `PGBIN="/c/Program Files/PostgreSQL/18/bin" bash supabase/tests/executable/run.sh` |
| Unit and integration tests | `npm.cmd run test` |
| TypeScript | `npx tsc --noEmit` |
| Lint | `npm.cmd run lint` |
| Build | `npm.cmd run build` |
| Documentation maintenance | `npm.cmd run validate:claude-context -- --require-maintenance` |

`npm.cmd run test`, `npm.cmd run build`, and the deploy/preview scripts each run
the context validator first as a `pre*` script, so a documentation break shows up
as a test or build failure. That is the validator failing, not the suite.

The harness stands up a disposable PostgreSQL cluster on a spare port rather than
using Docker. It needs a real `PGBIN` and `bash`. If either is missing the check
is **not run** — it is never "passed".

## The `--require-maintenance` flag is a completion gate, not a state check

It compares the *working tree* against `HEAD` (`git diff --name-only HEAD` plus
untracked files) and requires that the change in progress touches the state
document and a handoff, and that the handoff is referenced from the state
document. On a clean tree it therefore **fails by design**, and that failure is
not a broken baseline.

So: run it **after** the documentation edits exist and **before** the commit. Run
the plain `npm.cmd run validate:claude-context` when you want to know whether the
repository itself validates.

## Baselines

`.claude/skills/tm-validation-battery/scripts/baselines.json` holds the recorded
results and the commit they were measured at. It is the single source for them —
nothing else in this skill repeats the numbers, so they cannot drift apart.

Re-measure and update that file only from a clean tree at a known commit, and
record the commit in the same edit.

## Running it

```bash
pwsh -File .claude/skills/tm-validation-battery/scripts/run-battery.ps1
```

Useful switches: `-Skip harness,build` when you deliberately want a shorter run,
`-Only lint,tsc` to target one, `-PgBin <path>` for the PostgreSQL binaries. Every
skipped check is printed as `SKIPPED` with its reason and is counted as not run.

## Reading the results honestly

- **Report every check by name, with its command and exit status.** Never fold
  skipped, failed, or unrun checks into "passed".
- **Lint exits 0 with warnings.** A new warning is a regression even though the
  command succeeded; that is why the baseline stores the exact warning list and
  not a count.
- **A changed test count is a result, not noise.** Report added and removed tests.
- **A build that fails in a fresh worktree** may be failing on a missing local env
  file rather than on your change. Establish which before you report it, and say
  where you measured.
- **Do not claim a check you did not run.** If you deliberately skipped one, say
  so and say why.

Where the project requires validation, and what must be true before a task is
claimed complete, are at `AGENTS.md` → `## Validation` and `CLAUDE.md` →
`## Required workflow`. This skill does not restate those and is not authority
over them.
