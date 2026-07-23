# Verification Report

> ## ⚠️ INSTALL-TIME CORRECTION BANNER — READ BEFORE ACTING ON THIS REPORT
>
> This banner was added when the pack was installed into
> `docs/redesign/phases/`. It is the only change made to this document; the
> **File inventory table below is retained verbatim and was not edited**.
>
> **EIGHT inventory rows are deliberately superseded and no longer match the
> installed files.** The `PASS` result and the Lines/Bytes/SHA-256 columns for
> these eight phases describe the pre-install Word-derived artifacts, **not**
> what was installed. Do **not** "repair" the installed files to match this
> table — doing so would destroy the owner's Elo leaderboard work and all seven
> carried repo-native sections.
>
> | Phase | File | Why superseded | Installed lines/bytes | Table lines/bytes |
> | ---: | --- | --- | ---: | ---: |
> | 5  | `05-games-detail-and-replay.md`   | merged with repo-native content | 991 / 73616 | 891 / 68228 |
> | 7  | `07-leaderboard.md`               | owner's Elo version replaces the Word original | 909 / 51534 | 743 / 52272 |
> | 8  | `08-global-insights.md`           | merged with repo-native content | 759 / 55936 | 736 / 55153 |
> | 9  | `09-individual-insights.md`       | merged with repo-native content | 843 / 56362 | 821 / 55708 |
> | 10 | `10-group-insights.md`            | merged with repo-native content | 886 / 59972 | 866 / 59290 |
> | 11 | `11-compare.md`                   | merged with repo-native content | 819 / 59160 | 795 / 58443 |
> | 12 | `12-improvement.md`               | merged with repo-native content | 718 / 48585 | 689 / 47777 |
> | 13 | `13-card-and-tag-analytics.md`    | merged with repo-native content | 728 / 44380 | 652 / 42403 |
>
> Seven rows (5, 8, 9, 10, 11, 12, 13) were hand-merged so pre-existing
> repository content survives; each carries a `**Provenance:** this section is
> REPO-NATIVE` marker. Row 7 is the owner's Elo-based leaderboard version, which
> replaces the Word original. The remaining eight rows (6, 14, 15, 16, 17, 18,
> 19, 20) were installed byte-identical to the artifacts this table describes and
> still match it. Without this banner the document self-attests `PASS` while
> failing its own inventory check for the eight superseded rows.

## Result

**PASS.** The expanded Markdown pack preserves the Word guide content and source order for Phases 5–20 while adding only nested execution stages.

## Verification performed

- Confirmed all 16 phase files were generated with the required repository filenames.
- Confirmed every source Phase 5–20 Heading 2 section, paragraph, checklist item, and table-cell segment is present in the corresponding Markdown file.
- Confirmed every source Heading 3 work item remains in the same order.
- Confirmed the Phase 6 working sequence remains 6.1 through 6.6 with its exact source scope text.
- Confirmed the unnumbered Phase 7 Win point differential analysis remains between source steps 3 and 4.
- Confirmed the unnumbered Phase 20 Validate win point differential analytics heading remains between source steps 7 and 9 rather than being silently renumbered.
- Confirmed no Appendix content was pulled into Phase 20.
- Parsed every Markdown file with a CommonMark parser with table support.
- Scanned for common mojibake markers and replacement characters; none were found.
- Tested the final ZIP archive with `unzip -t`; no compressed-data errors were found.

## File inventory

| Phase | File | Lines | Bytes | Source work headings | SHA-256 |
| ---: | --- | ---: | ---: | ---: | --- |
| 5 | `05-games-detail-and-replay.md` | 891 | 68228 | 9 | `36aa6e2adad91b395162ddeaad9c6f75ea4d4fce2b07498a5b2e19c3bd43a664` |
| 6 | `06-my-profile.md` | 541 | 48494 | 6 | `60b16888b0e741cefddf14cfc0d9ef006ac6db67d6d8c40e88e8cafee76467f5` |
| 7 | `07-leaderboard.md` | 743 | 52272 | 8 | `102c5e75604c004b85baa4f45ed316bf8214acbba81314ac13a866a92cf87040` |
| 8 | `08-global-insights.md` | 736 | 55153 | 8 | `80d01d7bdf7e0d10a18fc57319e72cca5c07d05bbe4cfea4723bceb3f1b82932` |
| 9 | `09-individual-insights.md` | 821 | 55708 | 8 | `742732df66ebfef2f3da2713b5a5c905045a6b31e81e432c223b80c8619d2097` |
| 10 | `10-group-insights.md` | 866 | 59290 | 9 | `e8f4bffd4c53a88e6a251190b574773d3a59fb779ace5e3767745d4e98eb23f1` |
| 11 | `11-compare.md` | 795 | 58443 | 8 | `ad799bf5c0376dbb183a36adf0cfeef97cee4ca45f0f0029be2cb11fdf92d436` |
| 12 | `12-improvement.md` | 689 | 47777 | 6 | `23c91b0c7ce874017a00d8f2351235b6b28c725f746a0c296833c01a792c358f` |
| 13 | `13-card-and-tag-analytics.md` | 652 | 42403 | 6 | `3c4fe476d259bce624a84be637e2f8cd8630cc2c12f95cf970c2dcd9d19ad92e` |
| 14 | `14-corporation-and-prelude-analytics.md` | 637 | 43255 | 6 | `195eb0ef03a8c8b2667297805ca205c93e77a37dd99d6fd389c7b35f7c967f3e` |
| 15 | `15-scoring-and-play-style.md` | 757 | 51147 | 7 | `8bac715b7043a7f3f183c2c28dc6289a9914f8f033d7e587d9fe7972d9a27822` |
| 16 | `16-engine-state-tempo-and-conditions.md` | 871 | 63612 | 9 | `780775ebde127758c8d56f56e6bfa0fcdff285db64e0c907049022a9121abe5f` |
| 17 | `17-competition-and-board.md` | 623 | 41343 | 5 | `cf235b132f62fa56fec8d8d4eb816fa27955041ec751fccbb3f71db5e1f774b7` |
| 18 | `18-objectives-endgame-and-chemistry.md` | 580 | 35266 | 5 | `ae64ed00e7f5f65d6562ef10a393d0759fe48c43942836cf1df56f72c498bf19` |
| 19 | `19-compare-and-improvement-expansion.md` | 665 | 45092 | 6 | `01b87cb4fd876e9f1ccf7db6260fe0dc98922191a400e6f6fac3f73dd737c79d` |
| 20 | `20-release-hardening.md` | 1085 | 81296 | 10 | `9093d16041bff032b4a90303fa78435f905072766e46198c128bd092949407a5` |

## Scope boundary

The verification confirms source preservation and Markdown/package integrity. It does not claim that any planned phase has been implemented in the TM Stats repository, run against production, migrated, pushed, or deployed.
