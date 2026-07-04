do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'groups'
      and policyname = 'owners manage groups'
  ) then
    create policy "owners manage groups"
    on public.groups for update
    using (public.is_group_owner(id))
    with check (public.is_group_owner(id));
  end if;
end
$$;
