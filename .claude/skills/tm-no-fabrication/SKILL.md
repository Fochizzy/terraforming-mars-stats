---
name: tm-no-fabrication
description: Use whenever TM Stats data might be absent, partial, or unproven — writing or reviewing a query, view, migration, parser, aggregation, chart, metric, or export; deciding what to render when a value is missing; or filling a gap in a per-generation series. Covers the difference between observed zero, missing, and unsupported, and the bans on interpolation, on reconstructing a timeline from final totals, and on fabricated continuity. Fires on: null vs zero, default to 0, coalesce, fillna, forward fill, carry forward, interpolate, backfill a gap, per-generation values, no data yet, small sample, what do we show when it's empty.
---

# Do not fabricate data

This skill is procedure. It authorizes nothing, and following it does not make a
data change approved. It does not authorize creating a migration, a database
view, or a schema change — each needs separate approval
(`docs/redesign/MASTER-PLAN.md` → `## 4. Non-Negotiable Constraints`) — nor
mutating any production data.

The rules it enforces live at `docs/redesign/MASTER-RULES.md` → `## Data
integrity`, `## Temporal analytics`, and `## Analytics`; `AGENTS.md` →
`## Non-negotiable rules`; and `CLAUDE.md` → `## Project rules`. Read them there.
This skill is how to apply them, not a copy of them.

## 1. Classify the value before you write code that reads it

Three states, never collapsed into one:

| State | Meaning | What it must not become |
|---|---|---|
| **Observed zero** | Measured, and the measurement was zero. | Must not be shown as missing. |
| **Missing** | Not recorded, not observed, or not yet captured. | Must not become `0`, a default, or a neighbouring value. |
| **Unsupported / unproven** | The source cannot express it, or no evidence establishes it. | Must not become "absent" and must not become "zero". |

Decide which one you have *before* the code exists. Almost every fabrication bug
is a missing value that was classified late and defaulted early.

An absent upstream effect is unproven, not zero. A column with no evidence stays
null.

## 2. Hunt the collapse patterns

Search the path you are touching and check every hit against the classification
above:

```bash
rg -n "\?\? 0|\|\| 0|coalesce\(|COALESCE\(|fillna|Number\([^)]*\) *\|\|" src supabase
```

Each one is either correct — an observed zero, or a count that genuinely starts at
zero — or a fabrication. There is no third case, and the difference is invisible
once it ships, because a fabricated zero looks exactly like a measured one.

## 3. Never manufacture continuity

- **No interpolation.** Do not compute a missing start or final value from the
  values around it.
- **No reconstruction from totals.** Do not derive a per-generation series from a
  final total, and do not spread a total across generations.
- **No carry-forward across a gap.** Holding the last observed value across
  generations where nothing was observed invents observations. A gap is a gap.
- **No stitching.** Do not join two partial series into one continuous one and
  present the join as measured.
- **No invented identity.** Do not invent IDs, aliases, board coordinates,
  placement events, cards, tiles, or objectives to fill a gap. An unfilled gap is
  a catalog gap and is recorded as one.

Distinct concepts stay distinct. Do not substitute one for another because it is
available — a value that is present but means something else is worse than a
missing value, because it is not detectable downstream.

## 4. Represent absence explicitly

When a value is missing, render an explicit unavailable or partial-data state.
Say which, and say what is missing. A blank cell, a zero, and a dash all read as
data.

Carry the denominator and the sample size to the surface with any derived metric.
A rate without its denominator cannot be judged by the person reading it.

Sample state and metric value are related but distinct, and low sample is
surfaced, not hidden: low-sample categories stay visible unless something
explicitly filters them out, and low sample is never signalled by colour alone.
**Do not invent a threshold** — there is no universal minimum, and a threshold is
metric-specific or caller-provided. Rules: `docs/redesign/MASTER-PLAN.md` →
`### 8.3 Sample and denominator rules`.

## 5. Language

Report association, not cause, unless something establishes cause. "Wins more
often when X" is a measurement; "wins because of X" is a claim you did not make.
Wording rules: `docs/redesign/MASTER-PLAN.md` → `### 8.4 Analytics language`.

## 6. When you cannot get the value

Record the gap. Say what is missing, what you tried, and what would close it. A
recorded gap is a useful result; a filled gap is a defect that survives review
because it looks like data.
