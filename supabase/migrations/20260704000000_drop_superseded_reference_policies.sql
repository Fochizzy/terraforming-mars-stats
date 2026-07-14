-- Cleanup must run before the later reference-policy migration on fresh preview databases.
drop policy if exists "authenticated users read expansions" on public.expansions;
drop policy if exists "authenticated users read maps" on public.maps;
drop policy if exists "authenticated users read promo sets" on public.promo_sets;
drop policy if exists "members read default expansions" on public.group_default_expansions;
drop policy if exists "owners manage default expansions" on public.group_default_expansions;
drop policy if exists "members read default promo sets" on public.group_default_promo_sets;
drop policy if exists "owners manage default promo sets" on public.group_default_promo_sets;
drop policy if exists "members read game expansions" on public.game_expansions;
drop policy if exists "editors manage game expansions" on public.game_expansions;
drop policy if exists "members read game promo sets" on public.game_promo_sets;
drop policy if exists "editors manage game promo sets" on public.game_promo_sets;
