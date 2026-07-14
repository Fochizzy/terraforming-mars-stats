alter table public.cards
add column if not exists required_expansion_codes text[] not null default '{}'::text[];

alter table public.corporations
add column if not exists required_expansion_codes text[] not null default '{}'::text[];

alter table public.preludes
add column if not exists promo_set_id uuid references public.promo_sets(id) on delete set null;

alter table public.preludes
add column if not exists required_expansion_codes text[] not null default '{}'::text[];
