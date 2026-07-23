---
name: tm-production-action-preflight
description: Use before any TM Stats action that touches a production system — applying a migration, deploying, running execute_sql or any query against the live database, a grant or revoke, a backfill, a catalog publish, or any other production write. Also use when about to claim that one of those happened. Covers confirming the authorization names the action, reading the canonical ledger, migration identity and byte-identity, expand/contract ordering, bounding the write, and what must be recorded afterwards. Fires on: apply the migration, run this SQL against prod, deploy, backfill, grant, revoke, check the ledger, is this already applied, list_migrations, apply_migration.
---

# Production-action preflight

**This skill authorizes nothing.** It does not grant permission to apply, deploy,
query, or write anything, and reading it does not make an action allowable. It is
for a session that **already holds an explicit, named authorization** and is about
to act on it. If you are not that session, the answer is stop, not proceed
carefully.

## 1. Confirm the authorization names this action

Say out loud which sentence of your assignment authorizes the specific thing you
are about to do — this migration, this statement, this deploy.

- **Absence of a prohibition is not authorization.**
- Authorization to *read* production is not authorization to *write*.
- Authorization for one statement is not authorization for a second.
- A precondition that dissolved is a finding to report, not a granted permission.
- A prior session's authorization is not yours.

If you cannot name the sentence, stop and report. See `tm-conflict-and-authority`.

Several of these are prohibited outright unless separately approved, and this
skill does not soften any of them: **deploying**; **pushing** without explicit
instruction; **mutating Supabase production data or Storage**; **creating a
migration**; **creating a database view**; **modifying schema**. The list is at
`docs/redesign/MASTER-PLAN.md` → `## 4. Non-Negotiable Constraints`. A separate
approval is per-action and does not carry to the next one.

## 2. Read the canonical ledger, from Git

The deploy and production-write ledger is a **Git object**, read from the ref
configured in `docs/redesign/CLAUDE-PROJECT-SOURCES.json`:

```bash
git show <configured-ref>:DEPLOY-STATE.md
```

Take the ref from that catalog rather than from memory or from this file. Every
filesystem copy is a pointer stub; one asserting a worker version, commit, ledger
value, or deploy date is stale by construction. The rule is at `CLAUDE.md` →
`## Production-action synchronization rule` and `AGENTS.md` →
`### Production-action synchronization rule`.

## 3. Reconcile identity before you act

**A migration filename is not its ledger version.** They diverge, and entries are
paired by **name**, not by number. Reconcile against
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — `## Why filenames and ledger
versions differ`, `## Classifications`, and `## What the gate enforces` — and
against the ledger **this session actually read**, never a remembered one or one
another report asserted.

Establish before acting: is this file already applied, under what version, is it
gated, and is there a production-only entry with no repository file.

## 4. Byte identity — and the check that lies

Send the SQL from `git show <ref>:<path>`. **Do not send the working-tree file**:
its bytes can differ from the reviewed object.

If you verify identity, use `--no-filters` or a content hash. **The default check
false-passes.** Measured in this repository on a committed migration:

```bash
git rev-parse "HEAD:$F"            # 98aeff9e…  canonical object
git hash-object "$F"               # 98aeff9e…  MATCHES — but the bytes differ
git hash-object --no-filters "$F"  # 2b17b046…  the truth
sha256sum "$F"                     # e71fab89…
git show "HEAD:$F" | sha256sum     # 6d2f4768…  differs
```

The working file has CRLF terminators; `git hash-object` applies the EOL filter
and reports a match anyway. A byte-identity check run the default way therefore
confirms nothing.

## 5. Bound the write

- **Expand before contract.** Verify between the halves. Know which migrations are
  gated and why, and do not apply a gated one because it is next in the directory.
- **One statement.** Know what it does, what it locks, and how it reverses.
- **A preflight read is production access too.** It needs its own authorization —
  this skill grants none, and "I only looked" is not a defence. When a read *is*
  authorized, keep it to the minimum that answers the question: counts, booleans,
  catalog and ACL facts, COUNT-only over reading rows, and never personal rows.
- **Never mutate production identities during validation.** See
  `tm-identity-privacy`.
- **The apply mechanism is not a free choice.** Use the path the current
  authoritative records use for this class of change, and confirm which that is
  before acting rather than reaching for the tool you used last.

Repeat-safety matters: an operation that is not safe to run twice will eventually
be run twice.

## 6. Afterwards, two separate actions

1. Append the result to the canonical `DEPLOY-STATE.md` on the production lineage
   and **commit it there**. Updating a non-canonical working copy does not count.
2. **Then** run the planning-pack updater, or explicitly report synchronization
   pending with the reason.

These are two actions, not one; completing the first does not complete the second.
Details and the tree-identity behaviour: `tm-planning-pack-sync`.

## 7. Claim only what you observed

Record what you ran, what it returned, and what you did not verify. Verify every
identifier before the report leaves the session — see
`docs/redesign/MASTER-RULES.md` → `## Reporting integrity`. A production claim
that no one can reproduce from your evidence is worse than no claim, because the
next session will build on it.
