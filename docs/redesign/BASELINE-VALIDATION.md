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
