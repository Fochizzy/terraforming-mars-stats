import { createSupabaseServerClient } from '@/lib/supabase/server';

export type GroupSettingsSnapshot = {
  groupId: string;
  groupName: string;
  globalAnalyticsEnabled: boolean;
  defaultGuaranteedMergerOffer: boolean;
  defaultMapId: string | null;
  defaultPromoSetSlugs: string[];
};

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
        .select('global_analytics_enabled, default_map_id, default_guaranteed_merger_offer')
        .eq('group_id', groupId)
        .maybeSingle(),
    ]);

  if (groupError) {
    throw groupError;
  }

  if (settingsError) {
    throw settingsError;
  }

  const { data: defaultPromoSetRows, error: promoRowsError } = await supabase
    .from('group_default_promo_sets')
    .select('promo_set_id')
    .eq('group_id', groupId);

  if (promoRowsError) {
    throw promoRowsError;
  }

  const promoSetIds = defaultPromoSetRows.map((row) => row.promo_set_id);

  const { data: promoSets, error: promoSetsError } = promoSetIds.length
    ? await supabase.from('promo_sets').select('slug').in('id', promoSetIds)
    : { data: [], error: null };

  if (promoSetsError) {
    throw promoSetsError;
  }

  return {
    groupId,
    groupName: group.name,
    globalAnalyticsEnabled: settings?.global_analytics_enabled ?? false,
    defaultGuaranteedMergerOffer:
      settings?.default_guaranteed_merger_offer ?? true,
    defaultMapId: settings?.default_map_id ?? null,
    defaultPromoSetSlugs: promoSets.map((promoSet) => promoSet.slug),
  };
}

export async function saveGroupSettings(input: {
  group_id: string;
  group_name: string;
  global_analytics_enabled: boolean;
  default_guaranteed_merger_offer: boolean;
  default_map_id?: string | null;
  default_promo_set_slugs: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const promoSetIds = await resolvePromoSetIds(input.default_promo_set_slugs);

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
      default_guaranteed_merger_offer: input.default_guaranteed_merger_offer,
      default_map_id: input.default_map_id ?? null,
    })
    .select('group_id, global_analytics_enabled, default_guaranteed_merger_offer, default_map_id')
    .single();

  if (error) {
    throw error;
  }

  const { error: deletePromoError } = await supabase
    .from('group_default_promo_sets')
    .delete()
    .eq('group_id', input.group_id);

  if (deletePromoError) {
    throw deletePromoError;
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
