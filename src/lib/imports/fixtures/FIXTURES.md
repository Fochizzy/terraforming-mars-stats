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

## Known real-fixture gap: Venus / Colonies positive exports

A complete **real** Venus Next or Colonies export is **not** available in the
local artifacts. A scan of every retained `.txt` export (Downloads and Desktop)
found zero Venus tokens, and every `colony` occurrence is a card name
(e.g. *Ganymede Colony*, *Interstellar Colony Ship*), not a Colonies-expansion
mechanic. There is therefore no real positive Venus/Colonies game to sanitize.

Per the data-integrity rules, a Venus/Colonies game is **not** fabricated to
fill this gap. The authoritative positive evidence is the pinned
`upstream-venus-colonies-action-fragment.txt`, which is source-backed rather than
invented. When a real Venus/Colonies export becomes available it should be
sanitized and committed here, replacing the fragment as the positive corpus.
