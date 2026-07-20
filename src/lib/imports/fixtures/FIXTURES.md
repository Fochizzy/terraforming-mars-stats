# Import fixtures — provenance and sanitization manifest

Every real-export fixture below is a **complete** exported game log that was
sanitized before committing: player identities are replaced with neutral
`Player A`/`Player B` labels and the trailing `This game id was …` value is
neutralized. No private personal name, email, account id, or production
identifier is committed (verified with a residual-name scan). Constructed and
source-backed fixtures are labelled as such.

| Fixture | Kind | Coverage | Provenance / sanitization |
| --- | --- | --- | --- |
| `retained-real-negative-game-2026-07-15.txt` | real, sanitized | complete game, **flat** space ids (`at NN`), Venus/Colonies **negative** | Real exported log; player names sanitized. Serves as the flat-placement and Venus/Colonies `confirmed_absent` corpus. |
| `retained-real-grid-placement-2026-07-08.txt` | real, sanitized | complete game, **grid** coordinates (`on row R position P`), Venus/Colonies negative | Real exported log (2 players); names → `Player A`/`Player B`, game id neutralized to `sanitized-grid-fixture`. 37 grid placements. |
| `upstream-venus-colonies-action-fragment.txt` | source-backed fragment | Venus increase/decrease, World Government, Rotator, colony setup/build/trade/track | Derived from the upstream Terraforming Mars implementation at pinned commit `7a6f98f09ac2a558969c092d317c313806af7b73`. Not a real player export; it exercises the Venus/Colonies grammar the parser supports. |
| `build-test-pdf.ts` | constructed | result-PDF text-layer layouts, incl. the Venus contribution column | Synthetic PDF builder for `read-game-result-pdf` tests. |
| `synthetic-venus-only-full-export.txt` | **synthetic-but-format-faithful** | complete full export; attributed Venus raises/decrease, Rotator payment, **unattributed World Government**; expected `venusNext = confirmed_present`, `colonies = confirmed_absent`, final Venus null | Constructed 2026-07-19. Line grammar copied from the pinned upstream fragment and the structural framing of the retained real exports (first-player line, `Good luck`, generations, terminators). Not a real player export and never described as one; no real names. |
| `synthetic-colonies-only-full-export.txt` | **synthetic-but-format-faithful** | complete full export; colony setup, construction, paid trade (3 energy), free trade, track up/down; expected `colonies = confirmed_present`, `venusNext = confirmed_absent` | Same provenance and limitations as above. |
| `synthetic-venus-colonies-full-export.txt` | **synthetic-but-format-faithful** | complete full export; both mechanics; expected both `confirmed_present`; also the parser-rerun determinism corpus | Same provenance and limitations as above. |
| `synthetic-off-reserve-ocean-full-export.txt` | **synthetic-but-format-faithful** | complete full export; Artificial Lake (upstream 116) play followed by a same-actor ocean at `08` (not Tharsis-reserved) plus reserved oceans `07`/`13`; expected: exception space `08`, confident Tharsis with the exception, non-confident without | Same provenance; the exception-card linkage rule is source-backed at the pinned upstream commit. |
| `synthetic-unsupported-venus-colonies-full-export.txt` | **synthetic-but-format-faithful** | complete full export with unsupported Venus/Colony wording; expected both `unsupported_log_pattern` (never absence), zero events, unsupported line numbers preserved | Same provenance and limitations as above. |
| `synthetic-printed-alias-objectives-full-export.txt` | **synthetic-but-format-faithful** | complete full export claiming objectives by printed alias text (`Collector`, `Vastitas Spacefarer`, `Politician`) plus one unknown objective; expected: catalogue-alias resolutions, unknown stays unknown (no fuzzy matching) | Alias texts mirror the verified data-only alias migration `20260718212342`. |
| `synthetic-grid-placement-full-export.txt` | **synthetic-but-format-faithful** | complete full export using only historical **grid** coordinates (`on row R position P`); Venus/Colonies negative (complete log, zero mechanic events → `confirmed_absent`); expected: five grid placements preserving row/position beside the converted flat id | Constructed 2026-07-19 for the executable fixture-to-persistence bridge (the retained real grid export exercises the parsers; this small corpus flows through the full action → RPC → database chain without requiring the real game's complete card catalog). Same grammar provenance and limitations as the other synthetic exports; not a real player export. |

The conflicting-evidence scenario reuses `synthetic-venus-only-full-export.txt`
with explicit absent option evidence supplied as parser input (the conflict is
between the option source and the log, not a different log format), asserted in
`import-fixtures.test.ts`.

## Known real-fixture gap: Venus / Colonies positive exports

A complete **real** Venus Next or Colonies export is **not** available in the
local artifacts. A scan of every retained `.txt` export (Downloads and Desktop)
found zero Venus tokens, and every `colony` occurrence is a card name
(e.g. *Ganymede Colony*, *Interstellar Colony Ship*), not a Colonies-expansion
mechanic. There is therefore no real positive Venus/Colonies game to sanitize.

Per the data-integrity rules, a Venus/Colonies game is **not** passed off as a
retained real export to fill this gap. The authoritative positive grammar
evidence is the pinned `upstream-venus-colonies-action-fragment.txt`
(source-backed rather than invented). The Step 4.3 remediation additionally
added the explicitly labelled `synthetic-but-format-faithful` full exports
above so complete-game positive states are exercised end to end; they are
constructed test corpora, never evidence about any real game. When a real
Venus/Colonies export becomes available it should be sanitized and committed
here as the preferred positive corpus.
