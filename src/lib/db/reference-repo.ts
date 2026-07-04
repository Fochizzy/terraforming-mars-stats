import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ExpansionOption = {
  id: string;
  code: string;
  name: string;
};

export type MapOption = {
  id: string;
  code: string;
  name: string;
};

export type PromoSetOption = {
  id: string;
  slug: string;
  displayName: string;
  editionLabel: string;
  promoYear: number | null;
};

export type CorporationOption = {
  id: string;
  name: string;
  expansionCode: string;
  promoSetSlug: string | null;
};

export type PreludeOption = {
  id: string;
  name: string;
  expansionCode: string;
};

export type MapMilestoneOption = {
  mapId: string;
  milestoneId: string;
  milestoneName: string;
};

export type MapAwardOption = {
  mapId: string;
  awardId: string;
  awardName: string;
};

export type StyleOption = {
  id: string;
  code: string;
  name: string;
};

export type CardOption = {
  id: string;
  cardNumber: string;
  cardName: string;
  expansionCode: string;
  promoSetSlug: string | null;
};

export type PromoCardOption = {
  id: string;
  promoSetId: string;
  cardNumber: string;
  cardName: string;
  cardType: string;
  expansionCode: string;
  thumbnailUrl: string;
  fullImageUrl: string;
};

type JoinedName = {
  name: string;
};

export async function listExpansions(): Promise<ExpansionOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('expansions')
    .select('id, code, name')
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function listMaps(): Promise<MapOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('maps')
    .select('id, code, name')
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function listPromoSets(): Promise<PromoSetOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('promo_sets')
    .select('id, slug, display_name, edition_label, promo_year')
    .order('display_order')
    .order('promo_year', { ascending: true, nullsFirst: false })
    .order('display_name');

  if (error) {
    throw error;
  }

  return data.map((promoSet) => ({
    id: promoSet.id,
    slug: promoSet.slug,
    displayName: promoSet.display_name,
    editionLabel: promoSet.edition_label,
    promoYear: promoSet.promo_year,
  }));
}

export async function listCorporations(): Promise<CorporationOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('corporations')
    .select('id, name, expansion_code')
    .order('name');

  if (error) {
    throw error;
  }

  return data.map((corporation) => ({
    id: corporation.id,
    name: corporation.name,
    expansionCode: corporation.expansion_code,
    promoSetSlug: null,
  }));
}

export async function listPreludes(): Promise<PreludeOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('preludes')
    .select('id, name, expansion_code')
    .order('name');

  if (error) {
    throw error;
  }

  return data.map((prelude) => ({
    id: prelude.id,
    name: prelude.name,
    expansionCode: prelude.expansion_code,
  }));
}

export async function listMapMilestones(): Promise<MapMilestoneOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('map_milestones')
    .select('map_id, milestone_id, milestones(name)');

  if (error) {
    throw error;
  }

  return (data as Array<{
    map_id: string;
    milestone_id: string;
    milestones: JoinedName | JoinedName[] | null;
  }>).map((row) => ({
    mapId: row.map_id,
    milestoneId: row.milestone_id,
    milestoneName:
      Array.isArray(row.milestones) ? row.milestones[0]?.name ?? '' : row.milestones?.name ?? '',
  }));
}

export async function listMapAwards(): Promise<MapAwardOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('map_awards')
    .select('map_id, award_id, awards(name)');

  if (error) {
    throw error;
  }

  return (data as Array<{
    map_id: string;
    award_id: string;
    awards: JoinedName | JoinedName[] | null;
  }>).map((row) => ({
    mapId: row.map_id,
    awardId: row.award_id,
    awardName:
      Array.isArray(row.awards) ? row.awards[0]?.name ?? '' : row.awards?.name ?? '',
  }));
}

export async function listStyles(): Promise<StyleOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('style_definitions')
    .select('id, code, name')
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function listCards(): Promise<CardOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select('id, card_number, card_name, expansion_code')
    .order('card_name');

  if (error) {
    throw error;
  }

  return data.map((card) => ({
    id: card.id,
    cardNumber: card.card_number,
    cardName: card.card_name,
    expansionCode: card.expansion_code,
    promoSetSlug: null,
  }));
}

export async function listPromoCards(): Promise<PromoCardOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select(
      'id, promo_set_id, card_number, card_name, card_type, expansion_code, image_url, thumbnail_path, full_image_path',
    )
    .not('promo_set_id', 'is', null)
    .order('card_number')
    .order('card_name');

  if (error) {
    throw error;
  }

  return (data as Array<{
    card_name: string;
    card_number: string;
    card_type: string;
    expansion_code: string;
    full_image_path: string | null;
    id: string;
    image_url: string;
    promo_set_id: string | null;
    thumbnail_path: string | null;
  }>)
    .filter((card): card is {
      card_name: string;
      card_number: string;
      card_type: string;
      expansion_code: string;
      full_image_path: string | null;
      id: string;
      image_url: string;
      promo_set_id: string;
      thumbnail_path: string | null;
    } => Boolean(card.promo_set_id))
    .map((card) => ({
      id: card.id,
      promoSetId: card.promo_set_id,
      cardNumber: card.card_number,
      cardName: card.card_name,
      cardType: card.card_type,
      expansionCode: card.expansion_code,
      thumbnailUrl: card.thumbnail_path ?? card.full_image_path ?? card.image_url,
      fullImageUrl: card.full_image_path ?? card.image_url,
    }));
}

export async function getLatestCatalogSnapshotId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('catalog_snapshots')
    .select('id')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}
