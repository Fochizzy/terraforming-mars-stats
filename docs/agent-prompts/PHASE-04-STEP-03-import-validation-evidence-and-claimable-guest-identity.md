You are continuing the TM Stats redesign project.

# Current assignment

Complete only:

Phase 4, Step 4.3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Import, Validation, Evidence Review, and Claimable Guest
Identity Creation

Steps 4.1 and 4.2 must already be complete.

Step 4.2 was completed before the claimable guest identity and claimed-name
privacy requirements were introduced.

Do not reopen, rewrite, amend, or recommit Step 4.2 solely to add these later
requirements.

Do not begin:

- registration-time account claiming
- Step 4.4
- Step 4.5
- Phase 5
- any later redesign work

TM Stats is a responsive website, not a mobile application.

# Governing authority

Use this order:

1. this explicit assignment
2. docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md
3. docs/redesign/MASTER-RULES.md
4. docs/REDESIGN_STATE.md
5. docs/redesign/phases/04-log-a-game.md
6. docs/redesign/DECISIONS.md
7. the completed Step 4.2 handoff
8. the completed Step 4.1 handoff
9. the completed Phase 3 closure handoff
10. docs/redesign/MASTER-PLAN.md
11. docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx

If a completed handoff conflicts with the private-name or player-ID preservation
requirements, stop before editing and report the conflict.

Do not treat the absence of these later requirements from the Step 4.2 handoff
as a conflict.

# Required identity lifecycle

Step 4.3 owns only the import side of this lifecycle:

1. An import contains an unmatched player.
2. The importer may identify the player using:
   - username, or
   - first name and last name.
3. The workflow reuses an eligible existing guest or creates a new unlinked
   guest.
4. The imported game references that player ID.
5. Original source evidence is preserved privately.
6. The player remains suitable for a later registration claim.

A later registration assignment owns:

- candidate lookup
- candidate confirmation
- account linking
- group membership effects
- active-group behavior
- public display switching to registered username

Do not implement account claiming during this step.

# Objective

Redesign the import workflow while preserving:

- existing import routes
- accepted import sources and formats
- parser behavior
- normalization behavior
- validation
- warnings
- evidence
- provenance
- field coverage
- draft save and resume
- group context
- authentication
- authorization
- missing-versus-zero semantics
- finalization compatibility

Also establish safe claimable guest creation and reuse.

# Required preflight

Before editing:

1. Confirm the redesign worktree path.
2. Confirm branch redesign/tm-stats-dashboard-rebuild.
3. Confirm a clean worktree.
4. Confirm Steps 4.1 and 4.2 are complete.
5. Read all governing documents.
6. Read the Step 4.1 and Step 4.2 handoffs.
7. Verify both completion commits.
8. Inspect every import route and compatibility route.
9. Inspect every accepted source and parser.
10. Inspect import normalization, validation, warnings, evidence, and coverage.
11. Inspect players, user profiles, game players, and group membership.
12. Inspect current player identity fields.
13. Inspect current linked-user behavior.
14. Inspect username persistence and normalization.
15. Inspect first-name, last-name, and full-name persistence.
16. Inspect alias support.
17. Inspect uniqueness constraints and indexes.
18. Inspect player-resolution repositories and server actions.
19. Inspect current claim-candidate and claim operations.
20. Inspect RLS and server authorization.
21. Inspect public player DTOs and serializers.
22. Inspect public route loaders.
23. Inspect public RPC and view return types.
24. Inspect leaderboard, profiles, game history, game detail, insights,
    comparisons, search, exports, and metadata generation.
25. Search for direct public use of:
    - full_name
    - first_name
    - last_name
    - display_name
    - normalized personal-name values
26. Inspect client hydration and public API payloads.
27. Run relevant existing import, identity, privacy, authorization, route, draft,
    and regression tests.

Return a preflight report containing:

- directory
- branch
- worktree state
- Step 4.1 and Step 4.2 commits
- import routes and formats
- parser architecture
- player identity architecture
- username persistence
- personal-name persistence
- alias support
- normalization rules
- uniqueness rules
- RLS and authorization
- public player-name resolution
- public DTO and serializer behavior
- every known direct public personal-name exposure
- whether the current schema supports safe claimability
- whether the current architecture supports private/public separation
- whether a migration is required
- expected files to change
- preservation risks

Do not edit until the preflight report is complete.

# Schema and migration boundary

This assignment does not authorize:

- new columns
- new tables
- new views
- new indexes
- new RPC functions
- RLS changes
- migration creation
- migration application
- production backfills

If the current model cannot safely preserve:

- optional guest username
- optional guest first name
- optional guest last name
- separate normalized username
- separate normalized personal name
- private aliases
- public username-only presentation after claim

stop before implementing a workaround.

Report:

- the exact limitation
- affected tables and code
- the minimal proposed schema
- normalization requirements
- uniqueness requirements
- RLS requirements
- public/private serializers
- migration and rollback requirements
- historical compatibility
- tests required

Leave Step 4.3 active and request explicit migration authorization.

