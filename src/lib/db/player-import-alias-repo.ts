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

export async function listPlayerImportAliasesForGroup(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_import_aliases')
    .select('alias_text, normalized_alias, player_id, source_type')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawPlayerImportAliasRow[]).map((row) => ({
    aliasText: row.alias_text,
    normalizedAlias: row.normalized_alias,
    playerId: row.player_id,
    sourceType: row.source_type,
  }));
}
