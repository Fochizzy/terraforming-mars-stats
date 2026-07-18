import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  requiredExpansionCodes: string[];
};

export type PreludeOption = {
  id: string;
  name: string;
  expansionCode: string;
  promoSetSlug: string | null;
  requiredExpansionCodes: string[];
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
  requiredExpansionCodes: string[];
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

export type CardScoringReference = {
  id: string;
  sourceCardId: string;
  cardNumber: string;
  cardName: string;
  cardType: string;
  expansionCode: string;
  promoSetSlug: string | null;
  requiredExpansionCodes: string[];
  imageUrl: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  sourceTags: string[];
};

export type CardLookupRecord = {
  id: string;
  cardNumber: string;
  cardName: string;
  cardType: string;
  expansionCode: string;
  promoSetSlug: string | null;
  printedVictoryPoints: number | null;
  requiredExpansionCodes: string[];
  thumbnailUrl: string;
  fullImageUrl: string;
  sourceTags: string[];
  victoryPointsKind: 'none' | 'static' | 'dynamic';
};

type JoinedName = {
  name: string;
};

type PromoSetLookupRow = {
  id: string;
  slug: string;
};

function normalizeExpansionCodeList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

async function resolvePromoSetSlugByIdMap(promoSetIds: string[]) {
  if (promoSetIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('promo_sets')
    .select('id, slug')
    .in('id', [...new Set(promoSetIds)]);

  if (error) {
    throw error;
  }

  return new Map(
    (data as PromoSetLookupRow[]).map((promoSet) => [promoSet.id, promoSet.slug]),
  );
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
    .not('promo_year', 'is', null)
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
    .select('id, name, expansion_code, promo_set_id, required_expansion_codes')
    .order('name');

  if (error) {
    throw error;
  }

  const promoSetSlugById = await resolvePromoSetSlugByIdMap(
    data
      .map((corporation) => corporation.promo_set_id)
      .filter((promoSetId): promoSetId is string => Boolean(promoSetId)),
  );

  return data.map((corporation) => ({
    id: corporation.id,
    name: corporation.name,
    expansionCode: corporation.expansion_code,
    promoSetSlug: corporation.promo_set_id
      ? promoSetSlugById.get(corporation.promo_set_id) ?? null
      : null,
    requiredExpansionCodes: normalizeExpansionCodeList(
      corporation.required_expansion_codes,
    ),
  }));
}

export async function listPreludes(): Promise<PreludeOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('preludes')
    .select('id, name, expansion_code, promo_set_id, required_expansion_codes')
    .order('name');

  if (error) {
    throw error;
  }

  const promoSetSlugById = await resolvePromoSetSlugByIdMap(
    data
      .map((prelude) => prelude.promo_set_id)
      .filter((promoSetId): promoSetId is string => Boolean(promoSetId)),
  );

  return data.map((prelude) => ({
    id: prelude.id,
    name: prelude.name,
    expansionCode: prelude.expansion_code,
    promoSetSlug: prelude.promo_set_id
      ? promoSetSlugById.get(prelude.promo_set_id) ?? null
      : null,
    requiredExpansionCodes: normalizeExpansionCodeList(
      prelude.required_expansion_codes,
    ),
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

export type MapAwardGroup = {
  awardNames: string[];
  mapCode: string;
  mapId: string;
  mapName: string;
  milestoneNames: string[];
};

/**
 * Awards and milestones grouped by board map, so map-aware stats can show the
 * board image and reference slate without each analytics query rejoining them.
 */
export async function listMapAwardGroups(): Promise<MapAwardGroup[]> {
  const [maps, mapAwards, mapMilestones] = await Promise.all([
    listMaps(),
    listMapAwards(),
    listMapMilestones(),
  ]);
  const mapById = new Map(maps.map((map) => [map.id, map]));
  const byMapId = new Map<string, MapAwardGroup>(
    maps.map((map) => [
      map.id,
      {
        awardNames: [],
        mapCode: map.code,
        mapId: map.id,
        mapName: map.name,
        milestoneNames: [],
      },
    ]),
  );
  const ensureGroup = (mapId: string) => {
    const map = mapById.get(mapId);

    if (!map) {
      return null;
    }

    return byMapId.get(map.id) ?? null;
  };

  for (const mapAward of mapAwards) {
    const group = ensureGroup(mapAward.mapId);

    if (!group || !mapAward.awardName) {
      continue;
    }

    if (!group.awardNames.includes(mapAward.awardName)) {
      group.awardNames.push(mapAward.awardName);
    }
  }

  for (const mapMilestone of mapMilestones) {
    const group = ensureGroup(mapMilestone.mapId);

    if (!group || !mapMilestone.milestoneName) {
      continue;
    }

    if (!group.milestoneNames.includes(mapMilestone.milestoneName)) {
      group.milestoneNames.push(mapMilestone.milestoneName);
    }
  }

  return [...byMapId.values()]
    .map((group) => ({
      ...group,
      awardNames: [...group.awardNames].sort((left, right) =>
        left.localeCompare(right),
      ),
      milestoneNames: [...group.milestoneNames].sort((left, right) =>
        left.localeCompare(right),
      ),
    }))
    .sort((left, right) => left.mapName.localeCompare(right.mapName));
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
    .select(
      'id, card_number, card_name, expansion_code, promo_set_id, required_expansion_codes',
    )
    .eq('card_type', 'Project')
    .order('card_name');

  if (error) {
    throw error;
  }

  const promoSetSlugById = await resolvePromoSetSlugByIdMap(
    data
      .map((card) => card.promo_set_id)
      .filter((promoSetId): promoSetId is string => Boolean(promoSetId)),
  );

  return data.map((card) => ({
    id: card.id,
    cardNumber: card.card_number,
    cardName: card.card_name,
    expansionCode: card.expansion_code,
    promoSetSlug: card.promo_set_id
      ? promoSetSlugById.get(card.promo_set_id) ?? null
      : null,
    requiredExpansionCodes: normalizeExpansionCodeList(
      card.required_expansion_codes,
    ),
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

export async function listCardScoringReferences(): Promise<CardScoringReference[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select(
      [
        'id',
        'source_card_id',
        'card_number',
        'card_name',
        'card_type',
        'expansion_code',
        'promo_set_id',
        'required_expansion_codes',
        'image_url',
        'thumbnail_path',
        'full_image_path',
        'gameplay_tags',
      ].join(', '),
    )
    .eq('card_type', 'Project')
    .order('card_name');

  if (error) {
    throw error;
  }

  const cardRows = data as unknown as Array<{
    card_name: string;
    card_number: string;
    card_type: string;
    expansion_code: string;
    full_image_path: string | null;
    gameplay_tags: unknown;
    id: string;
    image_url: string;
    promo_set_id: string | null;
    required_expansion_codes: unknown;
    source_card_id: string;
    thumbnail_path: string | null;
  }>;

  const promoSetSlugById = await resolvePromoSetSlugByIdMap(
    cardRows
      .map((card) => card.promo_set_id)
      .filter((promoSetId): promoSetId is string => Boolean(promoSetId)),
  );

  return cardRows.map((card) => ({
    id: card.id,
    sourceCardId: card.source_card_id,
    cardNumber: card.card_number,
    cardName: card.card_name,
    cardType: card.card_type,
    expansionCode: card.expansion_code,
    promoSetSlug: card.promo_set_id
      ? promoSetSlugById.get(card.promo_set_id) ?? null
      : null,
    requiredExpansionCodes: normalizeExpansionCodeList(
      card.required_expansion_codes,
    ),
    imageUrl: card.image_url,
    thumbnailUrl: card.thumbnail_path ?? card.full_image_path ?? card.image_url,
    fullImageUrl: card.full_image_path ?? card.image_url,
    sourceTags: normalizeGameplayTagList(card.gameplay_tags),
  }));
}

function normalizeGameplayTagList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string')
    : [];
}

function normalizeVictoryPointsKind(value: unknown): 'none' | 'static' | 'dynamic' {
  return value === 'static' || value === 'dynamic' ? value : 'none';
}

export async function listCardLookupRecords(): Promise<CardLookupRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select(
      [
        'id',
        'card_number',
        'card_name',
        'card_type',
        'expansion_code',
        'promo_set_id',
        'required_expansion_codes',
        'image_url',
        'thumbnail_path',
        'full_image_path',
        'gameplay_tags',
        'printed_victory_points',
        'victory_points_kind',
      ].join(', '),
    )
    .order('card_name');

  if (error) {
    throw error;
  }

  const cardRows = data as unknown as Array<{
    card_name: string;
    card_number: string;
    card_type: string;
    expansion_code: string;
    full_image_path: string | null;
    gameplay_tags: unknown;
    id: string;
    image_url: string;
    promo_set_id: string | null;
    printed_victory_points: number | null;
    required_expansion_codes: unknown;
    thumbnail_path: string | null;
    victory_points_kind: unknown;
  }>;

  const promoSetSlugById = await resolvePromoSetSlugByIdMap(
    cardRows
      .map((card) => card.promo_set_id)
      .filter((promoSetId): promoSetId is string => Boolean(promoSetId)),
  );

  return cardRows.map((card) => ({
    id: card.id,
    cardNumber: card.card_number,
    cardName: card.card_name,
    cardType: card.card_type,
    expansionCode: card.expansion_code,
    promoSetSlug: card.promo_set_id
      ? promoSetSlugById.get(card.promo_set_id) ?? null
      : null,
    requiredExpansionCodes: normalizeExpansionCodeList(
      card.required_expansion_codes,
    ),
    thumbnailUrl: card.thumbnail_path ?? card.full_image_path ?? card.image_url,
    fullImageUrl: card.full_image_path ?? card.image_url,
    printedVictoryPoints: card.printed_victory_points,
    sourceTags: normalizeGameplayTagList(card.gameplay_tags),
    victoryPointsKind: normalizeVictoryPointsKind(card.victory_points_kind),
  }));
}

export type CardTagReference = {
  id: string;
  cardName: string;
  cardType: string;
  sourceTags: string[];
  fullImageUrl: string;
};

export async function listCardTagReferences(): Promise<CardTagReference[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select('id, card_name, card_type, gameplay_tags, image_url, full_image_path')
    .in('card_type', ['Project', 'Corporation', 'Prelude'])
    .order('card_name');

  if (error) {
    throw error;
  }

  return (data as unknown as Array<{
    card_name: string;
    card_type: string;
    full_image_path: string | null;
    gameplay_tags: unknown;
    id: string;
    image_url: string;
  }>).map((card) => ({
    id: card.id,
    cardName: card.card_name,
    cardType: card.card_type,
    sourceTags: normalizeGameplayTagList(card.gameplay_tags),
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