Do not overload a single display-name field with incompatible private and public
semantics merely to avoid a migration.

# Import player states

The UI and typed state must distinguish:

- linked registered player
- existing unlinked guest
- newly created unlinked guest
- unresolved player
- ambiguous match
- invalid identity input
- duplicate guest candidate
- inaccessible identity
- unavailable identity

Do not silently create a guest for every unmatched result.

Do not silently select an ambiguous identity.

# Guest username mode

When username mode is selected:

- require the approved username input
- preserve the original username
- preserve separate username normalization
- search eligible existing guests
- show exact and ambiguous candidates separately
- reuse the confirmed guest player ID
- create a new unlinked guest only when no appropriate identity is confirmed
- do not fabricate first name or last name
- do not interpret the username as a personal name

# Guest first-and-last-name mode

When personal-name mode is selected:

- require first name
- require last name unless approved rules explicitly support another structure
- preserve both values privately and structurally when authorized
- preserve separate private-name normalization
- search eligible existing guests
- show exact and ambiguous candidates separately
- reuse the confirmed guest player ID
- create a new unlinked guest only when no appropriate identity is confirmed
- do not fabricate a username

Do not use one unlabeled text field that can ambiguously mean username or
personal name.

# Existing guest reuse

Before guest creation:

1. resolve the group;
2. search eligible identities in that group;
3. compare using the selected identity mode;
4. distinguish exact and ambiguous candidates;
5. require explicit resolution for ambiguous candidates;
6. revalidate before persistence;
7. reuse the existing player ID when confirmed.

Prevent duplicates caused only by capitalization, punctuation, or whitespace.

Do not introduce broad fuzzy matching.

# Evidence and provenance

Preserve:

- original imported player text
- source format
- parser identity
- selected player ID
- guest creation or reuse decision
- selected identity mode
- normalized imported value
- correction history where already supported
- imported-versus-user-corrected state

Private original personal-name evidence may be retained for authorized audit and
claiming.

It must not become public display data after a claim.

Escape imported content.

Do not render imported HTML as executable content.

# Claimed-player privacy preservation

Step 4.3 must maintain a strict separation between:

- private identity-matching information
- private original source evidence
- approved public display identity

A future claimed player must appear publicly by registered username.

The claimed player's first name, last name, full name, normalized personal name,
and private personal-name aliases must not appear publicly.

Audit public use in:

- leaderboards
- public profiles
- game history
- game detail
- public statistics
- insights
- comparisons
- search
- public APIs
- public RPCs
- public database views
- exports
- page metadata
- social metadata
- structured metadata
- hydration payloads
- analytics events
- browser-visible logs
- user-visible errors

Private names must be omitted from public payloads.

Do not send private names to the browser and hide them with CSS.

Do not use private names as a fallback when username is unavailable.

Use a neutral privacy-safe fallback.

Do not change historical player IDs merely to change public presentation.

# Public player-name resolution

Audit whether one centralized typed public player-name resolver exists.

For a linked claimed player, public resolution must return only:

- registered username, or
- another explicitly approved public handle.

It must never return:

- profile full name
- first name
- last name
- normalized personal name
- private alias
- email
- authentication identifier

Do not create separate display-field rules in each page.

When a complete resolver cannot be implemented within Step 4.3 without
broadening scope, document the gap as a required registration/privacy follow-up.

Do not introduce a partial resolver that still exposes private names through
other public surfaces.

# Parsing and validation

Preserve existing parser semantics.

Keep distinct:

- parse failure
- structural error
- missing player identity
- invalid username
- invalid first name
- invalid last name
- ambiguous match
- unresolved player
- duplicate guest candidate
- warning
- coverage notice
- finalization-blocking error

Parser success does not imply player-resolution success.

Do not convert missing values into empty identities.

# Required tests

Add focused tests for:

## Import and guest identity

- unmatched player entered with username
- unmatched player entered with first and last name
- linked player resolution
- existing guest reuse
- new guest creation
- ambiguous match
- unresolved player
- invalid identity input
- duplicate prevention
- player ID preserved through imported draft save and resume
- original source evidence preserved
- username and personal-name semantics remain separate

## Privacy contracts

Use known test full names and verify that they do not appear in:

- leaderboard output
- public profile output
- game-history output
- game-detail output
- public statistics
- insights
- comparisons
- search results
- metadata
- public API responses
- public RPC responses
- public exports
- hydration payloads
- browser-rendered source
- logs
- analytics event payloads

Also test:

- claimed player resolves publicly to username
- missing username uses a neutral fallback
- missing username never falls back to full name
- private import evidence remains authorized and non-public
- public DTOs omit private personal-name fields
- unauthorized users cannot enumerate claim candidates

## Existing behavior

Preserve regression coverage for:

- import routes
- parser behavior
- normalization
- drafts
- evidence
- provenance
- field coverage
- duplicate games
- corporations
- Preludes
- Merger
- maps
- milestones
- awards
- scoring
- winners
- ties
- card acquisition
- finalization compatibility
- authentication
- middleware
- group context
- Phase 3 navigation
- Glossary
- Card Lookup

