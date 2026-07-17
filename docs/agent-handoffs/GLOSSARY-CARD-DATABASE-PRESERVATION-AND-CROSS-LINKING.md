# Glossary and Card Database Preservation and Cross-Linking Handoff

## Status and authority

Completed in the protected redesign repository on 2026-07-17. The prior
blocker is resolved: the explicit product decision approved historical commit
`b13276d8867682fe369b8844867d63b09fbcf349` as the identity/behavior baseline
for the Glossary and full Card Lookup, while current redesign contracts retain
authority for all semantic meaning and capability claims.

This work was limited to the explicitly assigned preservation task. It did not
start another phase, change the original repository, add dependencies, create a
migration, query or mutate production data, mutate Storage, push, or deploy.

## Preflight and source inspection

- Working directory: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Phase 2 was already formally complete; this was its separately approved
  follow-up preservation task.
- The original `C:\Users\izzyh\Documents\Terraforming Mars` checkout remained
  read-only and untouched.
- Historical sources inspected read-only: the approved commit's Glossary route,
  data, content, link, rich-text, and test files; the Cards route, full lookup
  browser, and `reference-repo.ts`.
- Current sources inspected: `(app)` authentication layout and middleware
  guards; Cards route, promo browser, reference repository, image fields,
  group context, shell/navigation, existing tests, current migrations/types,
  the Phase 2 handoffs, governing redesign documents, and the master guide.

## Glossary inventory and reconciliation

- The historical Glossary has 8 categories, 125 entry slugs, and 214 explicit
  aliases. All category IDs, entry slugs, historical names, and aliases are
  preserved in one typed source.
- The two historically ambiguous aliases (`score edge` and `opening combo`) are
  retained for compatibility but never auto-linked. Nine case/punctuation-only
  canonical/alias repetitions are validated and deduplicated for linking.
- Stable destinations are `/glossary#<entry-slug>`. Initial loads, reloads,
  copied links, and browser history `hashchange` events focus, scroll, briefly
  highlight, and announce the exact entry. Unknown fragments show an intentional
  unavailable status without a false destination.
- Historical definitions were reconciled against current contracts. Current
  descriptions cover finalized outcomes, Win Rate/placement/sample wording,
  score-component limits, optional coverage, observed zero, imported evidence,
  declared versus inferred style, and Merger availability/conditional selection.
- New current-contract entries are Win Point Differential, Metric Availability,
  Observed Zero, Merger Availability, and Conditional Selection Rate. Cards
  Purchased, Seen, Drawn, Received, Played, and Remaining explicitly report
  unavailable because the repository has no approved complete event/snapshot
  reader for them.
- Deferred or provisional historical terms include Weighted Score, confidence,
  score-margin/lead-pressure formulae, play rate/deltas, legacy scope controls,
  and detailed insights/outcomes without a current metric contract. No former
  formula or threshold was restored merely from history.

## Cross-linking and accessibility

- `GlossaryRichText` is the only automatic linker. It matches complete terms
  case-insensitively, preserves displayed casing, chooses deterministic longest
  matches, observes punctuation boundaries, and avoids overlaps/partial words.
- Repeated-link policy: link at most the first occurrence of each distinct term
  per trusted content block, with a cap of six destinations.
- Supported surfaces: Glossary definitions and the trusted informational text in
  the Card Database/detail dialog. No arbitrary HTML or player-provided content
  is transformed.
- Excluded surfaces: URLs, existing links, buttons/custom button roles, inputs,
  selects, textareas, editable content, code/preformatted text, form values,
  player names, raw imports/logs, error payloads, and the entry currently being
  defined.
- Destination controls are keyboard focusable; targets receive focus with a
  visible border/shadow and an assistive-technology status message. The card
  search, filters, reset control, detail buttons, close control, and Escape
  behavior are keyboard operable.

## Card Database parity

- Historical full Card Lookup loaded all `cards` records through
  `listCardLookupRecords`, kept stable `cards.id`, searched name/number/type/
  expansion/tags/promo/VP data, and offered type/expansion/tag filters, reset,
  count, thumbnails, and details.
- The previous current `/cards` page used only `PromoSetBrowser`; it could not
  serve as the Card Database. It has been replaced with the complete server-side
  lookup while retaining the current authenticated `(app)` layout, middleware
  protection, active group context, and server-only repository boundary.
- `listCardLookupRecords()` reads the full real catalog, retains `cards.id`,
  maps current metadata and VP classification, and batch-resolves promo slugs.
  The client receives only repository output and makes no privileged query.
- The new browser composes name/number/metadata search with card type, expansion,
  and tag filters; reports result count; resets cleanly; shows a responsive grid;
  uses stored thumbnail/full image fields; and displays a text fallback for
  absent, placeholder, or failed art.
- Opening a card exposes real number, name, type, expansion, required
  expansions, tags, VP metadata, and full art where available. The historical
  `get_card_win_stats` RPC is absent from the current tracked contract, so card
  outcome statistics are intentionally shown as unavailable instead of being
  fabricated or reintroduced.

## Files changed

- Glossary route, typed identity data, registry, destination helper, matcher,
  safe rich-text renderer, content UI, and focused tests under
  `src/app/(app)/glossary/` and `src/features/glossary/`.
- Full lookup types, browser, detail dialog, image fallback, route test, and
  server repository mapping/test under `src/lib/catalog/`,
  `src/features/catalog/`, `src/app/(app)/cards/`, and `src/lib/db/`.
- Route guards, shell navigation, and their tests.
- Preservation inventory; state/decisions/page/data/asset/migration/component
  records; master plan; and this dedicated handoff.

## Validation

| Check | Result |
| --- | --- |
| Focused preservation suite | Passed: 12 files, 21 tests covering registry validation, fragments/history, safe matching, controlled rendering, route loading, full repository mapping, filters, fallback, detail, navigation, and guards. |
| `npm.cmd test` | Passed: 117 test files, 590 tests. |
| `npx.cmd tsc --noEmit` | Passed with no errors. |
| `npm.cmd run lint` | Passed with four unchanged baseline warnings: three legacy `no-img-element` notices in `score-profile-panel.tsx`, one unused `normalizeProfileHeadToHeadRow` in `analytics-repo.ts`, and the existing Next lint deprecation notice. |
| `npm.cmd run build` | Passed: 24/24 pages generated, including dynamic `/cards` and `/glossary`, with the same four baseline warnings. |
| Diff review | `git diff --check` passed before staging. |

## Blockers, deferrals, and next action

There is no repository blocker for the assigned preservation task. Deferred work
is limited to unapproved card-outcome statistics/RPC, card acquisition and
opportunity metrics, and any new future cross-link surfaces; none is implied by
this completion. The exact next action is **await a new explicit assignment**.

The completion commit cannot embed its own final cryptographic hash. Its exact
hash and clean final worktree status are recorded in the final completion report
after commit; no push or deployment follows it.
