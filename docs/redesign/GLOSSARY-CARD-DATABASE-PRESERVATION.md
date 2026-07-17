# Glossary and Card Database Preservation and Cross-Linking

## Status

Completed in the repository at `c17e8b1ba` on 2026-07-17. The focused full suite,
typecheck, lint, and build validation passed before that commit. This document is
the current-state, reconciliation, and functional-parity inventory for the
separately assigned post-Phase-2 task.

## Authority

1. Explicit Glossary and Card Database Preservation and Cross-Linking assignment.
2. Canonical Glossary designation, dated 2026-07-17.
3. `docs/REDESIGN_STATE.md` and the Phase 2 completion handoff.
4. The current implementation and the approved historical baseline
   `b13276d8867682fe369b8844867d63b09fbcf349`.

The historical baseline is authoritative for Glossary identities, aliases,
fragment routes, link behavior, content inventory, and Card Database behavior.
Current redesign documents are authoritative for definition meaning, analytics
availability, missing-data states, and authorization boundaries.

## Current-state inventory before restoration

### Glossary

- Current route: none.
- Current components, registry, loaders, search, deep links, and tests: none.
- Current identity/data source: none.
- Current permissions: none, because no current route exists.
- Historical canonical route: authenticated `/glossary`.
- Historical identity and deep-link contract: category IDs and entry slugs,
  with exact-entry URLs such as `/glossary#weighted-score`.
- Historical navigation: fragment section links; no search or server loader.
- Historical target behavior: on initial load and `hashchange`, scroll the
  exact matching entry into view and briefly highlight it. Unknown fragments
  did not resolve to an unrelated entry.

### Historical Glossary reconciliation

- Categories: 8 (`standings`, `scope-views`, `play-styles`, `score-sources`,
  `coverage`, `insight-views`, `selection-stats`, and `game-concepts`).
- Entries: 125 historical entries; every category and entry identifier is
  retained as the compatibility vocabulary.
- Aliases: 214 explicit historical aliases. Matching remains case-insensitive
  while preserving the source text casing.
- Ambiguous aliases: `score edge` resolves historically to both `score-margin`
  and `lead-pressure`; `opening combo` resolves to both
  `opening-combo-strength` and `corp-prelude-pairing`. Both stay in the
  compatibility inventory but are excluded from automatic linking and reported
  by registry validation.
- Nine historical aliases repeat their own canonical label only by casing or
  punctuation normalization (for example `baseline win rate`). The registry
  reports those duplicate labels, retains the canonical target, and does not
  create duplicate links.
- Definitions preserved unchanged: plain-language game concepts and play-style
  descriptions whose meaning does not assert an unapproved formula, threshold,
  route, coverage claim, or data fact.
- Definitions adapted: recorded result terms, score sources, data coverage,
  Merger, and Win Point Differential use the completed Phase 2 contracts.
  In particular, recorded score components are not presented as unrecorded
  temporal or final-TR facts, and Merger availability is not inferred from a
  missing event.
- Definitions deferred: historical Weighted Score, confidence thresholds,
  score-margin/lead-pressure formulas, play-rate and delta methodologies,
  legacy scope controls, and detailed insight/outcome views without an
  approved current metric contract render a clear deferred/provisional status
  instead of their historical operational claim.
- New entries required by approved Phase 2 contracts: Win Point Differential,
  Metric Availability, Observed Zero, Merger Availability, and Conditional
  Selection Rate. They use new stable slugs and do not replace historical
  identities.
- Cards Purchased, Cards Seen, Cards Drawn, Cards Received, Cards Played, and
  Cards Remaining are explicit unavailable entries. Their wording follows the
  current capability audit: catalog rows, final score components, key-card
  selections, and incomplete import/event material cannot be used as a proxy.

### Card Database

- Current route: `/cards` inside the authenticated `(app)` layout, with active
  group context required by the page.
- Current implementation: `PromoSetBrowser`, which lists only cards with a
  `promo_set_id`, groups them by real promo set, and opens a stored full-image
  URL in a new tab.
- Current card source: server-side `reference-repo.ts`, reading real
  `promo_sets` and `cards` records. Current stable identity is `cards.id`.
- Current behavior: promo-set switching and empty states; no all-card search,
  type/expansion/tag filters, card details, or per-card route/query/fragment.
- Current image behavior: database URL fallback chain but no runtime decode
  fallback. Existing Card Database deep links do not exist.
- Historical full Card Lookup: one real `cards` query ordered by name, stable
  `cards.id`, name/number/type/expansion/tag/indexed-text search, card-type,
  expansion, and tag filters, visible result count, reset, responsive cards,
  keyboard-operable detail button, thumbnail/full-image handling, and a
  statistics dialog.
