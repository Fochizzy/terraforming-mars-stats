# TM Stats Authoritative Document Index

This is a routing index, not a replacement for the documents it lists. Keep it
small and update it when the current authority path changes.

## Instruction and scope authority

Use the repository's established authority order for deciding what work is
allowed:

1. the current explicit user-approved assignment;
2. `docs/CURRENT_STATUS.md` and the detailed `docs/REDESIGN_STATE.md`;
3. the assigned phase file;
4. approved durable decisions in `docs/redesign/DECISIONS.md`;
5. the latest relevant handoff;
6. `docs/redesign/MASTER-RULES.md`;
7. `docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx`; and
8. `docs/redesign/MASTER-PLAN.md`.

Evidence may prove that a documentation statement is stale. Evidence never
grants permission for work outside the current explicit assignment.

## Evidence precedence

When factual implementation-state claims disagree, use this order:

1. current production database state, production logs, and recorded production
   verification;
2. applied migrations and the reconciled production migration ledger;
3. executable tests, verification harnesses, and reproducible reports;
4. current repository implementation;
5. current blocker, remediation, and handoff records;
6. phase guides and expanded implementation guidance; and
7. historical plans and archived documents.

Documentation claims do not override executable repository or production
evidence. A higher evidence class can correct a factual status claim, but it
does not supersede authorization or scope rules.

## Current authoritative documents

| Purpose | File | Authority |
|---|---|---|
| Concise current-work router | `docs/CURRENT_STATUS.md` | Primary current routing |
| Full project state and history | `docs/REDESIGN_STATE.md` | Primary detailed state |
| Current Phase 4 requirements | `docs/redesign/phases/04-log-a-game.md` | Primary phase contract |
| Guest identity and privacy | `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` | Primary cross-phase contract |
| Durable approved decisions | `docs/redesign/DECISIONS.md` | Primary decision record |
| Current production apply evidence | `docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md` | Production evidence |
| Source-bound implementation state | `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md` | Current implementation evidence |
| Source-bound remediation state | `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-MATCHING-REGRESSION-REMEDIATION.md` | Current remediation evidence |
| Migration-to-ledger identity | `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` | Verification contract |
| Live capture compatibility | `docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md` | Current compatibility contract |
| Project-wide rules | `docs/redesign/MASTER-RULES.md` | Governing rules |
| Claude Project delivery | `docs/redesign/CLAUDE-PROJECT-CONTEXT.md` | Synchronization contract |
| Deploy and production-write ledger | `DEPLOY-STATE.md` on `fix/live-compare-data-remove-declared-style` | Primary deploy record |

Read the deploy ledger with
`git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`. Only
that Git object is canonical. Every filesystem copy of `DEPLOY-STATE.md`,
including the one in this repository root and the one in the live checkout, is a
factless pointer stub; a copy asserting a worker version, commit, ledger value,
or deploy date is stale by construction. The planning pack resolves the ledger
from that ref and fails closed rather than reading any working-tree file.

The detailed Step 4.3 assignment guide currently exists at
`docs/agent-prompts/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`.
It is supporting guidance. The current explicit assignment and the authority
order above remain controlling.

## Historical documents

Files placed under `docs/archive/` are historical context only. That directory
does not currently exist; if it is created later, its contents must not be
treated as current requirements unless a current authoritative document
explicitly promotes or references them.

Older plans, superseded STOP records, and historical handoffs outside that
directory remain historical when a newer authoritative record explicitly
supersedes them.

## Conflict handling

If two sources disagree:

1. do not silently choose one;
2. identify the conflicting passages and their dates or commits;
3. inspect the implementation, tests, migrations, ledger, and available
   production evidence;
4. state which factual source appears current and why;
5. stop before implementation when the conflict changes scope, safety, data, or
   release authority;
6. update `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`, or this index when
   the contradiction is resolved; and
7. do not mark an item resolved without executable verification.

## Maintenance

- Update `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` together when
  current phase, blocker, release, migration, or next-action state changes.
- Update this index when a current authority is added, moved, superseded, or
  archived.
- Add new durable cross-project Claude guidance to
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json` in the same change.
- Run `npm.cmd run validate:claude-context -- --require-maintenance` before the
  completion commit.
