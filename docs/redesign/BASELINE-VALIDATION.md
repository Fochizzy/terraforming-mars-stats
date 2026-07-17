# TM Stats Redesign Baseline Validation

## Date

2026-07-16

## Branch

redesign/tm-stats-dashboard-rebuild

## Base revision

ac3855cb1

## Environment

- Windows
- Node.js 24.15.0
- npm 11.12.1
- Next.js 15.5.20

## Dependency installation

`npm ci` completed successfully.

npm reported:

- 2 moderate-severity dependency vulnerabilities
- Deprecated `node-domexception`
- Deprecated `glob` version

Do not run `npm audit fix --force` as part of the redesign without a
separate dependency-upgrade review.

## Tests

Command:

`npm test`

Result:

- 55 test files passed
- 137 tests passed
- 0 failures

## Type checking

Command:

`npx tsc --noEmit`

Result:

- Passed
- No TypeScript errors

## Lint

Command:

`npm run lint`

Result:

- Completed with warnings

Baseline warnings:

1. Three `@next/next/no-img-element` warnings in
   `src/features/insights/score-profile-panel.tsx`
2. One unused-function warning for `normalizeProfileHeadToHeadRow` in
   `src/lib/db/analytics-repo.ts`
3. The project still uses the deprecated `next lint` command

These are baseline warnings and were present before redesign implementation.

## Production build

Command:

`npm run build`

Result:

- Passed
- 22 static or dynamic routes generated
- Same baseline lint warnings were reported

## Development server

Command:

`npm run dev`

Result:

- Started successfully
- Local application responded at `http://localhost:3000`

## Baseline status

Healthy enough to begin Phase 0.

No production application changes were made during setup.

## Phase 0 Step 0.5 Validation Review

### 1. Environment

- Review date: 2026-07-16
- Dedicated worktree: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Pre-validation working tree: clean
- Operating system: Microsoft Windows `10.0.26200`, x64
- Node.js: `v24.15.0`
- npm: `11.12.1`
- Next.js: `15.5.20`
- `.env.local`: present; contents were not displayed or recorded

The Node.js, npm, and Next.js versions match the original setup baseline. Git
status emitted an environment-specific warning because the validation sandbox
could not read the user-level `C:\Users\izzyh\.config\git\ignore`; the porcelain
status itself was empty and the worktree was clean.

### 2. Tested commit

- Full commit: `c2b58723dbd62949cf021b8a463c717d0d18e54d`
- Short commit: `c2b58723d`
- Original setup baseline revision: `ac3855cb1`

The tested commit is later than the original setup revision because it includes
the completed Phase 0 audit documentation through Step 0.4. Validation ran in the
dedicated redesign worktree, not a temporary build or deployment directory.

### 3. Test results

Command: `npm test` (`npm.cmd test` was the PowerShell invocation)

| Field | Result |
| --- | --- |
| Start status | Started successfully; Vitest reported start time `23:41:53` |
| Completion status | Completed |
| Exit result | `0` |
| Test files | 55 passed, 0 failed |
| Tests | 137 passed, 0 failed |
| Errors | None |
| Warnings | None in this run |
| Duration | Vitest: 11.82 seconds; command wall time: 13.5 seconds |
| Difference from original baseline | None; file count, test count, and pass status match |

The `pretest` hook `scripts/apply-lineup-effects-polish.mjs` completed and left the
working tree clean. No passing-test stderr needed to be reclassified in this run.

### 4. Type-check results

Command: `npx tsc --noEmit` (`npx.cmd tsc --noEmit` was the PowerShell invocation)

| Field | Result |
| --- | --- |
| Start status | Started |
| Completion status | Completed after an environment-permitted rerun |
| Final exit result | `0` |
| Test files / tests | Not applicable |
| TypeScript errors | None in the completed run |
| Warnings | None in the completed run |
| Duration | Completed run: 4.3 seconds |
| Difference from original baseline | No code-result difference; both pass with no TypeScript errors |

The initial sandboxed invocation exited `1` after 6.4 seconds with `TS5033`
because it could not write `tsconfig.tsbuildinfo` in the dedicated worktree
(`EPERM`). The same command passed when granted direct write access to that
worktree and left no tracked change. This is classified as an **Environment-specific
issue**, not a TypeScript failure.

### 5. Lint results

Command: `npm run lint` (`npm.cmd run lint` was the PowerShell invocation)

| Field | Result |
| --- | --- |
| Start status | Started |
| Completion status | Completed after an environment-permitted rerun |
| Final exit result | `0` |
| Test files / tests | Not applicable |
| Errors | None in the completed run |
| Warnings | 4 ESLint warnings plus the `next lint` deprecation notice |
| Duration | Completed run: 2.3 seconds |
| Difference from original baseline | None in code/tool warnings |

