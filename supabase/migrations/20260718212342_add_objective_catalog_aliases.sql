-- Phase 4, Step 4.3 remediation: exact catalog-backed objective aliases.
-- Rollback scope is limited to the seven deterministic alias row IDs below.

do $$
begin
  if not exists (
    select 1 from public.awards
    where id = '02d084b4-3856-444d-80cb-71b6fc800ef7' and name = 'A. Engineer'
  ) or not exists (
    select 1 from public.awards
    where id = '21fc9222-6539-4aaa-974e-11a95d42755e' and name = 'A. Manufacturer'
  ) or not exists (
    select 1 from public.awards
    where id = '05455a73-ab74-4d08-81e9-c8f8cb9229e0' and name = 'A. Zoologist'
  ) or not exists (
    select 1 from public.milestones
    where id = '36eff4af-3a88-4fea-80cd-20f2180baf3c' and name = 'T. Collector'
  ) or not exists (
    select 1 from public.awards
    where id = 'ccb8a36c-c4fb-4cb6-a989-313880892879' and name = 'T. Politician'
  ) or not exists (
    select 1 from public.milestones
    where id = 'b60dc45b-f0c9-4107-a0be-7292fbeb58ed' and name = 'V. Electrician'
  ) or not exists (
    select 1 from public.milestones
    where id = '4ef30867-fd6d-4560-bf48-6ed740d69916' and name = 'V. Spacefarer'
  ) then
    raise exception 'Objective catalogue differs from the approved Step 4.3 alias mapping.'
      using errcode = '23503';
  end if;
end;
$$;

do $$
declare
  v_collision_count integer;
begin
  with expected(entity_type, entity_id, alias_text) as (
    values
      ('award'::text, '02d084b4-3856-444d-80cb-71b6fc800ef7'::uuid, 'Amazonis Engineer'::text),
      ('award', '05455a73-ab74-4d08-81e9-c8f8cb9229e0'::uuid, 'Amazonis Zoologist'),
      ('award', '21fc9222-6539-4aaa-974e-11a95d42755e'::uuid, 'Arabia Manufacturer'),
      ('milestone', '36eff4af-3a88-4fea-80cd-20f2180baf3c'::uuid, 'Collector'),
      ('award', 'ccb8a36c-c4fb-4cb6-a989-313880892879'::uuid, 'Politician'),
      ('milestone', 'b60dc45b-f0c9-4107-a0be-7292fbeb58ed'::uuid, 'Vastitas Electrician'),
      ('milestone', '4ef30867-fd6d-4560-bf48-6ed740d69916'::uuid, 'Vastitas Spacefarer')
  )
  select count(*)::integer
  into v_collision_count
  from expected e
  join public.domain_text_aliases dta
    on dta.entity_type = e.entity_type
   and dta.normalized_alias_text = public.normalize_ocr_domain_text(e.alias_text)
  where dta.entity_id <> e.entity_id;

  if v_collision_count <> 0 then
    raise exception 'An approved objective alias already resolves to a different catalogue row.'
      using errcode = '23505';
  end if;
end;
$$;

insert into public.domain_text_aliases (
  id,
  entity_type,
  entity_id,
  alias_text,
  normalized_alias_text,
  source,
  occurrence_count
)
values
  ('43a30001-43a3-4001-8001-000000000001', 'award', '02d084b4-3856-444d-80cb-71b6fc800ef7', 'Amazonis Engineer', public.normalize_ocr_domain_text('Amazonis Engineer'), 'catalog', 1),
  ('43a30002-43a3-4002-8002-000000000002', 'award', '05455a73-ab74-4d08-81e9-c8f8cb9229e0', 'Amazonis Zoologist', public.normalize_ocr_domain_text('Amazonis Zoologist'), 'catalog', 1),
  ('43a30003-43a3-4003-8003-000000000003', 'award', '21fc9222-6539-4aaa-974e-11a95d42755e', 'Arabia Manufacturer', public.normalize_ocr_domain_text('Arabia Manufacturer'), 'catalog', 1),
  ('43a30004-43a3-4004-8004-000000000004', 'milestone', '36eff4af-3a88-4fea-80cd-20f2180baf3c', 'Collector', public.normalize_ocr_domain_text('Collector'), 'catalog', 1),
  ('43a30005-43a3-4005-8005-000000000005', 'award', 'ccb8a36c-c4fb-4cb6-a989-313880892879', 'Politician', public.normalize_ocr_domain_text('Politician'), 'catalog', 1),
  ('43a30006-43a3-4006-8006-000000000006', 'milestone', 'b60dc45b-f0c9-4107-a0be-7292fbeb58ed', 'Vastitas Electrician', public.normalize_ocr_domain_text('Vastitas Electrician'), 'catalog', 1),
  ('43a30007-43a3-4007-8007-000000000007', 'milestone', '4ef30867-fd6d-4560-bf48-6ed740d69916', 'Vastitas Spacefarer', public.normalize_ocr_domain_text('Vastitas Spacefarer'), 'catalog', 1)
on conflict (entity_type, normalized_alias_text) do nothing;

do $$
declare
  v_verified_count integer;
begin
  with expected(entity_type, entity_id, alias_text) as (
    values
      ('award'::text, '02d084b4-3856-444d-80cb-71b6fc800ef7'::uuid, 'Amazonis Engineer'::text),
      ('award', '05455a73-ab74-4d08-81e9-c8f8cb9229e0'::uuid, 'Amazonis Zoologist'),
      ('award', '21fc9222-6539-4aaa-974e-11a95d42755e'::uuid, 'Arabia Manufacturer'),
      ('milestone', '36eff4af-3a88-4fea-80cd-20f2180baf3c'::uuid, 'Collector'),
      ('award', 'ccb8a36c-c4fb-4cb6-a989-313880892879'::uuid, 'Politician'),
      ('milestone', 'b60dc45b-f0c9-4107-a0be-7292fbeb58ed'::uuid, 'Vastitas Electrician'),
      ('milestone', '4ef30867-fd6d-4560-bf48-6ed740d69916'::uuid, 'Vastitas Spacefarer')
  )
  select count(*)::integer
  into v_verified_count
  from expected e
  join public.domain_text_aliases dta
    on dta.entity_type = e.entity_type
   and dta.entity_id = e.entity_id
   and dta.normalized_alias_text = public.normalize_ocr_domain_text(e.alias_text);

  if v_verified_count <> 7 then
    raise exception 'Expected seven exact objective alias mappings; verified %.', v_verified_count
      using errcode = '23514';
  end if;
end;
$$;