- Restoration: retain `/cards`, current group context and authenticated layout,
  and the real server repository. Restore all-card browsing with the current
  cards schema and stable IDs. The historical `get_card_win_stats` RPC is not
  present in the current tracked contract and no new RPC is authorized. The
  detail interaction therefore exposes real catalog metadata and a distinct
  unavailable card-outcome-statistics state rather than fabricating or
  widening privileged data access.

## Supported content inventory

| Surface | Classification | Decision |
| --- | --- | --- |
| Glossary definitions | Supported | Link only the containing explanatory text; exclude the entry's own slug to prevent self-links. |
| Card Database metadata in the details dialog | Supported | Link recognized explanatory terms in non-interactive description text only; never card names or controls. |
| Analytics explanations and metric descriptions introduced by this task | Supported | Use `GlossaryRichText` only for trusted, structured text nodes. |
| Existing charts, dashboard prose, forms, imports, player names, raw logs, errors, and accessibility-only labels | Later authorization or unsafe | No automatic linking in this task. |
| Links, buttons, inputs, textareas, selects, editable content, code, preformatted text, and URLs | Unsafe for automatic linking | The controlled renderer leaves them unchanged. |

## Functional-parity acceptance criteria

- `/glossary`, every historical category ID, every historical entry slug, and
  `/glossary#<slug>` remain resolvable.
- The restored Glossary has all 125 historical entries plus only documented
  Phase 2 additions; identities, names, and aliases remain explicit.
- Unknown fragments have a visible unavailable state and never appear to land
  successfully at the page top.
- Fragment navigation is reload-safe; browser back/forward and hash changes
  identify, scroll to, and focus the exact entry without focus trapping.
- `/cards` remains an authenticated, group-context route backed by real card
  records and stable card IDs; the narrower promo behavior remains included in
  the all-card result set.
- Search, card-type, expansion, and tag filters, reset, result count, detail
  interaction, image fallback, keyboard behavior, and empty states work.
- No new database query shape bypasses RLS; no card data is hard-coded.
- Glossary matching is centralized, validated, deterministic, whole-term only,
  longest-match first, and first occurrence per entry per content block (at
  most six distinct entries) for readable, non-repetitive link output.
- Automatic links do not appear inside existing links, interactive/editable
  controls, code/preformatted text, URLs, or a Glossary entry's own definition.
- No competing Glossary, card catalog, schema change, migration, Storage
  mutation, production database action, push, or deployment is introduced.

## Planned implementation boundaries

- Shared pure modules own term-registry validation, destination generation,
  and text segmentation; React rendering, fragment handling, and focus/scroll
  remain separate.
- Registry validation rejects blank labels and unknown entry slugs, reports
  duplicate and ambiguous aliases, and removes unsafe targets from automatic
  matching while preserving their historical compatibility metadata.
- Matching treats letters and numbers as word characters, is case-insensitive,
  preserves visible casing, and uses the longest valid label. It does not
  invent plural or inflected forms.
- Scrolling uses no animation, so it is reduced-motion safe. The highlighted
  target has text, border, and status indication rather than color alone.

## Implemented result

- One typed Glossary source contains all 125 historical identities, their
  categories and aliases, plus eleven documented current-contract entries.
- The registry validates duplicate slugs, duplicate labels, ambiguous aliases,
  empty aliases, and missing entries. Ambiguous labels never become automatic
  link targets; a canonical term remains the target where an alias merely
  duplicates it.
- `/glossary#<slug>` handles initial load and `hashchange` by scrolling and
  focusing the exact target, briefly highlighting it, and announcing it to
  assistive technology. An unknown fragment presents an intentional unavailable
  status without pretending that the page reached a matching entry.
- `GlossaryRichText` is the single controlled renderer. It creates at most six
  distinct destination links per trusted content block, links only the first
  occurrence of each destination, and skips URLs, existing links, interactive
  controls, editable content, code/preformatted text, and the current entry.
- `/cards` now calls `listCardLookupRecords()` from its server page and renders
  `CardLookupBrowser` for every available catalog row. Search and filters
  compose; stable `cards.id` remains the rendered identity; missing/failed art
  has text fallback; and detail exposes only real catalog metadata. The former
  historical statistics RPC is deliberately not recreated.

## Verification plan

Focused tests will cover the historical entry/alias inventory, current semantic
overrides, registry validation, matching, controlled rendering exclusions,
fragment target behavior, and all Card Database filtering/detail/image states.
The required full test, typecheck, lint, and build commands will follow the
repository's actual package scripts.
