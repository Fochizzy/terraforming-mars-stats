---
name: tm-canonical-first
description: Use before adding anything to TM Stats that might already exist — a formula, metric, constant, classification list, type, mapping, asset lookup, chart, component, route, or dependency. Search for the canonical one and extend it instead of writing a second. Covers no per-page duplicates and no scattered classification constants. Fires on: I need a helper for X, add a chart, compute a rate or win percentage, add a library, add a route or page, where does this live, is there already a util for this, define a list of card types or tags or statuses.
---

# Find the canonical one first

This skill is procedure. It authorizes nothing. Finding an existing
implementation does not authorize changing it, and failing to find one does not
authorize creating one — several of the things this skill helps you look for
(dependencies, formulas, database objects) need separate approval before they may
be added at all. The prohibitions are at `docs/redesign/MASTER-PLAN.md` →
`## 4. Non-Negotiable Constraints`, and the scope limit at `### Scope rule`.

A second implementation of a formula does not stay a duplicate. It drifts, and
then two pages disagree about the same number in front of the same user — with
nothing in either file saying which is right.

## 1. Search before you create

```bash
rg -ni "<the concept, and two synonyms for it>" src
rg -n "export (const|function|type|interface) .*<Concept>" src
```

Look in the places shared things already live in this checkout:

| Kind | Where to look first |
|---|---|
| Formulas, metrics, derived values | `src/lib/analytics/canonical-definitions.ts` and `src/lib/analytics/calculations/` |
| Data capability, coverage, evidence, filters | `src/lib/analytics/capabilities.ts`, `src/lib/analytics/coverage.ts`, `src/lib/analytics/evidence.ts`, `src/lib/analytics/filters.ts` |
| Database reads and row mapping | `src/lib/db/` |
| Asset resolution and fallbacks | `src/lib/assets/asset-resolver.ts`, `src/lib/assets/corporation-logo-registry.ts`, `src/lib/assets/static-assets.ts` |
| Shared UI, charts, layout, navigation | `src/components/` — its `ui`, `charts`, `foundations`, `layout`, `navigation` and `assets` directories |
| Feature surfaces | `src/features/` |

Search for the *concept*, not the name you were about to use. The existing one is
usually named something you would not have picked.

## 2. No per-page duplicates

A calculation, formatter, or display rule used by more than one surface belongs in
the shared module, not copied into each page. If you find yourself pasting a
second copy "just for this page", stop — but note that lifting the first copy into
a shared module is a refactor. Do it when your assignment covers it; otherwise
record it as deferred work and say so. Refactoring unrelated code is prohibited.

Keep calculations out of presentation code. A number computed inline in JSX cannot
be tested, and will be re-derived slightly differently by the next surface that
needs it.

Do not remove a legacy component before its replacement works
(`docs/redesign/MASTER-RULES.md` → `## Workflow`).

## 3. No scattered classification constants

Card types, tags, statuses, score sources, expansion identities, board and map
identity, objective sets — any vocabulary the domain defines — live in one place
and are imported. Do not re-declare a set inline at a call site, and do not write
a string literal where a shared constant exists.

Two consequences make this non-negotiable rather than stylistic: a re-declared set
silently goes stale when the domain adds a member, and a literal at a call site is
invisible to the search in step 1, so the *next* person also fails to find it and
writes a third copy.

Reference data is read from the database, not from an in-app catalog. Check
whether the reference row already exists — and note that creating a table, a
view, a migration, or any schema change each require **separate approval**, so
"the row is missing" is a finding to report, not a change to make.

## 4. Do not widen the stack

The architecture is fixed: the existing framework, data layer, charting library,
styling conventions, and test tooling (`docs/redesign/MASTER-RULES.md` →
`## Architecture`).

**Do not add a dependency without approval** — not a charting or UI framework, and
not a small one either. Duplicating something already present is the worst case,
not the only prohibited case. Needing a new dependency is a question to raise.

Asset handling already has shared typed lookup, loading, missing-asset fallback,
accessible labelling, and sizing — see `## Supabase assets` in the same document.
Reuse it rather than fetching an asset directly.

## 5. Routes and page ownership

Before adding a route or moving a surface, check that it belongs to a documented
destination and responsibility: `docs/redesign/PAGE-ARCHITECTURE.md` →
`## Target routes` and `## Page responsibilities`. If what you are adding has no
owner there, that is a design question to raise, not a route to create.

## 6. If you genuinely cannot find one

Say so in the report, and include the searches you ran. That lets a reviewer check
your search instead of taking your conclusion, which is the only way "it does not
exist yet" is verifiable.

**Not finding a formula is not permission to write one.** Formulas may not be
invented during implementation; only formulas already approved in the decision
record, the assigned phase file, or the explicit current assignment may be
implemented — `docs/redesign/MASTER-PLAN.md` → `### 8.2 Formula governance`. If
the formula you need is not approved anywhere, that is a decision to request.

When you do implement an approved one, it is centralized, typed, deterministic,
tested, and outside presentation components. Requirements are at
`docs/redesign/MASTER-RULES.md` → `## Analytics` and `CLAUDE.md` →
`## Project rules`. This skill does not restate them.
