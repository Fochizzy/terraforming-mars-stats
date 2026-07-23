---
name: tm-identity-privacy
description: Use whenever TM Stats player identity is read, created, resolved, matched, claimed, serialized, exported, logged, or displayed — any repository function, view, RPC, route loader, server action, DTO, chart label, leaderboard row, profile surface, or import review that touches a player name. Covers private personal names versus the public username, exclusion rather than concealment, keeping username and personal-name matching separate, and what a registration claim must preserve. Fires on: player name, username, first name, last name, full name, guest player, unlinked guest, claim a player, registration, match players, display a name, who played this game, export or log identities.
---

# Player identity and name privacy

This skill is procedure. It authorizes nothing — in particular it does not
authorize a schema change, a migration, or any mutation of production identities,
each of which needs its own explicit authorization.

The authoritative cross-phase contract is
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`, routed as a
primary contract from `docs/AUTHORITATIVE_DOCUMENTS.md`. Read it there. This skill
tells you when to reach for it and what to check; it is not a summary of it and
never overrides it.

An instruction may add **stricter** requirements than that contract and may never
weaken it — see its `## Status` section. That applies to this skill too: where
anything here reads as more permissive than the contract, the contract is right
and this file is wrong.

## 1. Ask the boundary question first

**Can this value reach a client?** Public pages, route loaders, client DTOs,
hydration data, metadata, public views and RPC return types, analytics payloads,
telemetry, exports — if yes, private personal-name fields must not be in the
payload at all.

**Exclusion, not concealment.** Removing a name from the rendered output while it
still travels in the response is not compliance. The value is still in the
hydration blob, the network tab, the cache entry, and anything that logs the
response. The enumerated sinks — including query parameters, URLs, browser
storage, cache keys, console output, exception messages, and fixtures — are listed
at `## Data-boundary requirements` in the contract.

Select columns explicitly. A broad identity select, a returned full profile row,
or a serialized complete identity record puts private fields on the wire even when
the UI only needs the username.

## 2. Missing username stays missing

Never fall back to a personal name when the username is absent. Render the
explicit missing state instead. A fallback is exactly the leak the contract
exists to prevent, and it fires precisely for the accounts least likely to be
noticed in review.

After a successful claim the registered username is the public identity. The rule
and the resolver's obligations are at `## Claimed-player public name rule` and
`## Public player-name resolver`.

## 3. Keep the two matching mechanisms separate

Username matching and personal-name matching are different concepts with separate
centralized normalization and comparison utilities. Do not let username matching
inherit personal-name partial-matching behaviour, and do not let punctuation or
formatting in a username count as personal-name evidence. See
`## Username and personal-name separation`.

Missing identity fields stay missing and must not become empty values that
participate in matching — an empty string that matches everything is a
fabrication with a privacy consequence. This is the identity case of
`tm-no-fabrication`.

## 4. Claims preserve the player

A guest may exist unlinked before registration and may be identified by username
or by first and last name. A claim must be explicitly confirmed, and a successful
claim **preserves the existing player ID** so historical games and statistics stay
attached to it. Conditions and effects: `## Claim eligibility`,
`## Successful claim effects`, `## Claim candidate privacy`, and
`## Historical-game privacy`.

## 5. Checks to actually run

- Trace the value to the boundary. Read the repository function that produces the
  payload — for example `src/lib/db/import-player-identity-repo.ts` — rather than
  assuming what a caller receives.
- Grep the serialization path for broad selects and for private field names before
  you conclude a payload is clean.
- **A permission error on a direct identity read is a boundary, not a bug.** Some
  identity tables are deliberately not readable through the data API. Use the
  reader the repository exposes. Do not re-grant, and do not route around it with
  a more privileged client — the privilege is not what is blocking you.
- Cover it with tests. The contract enumerates what must be tested at
  `## Required tests`.

## 6. Boundaries on changing any of this

Schema and migration changes to identity require separate explicit authorization
(`## Data-model governance`), and production identities must not be mutated during
validation. Security expectations are at `## Security requirements`; the
non-negotiable summary lives at `docs/redesign/MASTER-RULES.md` →
`## Guest player identity and claimed-name privacy`.
