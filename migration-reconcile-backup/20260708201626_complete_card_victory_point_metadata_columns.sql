alter table public.cards
  add column if not exists printed_victory_points integer;

alter table public.cards
  add column if not exists victory_points_kind text not null default 'none';

alter table public.cards
  drop constraint if exists cards_victory_points_kind_check;

alter table public.cards
  add constraint cards_victory_points_kind_check check (
    victory_points_kind in ('none', 'static', 'dynamic')
  );

comment on column public.cards.printed_victory_points is 'Static printed victory points from the open-source terraforming-mars card data. Dynamic scoring cards keep this null.';

comment on column public.cards.victory_points_kind is 'Printed victory point status from the open-source terraforming-mars card data: none, static, or dynamic.';
