-- Faithful, schema-only reconstruction of the production migration recorded in
-- the live ledger as version 20260712114538 (`add_player_username_full_name`),
-- which was applied remotely and never committed to this repository.
--
-- Why this file exists: the Step 4.3 F-01 completion migration
-- (20260719223000_isolate_player_personal_names_from_data_api.sql) reads and
-- preserves public.players.full_name / public.players.username, so a clean
-- baseline replay (supabase/tests/executable/run.sh) must create those columns
-- first. Production already records version 20260712114538, so this file is
-- skipped there by version and never re-applied.
--
-- Reconstruction evidence (read-only against production, 2026-07-19):
-- information_schema.columns shows both as plain nullable text columns with no
-- default, no generation expression, and no dedicated index or constraint.
-- This file intentionally adds nothing beyond that verified shape.

alter table public.players
  add column if not exists username text,
  add column if not exists full_name text;
