insert into storage.buckets (id, name, public)
values ('tm-card-full', 'tm-card-full', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tm-card-thumbs', 'tm-card-thumbs', true)
on conflict (id) do nothing;

alter table public.expansions enable row level security;
alter table public.maps enable row level security;
alter table public.promo_sets enable row level security;
alter table public.cards enable row level security;
alter table public.corporations enable row level security;
alter table public.preludes enable row level security;
alter table public.milestones enable row level security;
alter table public.awards enable row level security;
alter table public.style_definitions enable row level security;
alter table public.catalog_snapshots enable row level security;
alter table public.catalog_overrides enable row level security;
alter table public.group_default_expansions enable row level security;
alter table public.group_default_promo_sets enable row level security;
alter table public.game_expansions enable row level security;
alter table public.game_promo_sets enable row level security;
alter table public.game_player_preludes enable row level security;
alter table public.map_milestones enable row level security;
alter table public.map_awards enable row level security;
alter table public.game_milestones enable row level security;
alter table public.game_awards enable row level security;
alter table public.game_player_declared_styles enable row level security;
alter table public.game_player_inferred_styles enable row level security;
alter table public.game_player_key_cards enable row level security;

create policy "authenticated users read expansions"
on public.expansions for select to authenticated using (true);

create policy "authenticated users read maps"
on public.maps for select to authenticated using (true);

create policy "authenticated users read promo sets"
on public.promo_sets for select to authenticated using (true);

create policy "authenticated users read cards"
on public.cards for select to authenticated using (true);

create policy "authenticated users read corporations"
on public.corporations for select to authenticated using (true);

create policy "authenticated users read preludes"
on public.preludes for select to authenticated using (true);

create policy "authenticated users read milestones"
on public.milestones for select to authenticated using (true);

create policy "authenticated users read awards"
on public.awards for select to authenticated using (true);

create policy "authenticated users read styles"
on public.style_definitions for select to authenticated using (true);

create policy "authenticated users read catalog snapshots"
on public.catalog_snapshots for select to authenticated using (true);

create policy "authenticated users read catalog overrides"
on public.catalog_overrides for select to authenticated using (true);

create policy "members read default expansions"
on public.group_default_expansions for select
using (public.is_group_member(group_id));

create policy "owners manage default expansions"
on public.group_default_expansions for all
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "members read default promo sets"
on public.group_default_promo_sets for select
using (public.is_group_member(group_id));

create policy "owners manage default promo sets"
on public.group_default_promo_sets for all
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "members read game expansions"
on public.game_expansions for select
using (public.can_read_game(game_id));

create policy "editors manage game expansions"
on public.game_expansions for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game promo sets"
on public.game_promo_sets for select
using (public.can_read_game(game_id));

create policy "editors manage game promo sets"
on public.game_promo_sets for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game milestones"
on public.game_milestones for select
using (public.can_read_game(game_id));

create policy "editors manage game milestones"
on public.game_milestones for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game awards"
on public.game_awards for select
using (public.can_read_game(game_id));

create policy "editors manage game awards"
on public.game_awards for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "authenticated users read map milestones"
on public.map_milestones for select to authenticated using (true);

create policy "authenticated users read map awards"
on public.map_awards for select to authenticated using (true);

create policy "members read game player preludes"
on public.game_player_preludes for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage game player preludes"
on public.game_player_preludes for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));

create policy "members read declared styles"
on public.game_player_declared_styles for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage declared styles"
on public.game_player_declared_styles for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));

create policy "members read inferred styles"
on public.game_player_inferred_styles for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage inferred styles"
on public.game_player_inferred_styles for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));

create policy "members read key cards"
on public.game_player_key_cards for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage key cards"
on public.game_player_key_cards for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));