Do not weaken tests.

Do not update snapshots blindly.

# Required validation

Use repository commands.

Run applicable equivalents of:

npm test
npm run typecheck
npm run lint
npm run build

Also run available:

- import tests
- player-resolution tests
- privacy tests
- authorization tests
- route tests
- draft tests
- browser tests
- responsive tests
- accessibility tests

Record exact commands, exit codes, test counts, warnings, and skipped checks.

Do not claim a check passed unless it ran.

# Responsive and accessibility requirements

Use one responsive website workflow.

Validate approximately:

- 1440px
- 1024px
- 768px
- 390px

Review:

- identity-mode selection
- linked-player state
- existing-guest state
- username guest creation
- personal-name guest creation
- ambiguity resolution
- unresolved state
- validation
- evidence
- draft save and resume
- keyboard focus
- screen-reader labels
- visible focus
- no page-level horizontal scrolling
- no app-style navigation

# Not authorized

Do not:

- reopen Step 4.2
- implement registration-time claiming
- automatically link an account
- create an authentication user
- change accepted import formats
- broadly rewrite parsers
- weaken validation
- remove evidence
- expose private names publicly
- use CSS-only privacy
- create or apply migrations
- change RLS
- mutate production identities
- mutate Supabase Storage
- add dependencies
- expose service-role credentials
- execute the Merger migration or backfill
- begin Step 4.4
- begin Step 4.5
- begin Phase 5
- push
- deploy

# Acceptance criteria

Step 4.3 is complete only when:

1. Steps 4.1 and 4.2 remain complete.
2. Existing import routes and formats remain valid.
3. Parser semantics remain intact.
4. Player identity states are explicit.
5. Existing eligible guests can be reused.
6. Username guest creation works when supported by the authorized schema.
7. First-and-last-name guest creation works when supported by the authorized
   schema.
8. Username and personal-name semantics remain separate.
9. Ambiguous matches require explicit resolution.
10. Duplicate guest creation is prevented.
11. Imported games preserve the selected player ID.
12. Draft save and resume preserve the player ID.
13. Original import evidence is preserved privately.
14. Guest identities retain future claimability.
15. Private personal-name fields are absent from public-facing contracts.
16. The architecture supports username-only public presentation after claim.
17. Missing username never falls back to private personal name.
18. Registration-time claiming was not implemented.
19. Evidence, provenance, coverage, scoring, winners, ties, milestones, awards,
    Preludes, and Merger behavior remain intact.
20. No unauthorized schema or RLS change occurred.
21. Tests pass.
22. Typecheck passes.
23. Lint completes with only documented accepted warnings.
24. Build passes.
25. Responsive and accessibility review is recorded.
26. Documentation is current.
27. One focused completion commit exists.
28. The worktree is clean.
29. No push occurred.
30. No deployment occurred.

If the existing schema cannot meet the identity or privacy requirements, do not
mark Step 4.3 complete.

Leave it active and report the migration or architectural blocker.

# Documentation updates

When complete:

1. Update docs/REDESIGN_STATE.md.
2. Keep Phase 4 active.
3. Mark Step 4.3 complete only if every acceptance criterion is met.
4. Set the next action to:

   Await explicit assignment for Phase 4, Step 4.4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Final Review,
   Finalization, and Draft Safety.

5. Update docs/redesign/phases/04-log-a-game.md.
6. Update docs/redesign/DECISIONS.md only for durable decisions.
7. Do not rewrite Step 4.1 or Step 4.2 handoffs.
8. Create:

docs/agent-handoffs/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md

# Required handoff statements

The Step 4.3 handoff must explicitly state:

- TM Stats is a responsive website, not a mobile application.
- Step 4.2 was not reopened.
- Unmatched imported players may be represented as unlinked guests.
- Approved identity modes are username or first and last name.
- Username and personal-name semantics remain separate.
- Existing eligible guests are reused when confirmed.
- Ambiguous matches require explicit resolution.
- Imported games preserve the selected player ID.
- Guest identities remain unlinked until registration confirmation.
- Registration-time claiming was not implemented.
- Original import evidence remains private.
- Claimed-player private personal names are not authorized for public display.
- Public claimed-player identity is the registered username.
- Missing username does not fall back to private personal name.
- Private personal-name fields are excluded from public payloads.
- CSS-only hiding was not used.
- No unauthorized schema change occurred.
- No production identity was mutated.
- No service-role credential was exposed.
- No push occurred.
- No deployment occurred.
- Step 4.4 was not started.
- Phase 5 was not started.

# Commit requirements

Create one focused Step 4.3 completion commit.

Suggested subject:

feat(log-game): preserve claimable guest identities and privacy

Do not include:

- registration claim implementation
- migrations
- RLS changes
- unrelated cleanup
- dependencies
- Step 4.4 work
- Step 4.5 work
- Phase 5 work

Do not begin Step 4.4 automatically.