The warnings are:

1. `src/features/insights/score-profile-panel.tsx:172:19` —
   `@next/next/no-img-element`
2. `src/features/insights/score-profile-panel.tsx:192:19` —
   `@next/next/no-img-element`
3. `src/features/insights/score-profile-panel.tsx:216:13` —
   `@next/next/no-img-element`
4. `src/lib/db/analytics-repo.ts:1128:10` —
   `normalizeProfileHeadToHeadRow` is defined but never used
5. `next lint` is deprecated and will be removed in Next.js 16

The initial sandboxed invocation exited `1` after 3.6 seconds because Next.js
could not write `.next/cache/eslint/.cache_1e985ao` (`EPERM`). The same command
completed with exit `0` when granted direct worktree write access. This is an
**Environment-specific issue**, not a lint failure.

### 6. Build results

Command: `npm run build` (`npm.cmd run build` was the PowerShell invocation)

| Field | Result |
| --- | --- |
| Start status | Started successfully in the redesign worktree |
| Completion status | Completed |
| Exit result | `0` |
| Test files / tests | Not applicable |
| Errors | None |
| Warnings | The same 4 ESLint warnings listed above |
| Duration | Compile: 2.2 seconds; command wall time: 14.1 seconds |
| Generated output | Next.js reported static-page generation `22/22` and emitted the application route table |
| Difference from original baseline | None in pass status, generated-page count, or lint warnings |

The `prebuild` hook completed, Next.js loaded `.env.local` without its contents
being displayed, compilation and type validation passed, and the working tree
remained clean after the build.

### 7. Differences from the original baseline

1. The tested revision changed from `ac3855cb1` to `c2b58723d` as expected after
   Phase 0 documentation Steps 0.1 through 0.4.
2. Environment versions are unchanged: Node.js `24.15.0`, npm `11.12.1`, and
   Next.js `15.5.20`.
3. Tests are unchanged at 55 passing files and 137 passing tests.
4. Type checking still passes with no TypeScript errors.
5. Lint still completes with the same three image warnings, one unused-function
   warning, and deprecated `next lint` command.
6. The production build still passes, reports generation `22/22`, and repeats the
   same four ESLint warnings.
7. The sandbox-only incremental-TypeScript and ESLint-cache write denials were not
   reported in the original setup baseline. Both disappeared when the exact
   commands were run with direct write access to the redesign worktree.

### 8. Pre-existing warnings

| Issue | Classification | Review result |
| --- | --- | --- |
| Three raw `<img>` warnings in `score-profile-panel.tsx` | Existing baseline warning | Reproduced unchanged in lint and build |
| Unused `normalizeProfileHeadToHeadRow` | Existing baseline warning | Reproduced unchanged in lint and build |
| Deprecated `next lint` command | Existing baseline warning | Reproduced unchanged in lint |
| Original setup recorded two moderate dependency vulnerabilities and deprecated `node-domexception` / `glob` packages | Existing baseline warning | Not re-audited because Step 0.5 did not install, update, or audit dependencies |

No lint warning was fixed because warning cleanup is outside Step 0.5.

### 9. New warnings or failures

No newly introduced code warning, test failure, type-check failure, lint failure,
or build failure was found.

| Issue | Classification | Disposition |
| --- | --- | --- |
| Initial `TS5033` / `EPERM` writing `tsconfig.tsbuildinfo` | Environment-specific issue | Exact rerun passed with worktree write access |
| Initial `EPERM` writing the Next.js ESLint cache | Environment-specific issue | Exact rerun completed with exit `0` with worktree write access |
| User-level Git ignore file could not be read by the validation sandbox | Environment-specific issue | Porcelain status was empty; no validation or release effect |

There are no issues classified as **Newly introduced warning**, **Existing
baseline failure**, **Newly introduced failure**, or **Requires further
investigation** in the Step 0.5 command results.

### 10. Release risks

- No new release-blocking regression was found at the tested commit.
- The four existing ESLint warnings remain technical debt but do not fail lint or
  build.
- The original setup's dependency vulnerability/deprecation report remains a
  separate dependency-review concern; this step did not refresh that report and
  did not run `npm audit fix`.
- Validation automation must allow the redesign worktree to write normal
  TypeScript and Next.js cache/build artifacts. Sandbox write denial can otherwise
  create false-negative validation results.

### 11. Recommendation for proceeding to Step 0.6

Proceed to Phase 0, Step 0.6 — Migration Matrix when it is explicitly assigned.
The tested commit reproduces the healthy original baseline, all required final
commands pass, and no new code warning or failure needs to be resolved before the
documentation-only migration matrix begins.
