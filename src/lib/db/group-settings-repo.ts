import { createSupabaseServerClient } from '@/lib/supabase/server';

export type GroupSettingsSnapshot = {
  groupId: string;
  groupName: string;
  globalAnalyticsEnabled: boolean;
  defaultMapId: string | null;
  defaultExpansionCodes: string[];
  defaultPromoSetSlugs: string[];
};

async function resolveExpansionIds(codes: string[]) {
  if (codes.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('expansions')
    .select('id, code')
    .in('code', codes);

  if (error) {
    throw error;
  }

  return data.map((expansion) => expansion.id);
}

async function resolvePromoSetIds(slugs: string[]) {
  if (slugs.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('promo_sets')
    .select('id, slug')
    .in('slug', slugs);

  if (error) {
    throw error;
  }

  return data.map((promoSet) => promoSet.id);
}

export async function getGroupSettings(groupId: string): Promise<GroupSettingsSnapshot> {
  const supabase = await createSupabaseServerClient();
  const [{ data: group, error: groupError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from('groups').select('name').eq('id', groupId).single(),
      supabase
        .from('group_settings')
        .select('global_analytics_enabled, default_map_id')
        .eq('group_id', groupId)
        .maybeSingle(),
    ]);

  if (groupError) {
    throw groupError;
  }

  if (settingsError) {
    throw settingsError;
  }

  const [
    { data: defaultExpansionRows, error: expansionRowsError },
    { data: defaultPromoSetRows, error: promoRowsError },
  ] = await Promise.all([
    supabase
      .from('group_default_expansions')
      .select('expansion_id')
      .eq('group_id', groupId),
    supabase
      .from('group_default_promo_sets')
      .select('promo_set_id')
      .eq('group_id', groupId),
  ]);

  if (expansionRowsError) {
    throw expansionRowsError;
  }

  if (promoRowsError) {
    throw promoRowsError;
  }

  const expansionIds = defaultExpansionRows.map((row) => row.expansion_id);
  const promoSetIds = defaultPromoSetRows.map((row) => row.promo_set_id);

  const [{ data: expansions, error: expansionsError }, { data: promoSets, error: promoSetsError }] =
    await Promise.all([
      expansionIds.length
        ? supabase.from('expansions').select('code').in('id', expansionIds)
        : Promise.resolve({ data: [], error: null }),
      promoSetIds.length
        ? supabase.from('promo_sets').select('slug').in('id', promoSetIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (expansionsError) {
    throw expansionsError;
  }

  if (promoSetsError) {
    throw promoSetsError;
  }

  return {
    groupId,
    groupName: group.name,
    globalAnalyticsEnabled: settings?.global_analytics_enabled ?? false,
    defaultMapId: settings?.default_map_id ?? null,
    defaultExpansionCodes: expansions.map((expansion) => expansion.code),
    defaultPromoSetSlugs: promoSets.map((promoSet) => promoSet.slug),
  };
}

export async function saveGroupSettings(input: {
  group_id: string;
  group_name: string;
  global_analytics_enabled: boolean;
  default_map_id?: string | null;
  default_expansion_codes: string[];
  default_promo_set_slugs: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const [expansionIds, promoSetIds] = await Promise.all([
    resolveExpansionIds(input.default_expansion_codes),
    resolvePromoSetIds(input.default_promo_set_slugs),
  ]);

  const { error: groupError } = await supabase
    .from('groups')
    .update({ name: input.group_name })
    .eq('id', input.group_id);

  if (groupError) {
    throw groupError;
  }

  const { data, error } = await supabase
    .from('group_settings')
    .upsert({
      group_id: input.group_id,
      global_analytics_enabled: input.global_analytics_enabled,
      default_map_id: input.default_map_id ?? null,
    })
    .select('group_id, global_analytics_enabled, default_map_id')
    .single();

  if (error) {
    throw error;
  }

  const { error: deleteExpansionError } = await supabase
    .from('group_default_expansions')
    .delete()
    .eq('group_id', input.group_id);

  if (deleteExpansionError) {
    throw deleteExpansionError;
  }

  const { error: deletePromoError } = await supabase
    .from('group_default_promo_sets')
    .delete()
    .eq('group_id', input.group_id);

  if (deletePromoError) {
    throw deletePromoError;
  }

  if (expansionIds.length > 0) {
    const { error: insertExpansionError } = await supabase
      .from('group_default_expansions')
      .insert(
        expansionIds.map((expansionId) => ({
          group_id: input.group_id,
          expansion_id: expansionId,
        })),
      );

    if (insertExpansionError) {
      throw insertExpansionError;
    }
  }

  if (promoSetIds.length > 0) {
    const { error: insertPromoError } = await supabase
      .from('group_default_promo_sets')
      .insert(
        promoSetIds.map((promoSetId) => ({
          group_id: input.group_id,
          promo_set_id: promoSetId,
        })),
      );

    if (insertPromoError) {
      throw insertPromoError;
    }
  }

  return data;
}
