# Guest Player Identity, Registration Claim, and Public Name Privacy

## Status

This document is a cross-phase redesign contract.

It governs:

- manual game entry
- imported game entry
- guest player creation
- player identity resolution
- registration
- onboarding
- account claiming
- public player presentation
- historical game presentation
- player statistics
- public data contracts
- exports and metadata

A phase-specific instruction may add stricter requirements.

A phase-specific instruction must not weaken this contract.

## Required identity lifecycle

> **SUPERSEDED IN PART — recorded 2026-07-24 by
> `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL` under owner ruling R-18. The numbered
> lifecycle below is retained in full, not deleted or reworded; this note states only
> which of its steps no longer govern, and it reaches no further than the two named
> here.** **Step 2**, which identifies an unlinked guest "using either: a username, or
> first name and last name", and **step 6**, which has registration search "normalized
> registered first-and-last name against approved private guest name information or a
> private name alias", both **give way** to the identity model recorded in
> `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — replacement player-identity,
> account, and vouching model (decision record: D-1–D-49), 2026-07-23": **D-1**, **D-3**,
> **D-4**, **D-36**, **D-37**, **D-40** and **D-41**. The ruling that makes the model
> govern here, and that records what it does **not** reach, is
> `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — owner ruling R-18 on the
> governing-document conflicts with the identity model, 2026-07-24". **Read those
> decisions where they live; their content is deliberately not restated here** (process
> rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home
> process rules").

TM Stats supports player identities that may exist before the person creates a
registered account.

The required lifecycle is:

1. A manually entered or imported game contains a player who cannot be matched
   confidently to an existing registered player or existing guest.

2. The game logger identifies that player as an unlinked guest using either:

   - a username, or
   - first name and last name

3. The game and all player-associated records reference that guest player ID.

4. Later games reuse the same guest player ID when the approved matching rules
   establish and confirm the identity.

5. The person later registers an account.

6. Registration searches eligible unlinked guest identities using either:

   - normalized registered username against an approved guest username or
     username alias, or
   - normalized registered first-and-last name against approved private guest
     name information or a private name alias

7. The registrant reviews and explicitly confirms the intended identity.

8. The existing player identity is linked to the registered account.

9. Historical games and statistics remain attached to the same player ID.

10. Public presentation changes to the registered username.

Do not replace this lifecycle with copying history to a new player record when
the existing player identity can be linked directly.

## Identity categories

The application must distinguish:

- linked registered player
- existing unlinked guest
- newly created unlinked guest
- unresolved player
- ambiguous player match
- deleted or unavailable player
- inaccessible player
- claim candidate
- claimed player
- claim conflict

Do not treat every unmatched player as a new guest.

Do not display an unlinked guest as a registered account.

## Guest identity modes

> **SUPERSEDED IN PART — recorded 2026-07-24 by
> `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL` under owner ruling R-18. Everything
> below is retained in full, not deleted or reworded; this note states only which parts
> no longer govern, and it reaches no further than the two named here.** The sentence
> **"A new guest may be entered using one of two explicit identity modes"** and the
> **"First-and-last-name mode"** subsection below, in its entirety, **give way** to the
> identity model recorded in `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 —
> replacement player-identity, account, and vouching model (decision record: D-1–D-49),
> 2026-07-23": **D-1**, **D-2**, **D-3**, **D-4** and **D-37**. The same supersession is
> recorded again at that subsection's own heading. The ruling that makes the model govern
> here, and that records what it does **not** reach, is `docs/redesign/DECISIONS.md` →
> "Phase 4 Step 4.3 — owner ruling R-18 on the governing-document conflicts with the
> identity model, 2026-07-24". **Read those decisions where they live; their content is
> deliberately not restated here** (process rule **P-2**,
> `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home process
> rules").

A new guest may be entered using one of two explicit identity modes.

### Username mode

The game logger provides:

- guest username

Requirements:

- preserve the entered username
- preserve a separately normalized username
- do not fabricate first name
- do not fabricate last name
- do not split the username into personal-name fields
- check for eligible existing guests before creating a new identity
- retain original import evidence where applicable

### First-and-last-name mode

> **SUPERSEDED — recorded 2026-07-24 by `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL`
> under owner ruling R-18. This subsection is retained in full, not deleted or reworded;
> this note records that it no longer governs, and it reaches no further than this
> subsection.** It **gives way** to the identity model recorded in
> `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — replacement player-identity,
> account, and vouching model (decision record: D-1–D-49), 2026-07-23": **D-1**, **D-2**,
> **D-3**, **D-4** and **D-37**. The ruling that makes the model govern here, and that
> records what it does **not** reach, is `docs/redesign/DECISIONS.md` → "Phase 4 Step
> 4.3 — owner ruling R-18 on the governing-document conflicts with the identity model,
> 2026-07-24". **Read those decisions where they live; their content is deliberately not
> restated here** (process rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict
> handling and canonical-home process rules").

The game logger provides:

- first name
- last name

Requirements:

- preserve both components structurally when the authorized data model supports
  them
- preserve a suitable guest display label
- preserve a separately normalized private full-name match value
- do not fabricate a username
- check for eligible existing guests before creating a new identity
- retain original import evidence where applicable

A single unlabeled value must not ambiguously mean either username or personal
name.

The user must explicitly select or the source format must explicitly establish
the identity mode.

## Existing guest reuse

Before creating a new guest:

1. Resolve the applicable group.
2. Search eligible players within that group.
3. Match according to the selected identity mode.
4. Return exact matches and ambiguous candidates distinctly.
5. Require explicit resolution when more than one candidate is plausible.
6. Revalidate the selected player before persistence.
7. Reuse the existing player ID when confirmed.

Do not create duplicates because of:

- capitalization
- punctuation
- leading or trailing whitespace
- repeated internal whitespace
- harmless display formatting

Do not introduce broad fuzzy matching that can join unrelated people.

Partial matching may suggest candidates.

Partial matching must never automatically link or claim an identity.

## Username and personal-name separation

> **SUPERSEDED IN PART — recorded 2026-07-24 by
> `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL` under owner ruling R-18. Everything
> below is retained in full, not deleted or reworded; this note states only which part no
> longer governs, and it reaches no further than the one sentence named here.** The
> sentence **"Username matching and personal-name matching are separate concepts"**
> **gives way** to the identity model recorded in `docs/redesign/DECISIONS.md` → "Phase 4
> Step 4.3 — replacement player-identity, account, and vouching model (decision record:
> D-1–D-49), 2026-07-23": **D-1**, **D-4**, **D-8**, **D-40** and **D-41**. The ruling
> that makes the model govern here, and that records what it does **not** reach — in
> particular over the personal-name data already stored — is
> `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — owner ruling R-18 on the
> governing-document conflicts with the identity model, 2026-07-24". **Read those
> decisions where they live; their content is deliberately not restated here** (process
> rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home
> process rules").

Username matching and personal-name matching are separate concepts.

Use separate centralized normalization and comparison utilities.

Username matching must not inherit personal-name partial matching behavior.

Personal-name matching must not treat username punctuation or formatting as
evidence of a personal-name match.

Missing username must remain missing.

Missing first name must remain missing.

Missing last name must remain missing.

Do not convert missing identity information into an empty value that
participates in matching.

## Registration-time candidate lookup

> **SUPERSEDED IN PART — recorded 2026-07-24 by
> `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL` under owner ruling R-18. Everything
> below is retained in full, not deleted or reworded; this note states only which parts no
> longer govern, and it reaches no further than the two named here.** The requirement that
> **registration search eligible unlinked guests using both the registered username and
> "the registered first and last name"**, and the **"one exact private-name candidate"**
> entry in the list of shapes candidate lookup may return, **give way** to the identity
> model recorded in `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — replacement
> player-identity, account, and vouching model (decision record: D-1–D-49), 2026-07-23":
> **D-1**, **D-3**, **D-4**, **D-36**, **D-37** and **D-41**. The ruling that makes the
> model govern here, and that records what it does **not** reach, is
> `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — owner ruling R-18 on the
> governing-document conflicts with the identity model, 2026-07-24". **Read those
> decisions where they live; their content is deliberately not restated here** (process
> rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home
> process rules").

Registration must search eligible unlinked guests using both:

1. the registered username; and
2. the registered first and last name.

Candidate lookup may return:

- one exact username candidate
- one exact private-name candidate
- multiple candidates
- partial suggestions
- no candidate

A textual match must not automatically claim a player.

The registrant must explicitly confirm the identity.

The registrant must be able to:

- choose one legitimate candidate
- choose among multiple candidates
- decline all candidates
- continue when no candidate exists
- recover when a candidate has been claimed
- recover when a candidate has been deleted
- recover when a candidate is no longer eligible

## Claim eligibility

A player identity is claimable only when:

- the registrant is authenticated
- the player identity exists
- the player identity is not linked to another account
- the candidate satisfies the approved username or private-name rules
- the submitted candidate is the same candidate shown to the user
- group and authorization requirements are satisfied

The server must revalidate claim eligibility at submission time.

Do not rely only on candidate eligibility calculated when the page loaded.

Prevent duplicate submission and concurrent claims.

One player identity must not be linked to multiple accounts.

## Successful claim effects

A successful claim must:

- preserve the existing player ID
- link the player identity to the authenticated user
- preserve every historical game-player reference
- preserve historical statistics
- preserve corporations
- preserve Preludes
- preserve milestones and awards
- preserve score records
- preserve style and card records
- preserve notes and evidence
- preserve import provenance
- add or preserve the appropriate group membership
- set or offer the associated active group according to approved onboarding
  behavior
- continue to the intended post-registration destination
- avoid creating a replacement player record

## Claimed-player public name rule

A claimed player's public identity is the registered username or another
explicitly approved public handle.

A claimed player's private personal name must not appear publicly.

Private personal-name data includes:

- first name
- last name
- full name
- normalized full name
- normalized first name
- normalized last name
- private personal-name aliases
- original private registration name
- private matching values derived from personal names

Do not use private personal-name data as a public fallback.

When the registered username cannot be resolved, use a privacy-safe neutral
fallback such as:

- Player
- Unknown player
- Unavailable player

Do not fall back to:

- first name
- last name
- full name
- registration email
- authentication ID
- private claim alias
- imported private personal name

## Public surfaces

Private personal-name data must not appear in:

- public player profiles
- public profile headings
- leaderboards
- public game history
- public game summaries
- public game-detail pages
- historical public game listings
- public statistics
- public insights
- public comparisons
- search results
- public activity feeds
- public APIs
- unauthenticated RPC responses
- public database views
- public exports
- public datasets
- page titles
- URL slugs
- Open Graph metadata
- social-sharing metadata
- structured metadata
- image alternative text
- public cache keys
- analytics event properties
- browser-visible logs
- user-visible error messages

Private names must be excluded from the returned payload.

Hiding a private name with CSS is not sufficient.

Removing a private name only after hydration is not sufficient.

Sending a private name to the browser but not rendering it is not sufficient.

## Public player-name resolver

Use one centralized typed public player-name resolver.

The resolver must distinguish:

- linked claimed player
- unlinked guest
- deleted account
- unavailable registered profile
- inaccessible player
- unresolved player

For a linked claimed player, the resolver may return only:

- registered username, or
- another explicitly approved public handle

It must never return:

- user profile full name
- private first name
- private last name
- normalized personal name
- private personal-name alias
- email address
- authentication identifier

Do not allow individual pages to independently decide which player-name field
to display.

The same public resolver must govern:

- leaderboard
- public profile
- game history
- game detail
- insights
- comparisons
- search
- exports
- metadata generation
- public API serialization

## Historical-game privacy

Claiming must preserve the original player ID.

Historical public pages must resolve the claimed player's current registered
username through that player ID.

Do not continue publicly showing the pre-claim guest personal name merely
because it remains stored as:

- player display name
- original import evidence
- claim alias
- historical snapshot
- denormalized source data

Private source evidence may retain the original imported personal name when
needed for audit or provenance.

Private evidence must remain behind the appropriate authenticated and
authorized boundary.

Do not destroy private source evidence solely to prevent public display.

Separate private evidence from public presentation.

## Claim candidate privacy

Registration-time claim matching may privately use:

- registered username
- first name
- last name
- normalized private personal name
- approved private aliases

Claim candidates may be shown only to the authenticated registrant within the
protected claim workflow.

Candidate-search responses must not be:

- publicly accessible
- indexable
- publicly cacheable
- available through unauthenticated endpoints
- returned to unrelated authenticated users

Expose only the minimum information required to distinguish legitimate
candidates.

## Data-boundary requirements

Private personal-name fields must not be included in:

- public repository return types
- public serializers
- public route loaders
- client DTOs used for public pages
- browser hydration data
- public metadata generators
- public database views
- public RPC return types
- analytics payloads
- telemetry
- public exports

Use explicit column selection.

Do not use broad identity selections such as:

- select('*')
- returning complete user-profile records
- serializing complete player identity records

when only the public username is required.

Do not put private names into:

- query parameters
- URLs
- browser storage
- cache keys
- console output
- exception messages
- analytics events
- client-side source maps or fixtures

## Import evidence

Original imported player text may contain a private personal name.

Preserve it only where required for:

- audit
- provenance
- correction
- dispute resolution
- authorized import review

Do not use original imported personal-name evidence as the public identity after
a claim.

Do not expose private import evidence through public game data.

## Security requirements

Identity lookup and claiming must use authorized server-side operations.

Do not:

- trust a client-supplied linked-user ID
- allow arbitrary player IDs to be claimed
- allow already-linked identities to be claimed
- bypass RLS
- expose service-role credentials
- expose unrelated private groups
- expose unrelated private games
- expose private names to unauthenticated users
- allow client-side direct mutation of ownership fields

## Cross-phase ownership

> **SUPERSEDED IN PART — recorded 2026-07-24 by
> `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL` under owner ruling R-18. Both ownership
> lists below are retained in full, not deleted or reworded; this note states only which
> entries no longer govern, and it reaches no further than the two named here.** The Phase
> 4 entry **"explicit username or first-and-last-name identity mode"** and the
> registration-and-onboarding entry **"first-name and last-name collection"** **give way**
> to the identity model recorded in `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 —
> replacement player-identity, account, and vouching model (decision record: D-1–D-49),
> 2026-07-23": **D-1**, **D-3**, **D-4** and **D-37**. Neither phase's remaining ownership
> is altered by this note. The ruling that makes the model govern here, and that records
> what it does **not** reach, is `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — owner
> ruling R-18 on the governing-document conflicts with the identity model, 2026-07-24".
> **Read those decisions where they live; their content is deliberately not restated
> here** (process rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict handling and
> canonical-home process rules").

Phase 4 manual-entry and import work owns:

- unmatched-player resolution
- existing-guest reuse
- new guest creation
- explicit username or first-and-last-name identity mode
- original source evidence
- imported provenance
- future claimability
- separation of private match data from public display data

Registration and onboarding work owns:

- registration username collection
- first-name and last-name collection
- candidate lookup
- candidate presentation
- explicit claim confirmation
- claim conflict handling
- account-to-player linking
- group membership effects
- active-group behavior
- post-registration continuation
- public switch to registered username

Phase 4 must not automatically claim a guest.

Registration must not create a duplicate player when a confirmed guest can be
linked.

Neither phase may weaken the privacy contract.

## Data-model governance

Before implementation, audit:

- players
- user profiles
- game players
- group membership
- claim aliases
- identity normalization
- public serializers
- public views
- public RPC functions
- public route loaders
- metadata generation
- exports
- RLS
- claim functions

Do not assume one display-name field can safely serve both:

- private personal-name matching
- public player presentation

Do not create or apply a migration without explicit authorization.

When the current data model cannot safely preserve the identity and privacy
requirements:

1. stop before implementing a presentation-only workaround;
2. document the exact limitation;
3. propose the minimal schema change;
4. document normalization;
5. document uniqueness;
6. document RLS;
7. document public and private serializers;
8. document migration and rollback;
9. request explicit migration authorization.

## Required tests

> **SUPERSEDED IN PART — recorded 2026-07-24 by
> `CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL` under owner ruling R-18. Every test
> below is retained in full, not deleted or reworded; this note states only which required
> tests no longer govern, and it reaches no further than the three named here.** Under
> "Guest creation and reuse", **"unmatched imported player entered with first and last
> name"** and **"unmatched manually entered player entered with first and last name"**;
> and under "Registration claim", **"exact private-name candidate"**. All three test the
> identification and matching mechanism superseded elsewhere in this document, and they
> **give way** with it, to the identity model recorded in `docs/redesign/DECISIONS.md` →
> "Phase 4 Step 4.3 — replacement player-identity, account, and vouching model (decision
> record: D-1–D-49), 2026-07-23": **D-1**, **D-3**, **D-4**, **D-36** and **D-37**. The
> ruling that makes the model govern here, and that records what it does **not** reach —
> in particular the "Public privacy" tests, which are outside it — is
> `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — owner ruling R-18 on the
> governing-document conflicts with the identity model, 2026-07-24". **Read those
> decisions where they live; their content is deliberately not restated here** (process
> rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home
> process rules").

Test at minimum:

### Guest creation and reuse

- unmatched imported player entered with username
- unmatched imported player entered with first and last name
- unmatched manually entered player entered with username
- unmatched manually entered player entered with first and last name
- exact existing guest reused
- ambiguous guest requires explicit selection
- original player ID is preserved
- duplicate guest is not created

### Registration claim

- exact username candidate
- exact private-name candidate
- multiple candidates
- no candidate
- registrant declines all candidates
- successful claim preserves original player ID
- duplicate claim submission is safe
- concurrent claims are safe
- candidate claimed before confirmation
- candidate deleted before confirmation
- already-linked identity cannot be claimed
- authentication-confirmation return path is preserved

### Historical identity

- historical games remain attached
- historical statistics remain attached
- group membership is added or preserved
- active-group behavior is correct
- no replacement player is created

### Public privacy

- claimed player appears publicly by username
- claimed full name does not appear on leaderboard
- claimed full name does not appear in public game history
- claimed full name does not appear on public game detail
- claimed full name does not appear on public profiles
- claimed full name does not appear in public insights
- claimed full name does not appear in public comparisons
- claimed full name does not appear in public search
- claimed full name does not appear in metadata
- claimed full name does not appear in public API payloads
- claimed full name does not appear in public RPC payloads
- claimed full name does not appear in public exports
- claimed full name does not appear in hydration data
- claimed full name does not appear in browser-rendered source
- claimed full name does not appear in logs or analytics payloads
- missing username uses a neutral fallback
- missing username never falls back to private personal name
- private import evidence remains inaccessible publicly
- unauthorized users cannot enumerate claim candidates

Privacy tests must inspect serialized payloads and rendered output using known
test personal names.

A passing visual inspection alone is insufficient.

Use local, isolated, or dedicated test data.

Do not mutate production identities during validation.
