# Import Group Resolution Design

**Goal:** Let signed-in users use the web import flow before they belong to a group, resolve imports onto an existing group when the exact participant set already exists, and create a new equal-permission group when the player combination is new.

## Product Rules

1. `/log-game/import` is the only authenticated route that works without an existing group membership.
2. All other shared app routes remain group-based.
3. Group identity is defined by the exact participant set, not turn order.
4. Exact matching means normalized exact player aliases only; no strongest-match behavior.
5. If the exact participant set already exists, the import reuses that group.
6. If the participant set is new, the import creates a new group and new player profiles for unmatched names.
7. There are no special owners. Every group member has the same edit permissions.

## Data Model

1. Existing `players` rows continue to represent the group roster.
2. Existing `group_members` rows continue to represent access, but the permission model becomes symmetric.
3. Import matching uses linked users when there is a unique exact player-name match and falls back to normalized name identity for new profiles.
4. Group signatures are computed from the roster:
   - linked player: `user:<linked_user_id>`
   - unlinked player: `name:<normalized display name>`

## Import Flow

1. A signed-in user opens `/log-game/import`.
2. They paste the log, upload the screenshot, and enter exact participant names.
3. The server resolves participant identities from existing player profiles.
4. The server compares the imported participant signature to existing group roster signatures.
5. If one exact group matches, the import attaches there and ensures the importing user is a member.
6. If no exact group matches, the server creates:
   - a new group
   - equal-permission memberships for linked users and the importing user
   - player rows for every imported participant
7. The import then creates a draft game with the resolved group and selected players and routes into the existing log-game flow.

## Route Behavior

1. Login defaults to `/log-game/import`.
2. Group-required routes redirect to `/log-game/import` when the user has no group yet.
3. The import page shows a reduced bottom navigation when no group exists yet.

## Operational Notes

1. Server-side import group resolution uses the Supabase service-role key because it must inspect rosters outside the caller's current memberships.
2. RLS policies are updated so all group members share the same edit rights for group settings and roster management.
