import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PlayerImportAlias = {
  aliasText: string;
  normalizedAlias: string;
  playerId: string;
  sourceType: 'game_log' | 'screenshot_ocr';
};

type RawPlayerImportAliasRow = {
  alias_text: string;
  normalized_alias: string;
  player_id: string;
  source_type: 'game_log' | 'screenshot_ocr';
};

export async function savePlayerImportAlias(input: {
  aliasText: string;
  groupId: string;
  playerId: string;
  sourceType: 'game_log' | 'screenshot_ocr';
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('player_import_aliases').upsert(
    {
      alias_text: input.aliasText,
      group_id: input.groupId,
      normalized_alias: normalizePlayerAlias(input.aliasText),
      player_id: input.playerId,
      source_type: input.sourceType,
    },
    {
      onConflict: 'group_id,source_type,normalized_alias',
    },
  );

  if (error) {
    throw error;
  }
}

/** Postgres/PostgREST insufficient_privilege. */
function isInsufficientPrivilegeError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42501'
  );
}

export async function listPlayerImportAliasesForGroup(
  groupId: string,
): Promise<PlayerImportAlias[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_import_aliases')
    .select('alias_text, normalized_alias, player_id, source_type')
    .eq('group_id', groupId);

  if (error) {
    // Saved aliases are readable by service_role only, so the signed-in reader
    // gets no alias hints. Auto-matching degrades to the imported names and the
    // public candidate list; reviewers pick anything left over by hand. Failing
    // the whole import over a matching aid would be worse than matching less.
    if (isInsufficientPrivilegeError(error)) {
      console.warn(
        'Alias-assisted import auto-matching unavailable: reading player_import_aliases is not permitted for the current role.',
      );
      return [];
    }

    throw error;
  }

  return ((data ?? []) as RawPlayerImportAliasRow[]).map((row) => ({
    aliasText: row.alias_text,
    normalizedAlias: row.normalized_alias,
    playerId: row.player_id,
    sourceType: row.source_type,
  }));
}
