-- Backfill profile-model fields introduced for richer imported-log analytics:
-- source/target attribution for removal events, resource-vs-production deltas,
-- and generation numbers on every event after a generation marker.

set lock_timeout = '5s';
set statement_timeout = '60s';
with inferred_generations as (
  select
    gle.id,
    max(gle.generation_number) filter (
      where gle.event_type = 'generation_started'
    ) over (
      partition by gle.game_log_import_id
      order by gle.event_order
      rows between unbounded preceding and current row
    ) as inferred_generation_number
  from public.game_log_events gle
)
update public.game_log_events gle
set generation_number = inferred.inferred_generation_number
from inferred_generations inferred
where gle.id = inferred.id
  and gle.generation_number is null
  and inferred.inferred_generation_number is not null;
with resource_events as (
  select
    gle.id,
    gle.card_id,
    gle.event_order,
    gle.game_log_import_id,
    gle.payload,
    gle.raw_line,
    gle.resource_type,
    lower(coalesce(gle.payload ->> 'operation', '')) = 'removed' as is_removed,
    regexp_match(
      gle.raw_line,
      '^\s*(.+?)\s+removed\s+\d+\s+([A-Za-z][A-Za-z -]*?)\s+from\s+(.+?)\s*$',
      'i'
    ) as targeted_removal_match
  from public.game_log_events gle
  where gle.event_type = 'resource_changed'
),
resolved_events as (
  select
    resource_events.id,
    case
      when lower(coalesce(resource_events.payload ->> 'deltaKind', '')) = 'production'
        then 'production'
      when lower(coalesce(resource_events.payload ->> 'resourceDeltaKind', '')) = 'production'
        then 'production'
      when coalesce(resource_events.resource_type, '') ~* '\mproduction\M'
        then 'production'
      when coalesce(resource_events.raw_line, '') ~* '\mproduction\M'
        then 'production'
      else 'resource'
    end as delta_kind,
    nullif(
      btrim(
        regexp_replace(
          regexp_replace(
            coalesce(
              resource_events.resource_type,
              resource_events.payload ->> 'resourceType',
              'resource'
            ),
            '[-_]+',
            ' ',
            'g'
          ),
          '\s*\mproduction\M\s*',
          ' ',
          'gi'
        )
      ),
      ''
    ) as resource_track,
    case
      when resource_events.is_removed then coalesce(
        resource_events.payload ->> 'sourcePlayerName',
        resource_events.payload ->> 'sourcePlayer',
        resource_events.payload ->> 'sourceActor',
        resource_events.payload ->> 'attacker',
        case
          when resource_events.targeted_removal_match is not null
            then btrim(resource_events.targeted_removal_match[1])
          else prior_card.payload ->> 'actor'
        end
      )
      else null
    end as source_player_name,
    case
      when resource_events.is_removed then coalesce(
        resource_events.payload ->> 'targetPlayerName',
        resource_events.payload ->> 'affectedPlayer',
        resource_events.payload ->> 'targetPlayer',
        resource_events.payload ->> 'target',
        resource_events.payload ->> 'opponent',
        resource_events.payload ->> 'removedFrom',
        case
          when resource_events.targeted_removal_match is not null
            then btrim(resource_events.targeted_removal_match[3])
          else resource_events.payload ->> 'actor'
        end
      )
      else null
    end as target_player_name,
    case
      when resource_events.is_removed then coalesce(
        resource_events.payload ->> 'affectedPlayer',
        case
          when resource_events.targeted_removal_match is not null
            then btrim(resource_events.targeted_removal_match[3])
          else null
        end
      )
      else null
    end as affected_player
  from resource_events
  left join lateral (
    select prior.payload
    from public.game_log_events prior
    where prior.game_log_import_id = resource_events.game_log_import_id
      and prior.event_type = 'card_played'
      and prior.event_order < resource_events.event_order
      and (
        (
          resource_events.card_id is not null
          and prior.card_id = resource_events.card_id
        )
        or (
          nullif(
            btrim(
              regexp_replace(
                lower(coalesce(prior.payload ->> 'cardName', '')),
                '[^a-z0-9]+',
                ' ',
                'g'
              )
            ),
            ''
          ) = nullif(
            btrim(
              regexp_replace(
                lower(coalesce(resource_events.payload ->> 'cardName', '')),
                '[^a-z0-9]+',
                ' ',
                'g'
              )
            ),
            ''
          )
        )
      )
    order by prior.event_order desc
    limit 1
  ) prior_card on true
)
update public.game_log_events gle
set
  payload = jsonb_strip_nulls(
    coalesce(gle.payload, '{}'::jsonb)
    || jsonb_build_object('deltaKind', resolved.delta_kind)
    || case
      when resolved.source_player_name is not null
        then jsonb_build_object('sourcePlayerName', resolved.source_player_name)
      else '{}'::jsonb
    end
    || case
      when resolved.target_player_name is not null
        then jsonb_build_object('targetPlayerName', resolved.target_player_name)
      else '{}'::jsonb
    end
    || case
      when resolved.affected_player is not null
        then jsonb_build_object('affectedPlayer', resolved.affected_player)
      else '{}'::jsonb
    end
  ),
  resource_type = coalesce(resolved.resource_track, gle.resource_type)
from resolved_events resolved
where gle.id = resolved.id
  and (
    gle.payload is distinct from jsonb_strip_nulls(
      coalesce(gle.payload, '{}'::jsonb)
      || jsonb_build_object('deltaKind', resolved.delta_kind)
      || case
        when resolved.source_player_name is not null
          then jsonb_build_object('sourcePlayerName', resolved.source_player_name)
        else '{}'::jsonb
      end
      || case
        when resolved.target_player_name is not null
          then jsonb_build_object('targetPlayerName', resolved.target_player_name)
        else '{}'::jsonb
      end
      || case
        when resolved.affected_player is not null
          then jsonb_build_object('affectedPlayer', resolved.affected_player)
        else '{}'::jsonb
      end
    )
    or gle.resource_type is distinct from coalesce(
      resolved.resource_track,
      gle.resource_type
    )
  );
