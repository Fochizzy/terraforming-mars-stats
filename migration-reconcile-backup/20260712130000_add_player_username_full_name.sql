-- Roster players can now carry their own username + full name, independent of a
-- signed-up account. Import review lets the importer specify both when creating
-- a player or confirming a match, so a person shown by a username in one game
-- log and a nickname in another still resolves to one roster identity.
--
-- Account-linked players keep taking their username/full_name from
-- `user_profiles` (the account owner's own, canonical values); these columns
-- are the source for players who have no account. Both are nullable so every
-- existing roster row stays valid.
alter table public.players
  add column if not exists username text,
  add column if not exists full_name text;
