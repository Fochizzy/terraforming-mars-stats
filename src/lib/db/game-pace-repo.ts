import { createSupabaseServerClient } from '@/lib/supabase/server';

export type GamePacePoint = {
  cards: number;
  generation: number;
};

export type GamePacePlayer = {
  awards: number;
  cards: number;
  cities: number;
  greeneries: number;
  id: string;
  milestones: number;
  name: string;
  pace: GamePacePoint[];
};

export type GamePaceReplay = {
  gameId: string;
  generationCount: number;
  playedOn: string;
  players: GamePacePlayer[];
};

type RawGameRow = {
  created_at: string;
  generation_count: number;
  id: string;
  played_on: string;
};

type RawImportRow = {
  created_at: string;
  game_id: string;
  id: string;
};

type RawEventRow = {
  event_order: number;
  event_type: string;
  game_log_import_id: string;
  generation_number: number | null;
  payload: unknown;
  tile_type: string | null;
};

type MutablePlayerPace = Omit<GamePacePlayer, 'pace'> & {
  cardsByGeneration: number[];
};

const REPLAY_EVENT_TYPES = [
  'award_funded',
  'card_played',
  'milestone_claimed',
  'tile_placed',
] as const;
const EVENT_PAGE_SIZE = 1_000;
const GAME_CANDIDATE_LIMIT = 20;
const REPLAY_LIMIT = 12;

function getActor(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const actor = (payload as Record<string, unknown>).actor;
  return typeof actor === 'string' && actor.trim() ? actor.trim() : null;
}

function getActorKey(actor: string) {
  return actor.toLocaleLowerCase('en-US');
}

function clampGeneration(generation: number | null, generationCount: number) {
  if (!generation || !Number.isFinite(generation)) {
    return generationCount;
  }

  return Math.min(Math.max(Math.trunc(generation), 1), generationCount);
}

function buildReplay(
  game: RawGameRow,
  events: RawEventRow[],
): GamePaceReplay | null {
  const players = new Map<string, MutablePlayerPace>();

  events.forEach((event) => {
    const actor = getActor(event.payload);

    if (!actor) {
      return;
    }

    const actorKey = getActorKey(actor);
    const player = players.get(actorKey) ?? {
      awards: 0,
      cards: 0,
      cardsByGeneration: Array.from({ length: game.generation_count }, () => 0),
      cities: 0,
      greeneries: 0,
      id: `player-${players.size + 1}`,
      milestones: 0,
      name: actor,
    };

    if (event.event_type === 'card_played') {
      const generation = clampGeneration(
        event.generation_number,
        game.generation_count,
      );
      player.cards += 1;
      player.cardsByGeneration[generation - 1] += 1;
    } else if (
      event.event_type === 'tile_placed' &&
      event.tile_type === 'city'
    ) {
      player.cities += 1;
    } else if (
      event.event_type === 'tile_placed' &&
      event.tile_type === 'greenery'
    ) {
      player.greeneries += 1;
    } else if (event.event_type === 'milestone_claimed') {
      player.milestones += 1;
    } else if (event.event_type === 'award_funded') {
      player.awards += 1;
    }

    players.set(actorKey, player);
  });

  const replayPlayers = Array.from(players.values())
    .filter((player) => player.cards > 0)
    .map(({ cardsByGeneration, ...player }) => {
      let cumulativeCards = 0;

      return {
        ...player,
        pace: cardsByGeneration.map((cards, index) => {
          cumulativeCards += cards;
          return {
            cards: cumulativeCards,
            generation: index + 1,
          };
        }),
      };
    });

  if (replayPlayers.length === 0) {
    return null;
  }

  return {
    gameId: game.id,
    generationCount: game.generation_count,
    playedOn: game.played_on,
    players: replayPlayers,
  };
}

async function listRelevantEvents(importIds: string[]): Promise<RawEventRow[]> {
  if (importIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const rows: RawEventRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('game_log_events')
      .select(
        [
          'event_order',
          'event_type',
          'game_log_import_id',
          'generation_number',
          'payload',
          'tile_type',
        ].join(', '),
      )
      .in('game_log_import_id', importIds)
      .in('event_type', [...REPLAY_EVENT_TYPES])
      .order('game_log_import_id')
      .order('event_order')
      .range(offset, offset + EVENT_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as unknown as RawEventRow[];
    rows.push(...page);

    if (page.length < EVENT_PAGE_SIZE) {
      return rows;
    }

    offset += EVENT_PAGE_SIZE;
  }
}

export async function listGamePaceReplays(
  groupId: string,
): Promise<GamePaceReplay[]> {
  const supabase = await createSupabaseServerClient();
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('created_at, generation_count, id, played_on')
    .eq('group_id', groupId)
    .eq('status', 'finalized')
    .order('played_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(GAME_CANDIDATE_LIMIT);

  if (gameError) {
    throw gameError;
  }

  const games = (gameData ?? []) as RawGameRow[];

  if (games.length === 0) {
    return [];
  }

  const { data: importData, error: importError } = await supabase
    .from('game_log_imports')
    .select('created_at, game_id, id')
    .in(
      'game_id',
      games.map((game) => game.id),
    )
    .order('created_at', { ascending: false });

  if (importError) {
    throw importError;
  }

  const imports = (importData ?? []) as RawImportRow[];
  const events = await listRelevantEvents(imports.map((entry) => entry.id));
  const eventsByImport = new Map<string, RawEventRow[]>();

  events.forEach((event) => {
    const currentEvents = eventsByImport.get(event.game_log_import_id) ?? [];
    currentEvents.push(event);
    eventsByImport.set(event.game_log_import_id, currentEvents);
  });

  const importByGame = new Map<string, RawImportRow>();
  imports.forEach((entry) => {
    if (
      !importByGame.has(entry.game_id) &&
      (eventsByImport.get(entry.id)?.length ?? 0) > 0
    ) {
      importByGame.set(entry.game_id, entry);
    }
  });

  return games
    .map((game) => {
      const gameImport = importByGame.get(game.id);
      return gameImport
        ? buildReplay(game, eventsByImport.get(gameImport.id) ?? [])
        : null;
    })
    .filter((replay): replay is GamePaceReplay => replay !== null)
    .slice(0, REPLAY_LIMIT);
}
