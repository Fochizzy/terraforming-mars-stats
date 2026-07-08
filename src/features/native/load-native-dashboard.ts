import { nativeSupabase } from '@/lib/supabase/native';

export type NativeDashboardAccent =
  | 'copper'
  | 'greenery'
  | 'heat'
  | 'ocean'
  | 'sand';

export type NativeDashboardMetric = {
  label: string;
  value: string;
};

export type NativeDashboardBarRow = {
  accent: NativeDashboardAccent;
  detail: string;
  label: string;
  value: number;
};

export type NativeDashboardRecordRow = {
  detail: string;
  label: string;
  record: string;
};

export type NativeDashboardCoverageBadge = {
  label: string;
  value: number;
};

export type NativeDashboardTrendRow = {
  label: string;
  value: number;
};

export type NativeDashboardSection = {
  coverageBadges?: NativeDashboardCoverageBadge[];
  headline?: string;
  headToHeadRows?: NativeDashboardRecordRow[];
  leaderboardRows?: NativeDashboardBarRow[];
  mapRows?: NativeDashboardBarRow[];
  metrics?: NativeDashboardMetric[];
  rivalRows?: NativeDashboardRecordRow[];
  scoreSourceRows?: NativeDashboardBarRow[];
  subtitle?: string;
  summary?: string;
  title: string;
  trendRows?: NativeDashboardTrendRow[];
};

export type NativeDashboardData = {
  emptyState?: {
    body: string;
    title: string;
  };
  global: NativeDashboardSection | null;
  group: NativeDashboardSection | null;
  groupName: null | string;
  profile: NativeDashboardSection | null;
  sessionEmail: string;
};

type GroupMembershipRow = {
  group_id: string;
  groups: null | { name?: string } | Array<{ name?: string }>;
  role: 'editor' | 'owner' | 'viewer';
};

type LinkedPlayerRow = {
  display_name: string;
  group_id: string;
  id: string;
};

type RawLeaderboardRow = {
  average_score: number | string;
  games_played: number;
  player_id: string;
  player_name: string;
  weighted_score: number | string;
  win_rate: number | string;
};

type RawHeadToHeadRow = {
  average_score_differential: number | string;
  games_played: number;
  left_player_id: string;
  left_player_name: string;
  left_wins: number;
  right_player_id: string;
  right_player_name: string;
  right_wins: number;
  ties: number;
};

type RawLineupEffectRow = {
  average_score: number | string;
  games_played: number;
  lineup_label: string | null;
  player_name: string;
  win_rate: number | string;
};

type RawPlayerScoreAveragesRow = {
  average_animal_points: number | string;
  average_award_points: number | string;
  average_card_points: number | string;
  average_cities_points: number | string;
  average_greenery_points: number | string;
  average_jovian_points: number | string;
  average_microbe_points: number | string;
  average_milestone_points: number | string;
  average_other_card_points: number | string;
  average_tr_points: number | string;
};

type RawPlayerCoverageRow = {
  animal_coverage: number | string;
  card_breakdown_coverage: number | string;
  declared_style_coverage: number | string;
  jovian_coverage: number | string;
  key_card_coverage: number | string;
  microbe_coverage: number | string;
};

type RawStyleAgreementRow = {
  exact_match_rate: number | string;
  mismatch_rate: number | string;
  partial_match_rate: number | string;
  player_id: string;
  player_name: string;
};

type RawTrendRow = {
  played_on: string;
  total_points: number | string;
};

type RawGlobalCorporationRow = {
  average_score: number | string;
  corporation_id: string;
  corporation_name: string;
  games_played: number;
  win_rate: number | string;
  wins: number;
};

type RawPlayerMetricSummaryRow = {
  average_award_roi: number | string | null;
  average_normalized_efficiency: number | string | null;
  average_points_per_generation: number | string | null;
  average_score_delta_vs_expected: number | string | null;
  best_score_source: null | string;
  best_tag_lane: null | string;
  games_played: number | string | null;
  tag_evidence_coverage: number | string | null;
};

type RawGlobalMapMetricSummaryRow = {
  average_generations: number | string | null;
  average_points: number | string | null;
  average_points_per_generation: number | string | null;
  expected_score_baseline: number | string | null;
  games_played: number | string | null;
  map_id: string;
  maps: null | { name?: string } | Array<{ name?: string }>;
  player_count: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toOptionalNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatFixedAverage(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatSignedAverage(value: number) {
  const formatted = formatAverage(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function getJoinedGroupName(value: GroupMembershipRow['groups']) {
  if (Array.isArray(value)) {
    return value[0]?.name?.trim() ?? '';
  }

  return value?.name?.trim() ?? '';
}

function getJoinedMapName(value: RawGlobalMapMetricSummaryRow['maps']) {
  if (Array.isArray(value)) {
    return value[0]?.name?.trim() ?? '';
  }

  return value?.name?.trim() ?? '';
}

function buildPersistedProfileMetrics(
  row: RawPlayerMetricSummaryRow | null,
): NativeDashboardMetric[] {
  if (!row) {
    return [];
  }

  const pointsPerGeneration = toOptionalNumber(row.average_points_per_generation);
  const normalizedEfficiency = toOptionalNumber(row.average_normalized_efficiency);
  const expectedDelta = toOptionalNumber(row.average_score_delta_vs_expected);
  const awardRoi = toOptionalNumber(row.average_award_roi);

  return [
    pointsPerGeneration === null
      ? null
      : {
          label: 'Points Per Generation',
          value: `${formatAverage(pointsPerGeneration)} pts/gen`,
        },
    normalizedEfficiency === null
      ? null
      : {
          label: 'Normalized Efficiency',
          value: formatFixedAverage(normalizedEfficiency),
        },
    expectedDelta === null
      ? null
      : {
          label: 'Expected Delta',
          value: formatSignedAverage(expectedDelta),
        },
    awardRoi === null
      ? null
      : {
          label: 'Award ROI',
          value: formatFixedAverage(awardRoi),
        },
  ].filter((metric): metric is NativeDashboardMetric => metric !== null);
}

function buildScoreSourceRows(
  row: RawPlayerScoreAveragesRow | null,
): NativeDashboardBarRow[] {
  if (!row) {
    return [];
  }

  return [
    {
      accent: 'ocean',
      detail: `${formatAverage(toNumber(row.average_tr_points))} avg points`,
      label: 'Terraform Rating',
      value: toNumber(row.average_tr_points),
    },
    {
      accent: 'copper',
      detail: `${formatAverage(toNumber(row.average_card_points))} avg points`,
      label: 'Card Points',
      value: toNumber(row.average_card_points),
    },
    {
      accent: 'greenery',
      detail: `${formatAverage(toNumber(row.average_greenery_points))} avg points`,
      label: 'Greenery',
      value: toNumber(row.average_greenery_points),
    },
    {
      accent: 'sand',
      detail: `${formatAverage(toNumber(row.average_cities_points))} avg points`,
      label: 'Cities',
      value: toNumber(row.average_cities_points),
    },
    {
      accent: 'heat',
      detail: `${formatAverage(
        toNumber(row.average_milestone_points) +
          toNumber(row.average_award_points),
      )} avg bonus`,
      label: 'Milestones + Awards',
      value:
        toNumber(row.average_milestone_points) +
        toNumber(row.average_award_points),
    },
  ];
}

function buildCoverageBadges(
  row: RawPlayerCoverageRow | null,
): NativeDashboardCoverageBadge[] {
  if (!row) {
    return [];
  }

  return [
    {
      label: 'Full card breakdown',
      value: toNumber(row.card_breakdown_coverage),
    },
    {
      label: 'Microbe coverage',
      value: toNumber(row.microbe_coverage),
    },
    {
      label: 'Animal coverage',
      value: toNumber(row.animal_coverage),
    },
    {
      label: 'Jovian coverage',
      value: toNumber(row.jovian_coverage),
    },
    {
      label: 'Declared style coverage',
      value: toNumber(row.declared_style_coverage),
    },
    {
      label: 'Key-card coverage',
      value: toNumber(row.key_card_coverage),
    },
  ];
}

function buildProfileRivalRows(
  rows: RawHeadToHeadRow[],
  playerId: string,
): NativeDashboardRecordRow[] {
  return rows
    .flatMap((row) => {
      if (row.left_player_id === playerId) {
        return [
          {
            detail: `Score edge ${formatAverage(toNumber(row.average_score_differential))}`,
            label: row.right_player_name,
            record: `${row.left_wins}-${row.right_wins}-${row.ties}`,
          },
        ];
      }

      if (row.right_player_id === playerId) {
        return [
          {
            detail: `Score edge ${formatAverage(toNumber(row.average_score_differential) * -1)}`,
            label: row.left_player_name,
            record: `${row.right_wins}-${row.left_wins}-${row.ties}`,
          },
        ];
      }

      return [];
    })
    .sort((left, right) => left.label.localeCompare(right.label))
    .slice(0, 4);
}

function buildGroupHeadToHeadRows(
  rows: RawHeadToHeadRow[],
): NativeDashboardRecordRow[] {
  return [...rows]
    .sort(
      (left, right) =>
        right.games_played - left.games_played ||
        Math.abs(toNumber(right.average_score_differential)) -
          Math.abs(toNumber(left.average_score_differential)),
    )
    .slice(0, 4)
    .map((row) => ({
      detail: `${formatAverage(toNumber(row.average_score_differential))} average point edge`,
      label: `${row.left_player_name} vs ${row.right_player_name}`,
      record: `${row.left_wins}-${row.right_wins}-${row.ties}`,
    }));
}

function buildLeaderboardRows(
  rows: RawLeaderboardRow[],
  focusPlayerId?: string,
): NativeDashboardBarRow[] {
  return [...rows]
    .sort(
      (left, right) =>
        toNumber(right.weighted_score) - toNumber(left.weighted_score) ||
        right.player_name.localeCompare(left.player_name),
    )
    .slice(0, 5)
    .map((row) => ({
      accent: row.player_id === focusPlayerId ? 'heat' : 'copper',
      detail: `${formatPercent(toNumber(row.win_rate))} win rate | ${formatAverage(
        toNumber(row.average_score),
      )} avg pts`,
      label: row.player_name,
      value: toNumber(row.weighted_score),
    }));
}

function buildTrendRows(rows: RawTrendRow[]): NativeDashboardTrendRow[] {
  const grouped = rows.reduce<
    Record<string, { scoreTotal: number; sampleSize: number }>
  >((accumulator, row) => {
    const entry = accumulator[row.played_on] ?? {
      sampleSize: 0,
      scoreTotal: 0,
    };

    entry.sampleSize += 1;
    entry.scoreTotal += toNumber(row.total_points);
    accumulator[row.played_on] = entry;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-6)
    .map(([playedOn, entry]) => ({
      label: playedOn.slice(5),
      value: Number((entry.scoreTotal / entry.sampleSize).toFixed(1)),
    }));
}

function buildGlobalLeaderboardRows(
  rows: RawGlobalCorporationRow[],
): NativeDashboardBarRow[] {
  const aggregated = rows.reduce<
    Record<
      string,
      {
        averageScoreWeightedTotal: number;
        corporationName: string;
        gamesPlayed: number;
        wins: number;
      }
    >
  >((accumulator, row) => {
    const current = accumulator[row.corporation_id] ?? {
      averageScoreWeightedTotal: 0,
      corporationName: row.corporation_name,
      gamesPlayed: 0,
      wins: 0,
    };

    current.averageScoreWeightedTotal +=
      toNumber(row.average_score) * row.games_played;
    current.gamesPlayed += row.games_played;
    current.wins += row.wins;
    accumulator[row.corporation_id] = current;
    return accumulator;
  }, {});

  return Object.values(aggregated)
    .filter((row) => row.gamesPlayed > 0)
    .sort(
      (left, right) =>
        right.wins / right.gamesPlayed - left.wins / left.gamesPlayed ||
        right.gamesPlayed - left.gamesPlayed ||
        left.corporationName.localeCompare(right.corporationName),
    )
    .slice(0, 5)
    .map((row, index) => ({
      accent: index === 0 ? 'heat' : 'sand',
      detail: `${row.gamesPlayed} opted-in plays | ${formatAverage(
        row.averageScoreWeightedTotal / row.gamesPlayed,
      )} avg pts`,
      label: row.corporationName,
      value: row.wins / row.gamesPlayed,
    }));
}

function buildGlobalMapRows(
  rows: RawGlobalMapMetricSummaryRow[],
): NativeDashboardBarRow[] {
  return [...rows]
    .filter((row) => toOptionalNumber(row.average_points_per_generation) !== null)
    .sort(
      (left, right) =>
        toNumber(right.average_points_per_generation) -
          toNumber(left.average_points_per_generation) ||
        toNumber(right.games_played) - toNumber(left.games_played) ||
        getJoinedMapName(left.maps).localeCompare(getJoinedMapName(right.maps)),
    )
    .slice(0, 5)
    .map((row, index) => {
      const averagePoints = toOptionalNumber(row.average_points);
      const averageGenerations = toOptionalNumber(row.average_generations);
      const gamesPlayed = toNumber(row.games_played);
      const playerCount = toNumber(row.player_count);

      return {
        accent: index === 0 ? 'ocean' : 'greenery',
        detail: `${averagePoints === null ? '--' : formatAverage(averagePoints)} avg pts | ${
          averageGenerations === null ? '--' : formatAverage(averageGenerations)
        } gens | ${gamesPlayed} games | ${playerCount} players`,
        label: getJoinedMapName(row.maps) || 'Unknown Map',
        value: toNumber(row.average_points_per_generation),
      };
    });
}

function selectCurrentMembership(
  memberships: GroupMembershipRow[],
  lastActiveGroupId: null | string,
) {
  return (
    memberships.find((membership) => membership.group_id === lastActiveGroupId) ??
    memberships[0] ??
    null
  );
}

export async function loadNativeDashboard(): Promise<NativeDashboardData | null> {
  const {
    data: { session },
  } = await nativeSupabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const sessionEmail = session.user.email ?? 'your account';

  const [{ data: profileRow, error: profileError }, { data: memberships, error: membershipsError }, { data: linkedPlayers, error: linkedPlayersError }] =
    await Promise.all([
      nativeSupabase
        .from('user_profiles')
        .select('last_active_group_id')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      nativeSupabase
        .from('group_members')
        .select('group_id, role, groups(name)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true }),
      nativeSupabase
        .from('players')
        .select('id, group_id, display_name')
        .eq('linked_user_id', session.user.id)
        .order('created_at', { ascending: true })
        .order('display_name', { ascending: true }),
    ]);

  if (profileError) {
    throw profileError;
  }

  if (membershipsError) {
    throw membershipsError;
  }

  if (linkedPlayersError) {
    throw linkedPlayersError;
  }

  const currentMembership = selectCurrentMembership(
    ((memberships ?? []) as GroupMembershipRow[]),
    profileRow?.last_active_group_id ?? null,
  );

  if (!currentMembership) {
    return {
      emptyState: {
        body:
          'Claim one of your saved player seats to unlock the My Profile, Group, and global analytics stack on this device.',
        title: 'No Active Group Yet',
      },
      global: null,
      group: null,
      groupName: null,
      profile: null,
      sessionEmail,
    };
  }

  const currentGroupId = currentMembership.group_id;
  const currentGroupName = getJoinedGroupName(currentMembership.groups) || 'Your Group';
  const currentPlayer =
    ((linkedPlayers ?? []) as LinkedPlayerRow[]).find(
      (player) => player.group_id === currentGroupId,
    ) ?? null;

  const analyticsClient = nativeSupabase.schema('analytics');

  const [
    leaderboardResult,
    headToHeadResult,
    lineupResult,
    styleAgreementResult,
    trendResult,
    globalResult,
    playerPerformanceResult,
    playerScoreResult,
    playerCoverageResult,
    playerMetricSummaryResult,
    globalMapMetricResult,
  ] = await Promise.all([
    analyticsClient
      .from('group_leaderboard')
      .select('player_id, player_name, weighted_score, win_rate, average_score, games_played')
      .eq('group_id', currentGroupId),
    analyticsClient
      .from('head_to_head')
      .select('left_player_id, left_player_name, right_player_id, right_player_name, games_played, left_wins, right_wins, ties, average_score_differential')
      .eq('group_id', currentGroupId),
    analyticsClient
      .from('lineup_effects')
      .select('player_name, lineup_label, games_played, win_rate, average_score')
      .eq('group_id', currentGroupId),
    analyticsClient
      .from('style_agreement')
      .select('player_id, player_name, exact_match_rate, partial_match_rate, mismatch_rate')
      .eq('group_id', currentGroupId),
    analyticsClient
      .from('player_trends')
      .select('played_on, total_points')
      .eq('group_id', currentGroupId),
    analyticsClient
      .from('global_corporation_performance')
      .select('corporation_id, corporation_name, games_played, wins, win_rate, average_score'),
    currentPlayer
      ? analyticsClient
          .from('group_leaderboard')
          .select('player_id, player_name, weighted_score, win_rate, average_score, games_played')
          .eq('group_id', currentGroupId)
          .eq('player_id', currentPlayer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    currentPlayer
      ? analyticsClient
          .from('player_score_source_averages')
          .select(
            'average_animal_points, average_award_points, average_card_points, average_cities_points, average_greenery_points, average_jovian_points, average_microbe_points, average_milestone_points, average_other_card_points, average_tr_points',
          )
          .eq('group_id', currentGroupId)
          .eq('player_id', currentPlayer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    currentPlayer
      ? analyticsClient
          .from('player_data_coverage')
          .select(
            'animal_coverage, card_breakdown_coverage, declared_style_coverage, jovian_coverage, key_card_coverage, microbe_coverage',
          )
          .eq('group_id', currentGroupId)
          .eq('player_id', currentPlayer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    currentPlayer
      ? nativeSupabase
          .from('player_metric_summaries')
          .select(
            'average_points_per_generation, average_normalized_efficiency, average_score_delta_vs_expected, best_tag_lane, best_score_source, average_award_roi, tag_evidence_coverage, games_played',
          )
          .eq('group_id', currentGroupId)
          .eq('player_id', currentPlayer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    nativeSupabase
      .from('global_map_metric_summaries')
      .select(
        'map_id, maps(name), player_count, games_played, average_points, average_generations, average_points_per_generation, expected_score_baseline',
      )
      .order('average_points_per_generation', { ascending: false })
      .order('games_played', { ascending: false }),
  ]);

  for (const result of [
    leaderboardResult,
    headToHeadResult,
    lineupResult,
    styleAgreementResult,
    trendResult,
    globalResult,
    playerPerformanceResult,
    playerScoreResult,
    playerCoverageResult,
    playerMetricSummaryResult,
    globalMapMetricResult,
  ]) {
    if (result?.error) {
      throw result.error;
    }
  }

  const leaderboardRows = (leaderboardResult.data ?? []) as RawLeaderboardRow[];
  const headToHeadRows = (headToHeadResult.data ?? []) as RawHeadToHeadRow[];
  const lineupRows = (lineupResult.data ?? []) as RawLineupEffectRow[];
  const styleRows = (styleAgreementResult.data ?? []) as RawStyleAgreementRow[];
  const trendRows = (trendResult.data ?? []) as RawTrendRow[];
  const globalRows = (globalResult.data ?? []) as RawGlobalCorporationRow[];
  const playerPerformance = playerPerformanceResult.data as RawLeaderboardRow | null;
  const playerScoreRow = playerScoreResult.data as RawPlayerScoreAveragesRow | null;
  const playerCoverageRow = playerCoverageResult.data as RawPlayerCoverageRow | null;
  const playerMetricSummary =
    playerMetricSummaryResult.data as RawPlayerMetricSummaryRow | null;
  const globalMapMetricRows =
    (globalMapMetricResult.data ?? []) as RawGlobalMapMetricSummaryRow[];

  const topGroupLeader = leaderboardRows[0] ?? null;
  const topGlobalCorporation = buildGlobalLeaderboardRows(globalRows)[0] ?? null;
  const lineupHighlight = [...lineupRows]
    .sort(
      (left, right) =>
        toNumber(right.win_rate) - toNumber(left.win_rate) ||
        right.games_played - left.games_played,
    )
    .at(0);

  const playerStyle = currentPlayer
    ? styleRows.find((row) => row.player_id === currentPlayer.id) ?? null
    : null;

  const profileSection: NativeDashboardSection = currentPlayer
    ? {
        coverageBadges: buildCoverageBadges(playerCoverageRow),
        headline: currentPlayer.display_name,
        metrics: [
          {
            label: 'Weighted Score',
            value: playerPerformance
              ? formatAverage(toNumber(playerPerformance.weighted_score))
              : '—',
          },
          {
            label: 'Win Rate',
            value: playerPerformance
              ? formatPercent(toNumber(playerPerformance.win_rate))
              : '—',
          },
          {
            label: 'Average Score',
            value: playerPerformance
              ? formatAverage(toNumber(playerPerformance.average_score))
              : '—',
          },
          {
            label: 'Style Match',
            value: playerStyle
              ? formatPercent(toNumber(playerStyle.exact_match_rate))
              : '—',
          },
          ...buildPersistedProfileMetrics(playerMetricSummary),
        ],
        rivalRows: buildProfileRivalRows(headToHeadRows, currentPlayer.id),
        scoreSourceRows: buildScoreSourceRows(playerScoreRow),
        subtitle: playerPerformance
          ? `${playerPerformance.games_played} finalized games in ${currentGroupName}`
          : `Link more finalized results to ${currentGroupName} to deepen the profile view.`,
        title: 'Personal Stats',
      }
    : {
        headline: 'Claim Your Saved Player',
        metrics: [],
        rivalRows: [],
        scoreSourceRows: [],
        subtitle:
          'Link the saved player seat that belongs to you in this group so the native dashboard can unlock your personal charts.',
        title: 'Personal Stats',
      };

  const groupSection: NativeDashboardSection = {
    headToHeadRows: buildGroupHeadToHeadRows(headToHeadRows),
    leaderboardRows: buildLeaderboardRows(
      leaderboardRows,
      currentPlayer?.id,
    ),
    summary: topGroupLeader
      ? `${topGroupLeader.player_name} currently leads ${currentGroupName} at ${formatPercent(
          toNumber(topGroupLeader.win_rate),
        )} across ${topGroupLeader.games_played} finalized games.`
      : lineupHighlight
        ? `${lineupHighlight.player_name} has the sharpest current lineup form in ${currentGroupName}.`
        : `Finalize a few more games in ${currentGroupName} to light up the comparative charts.`,
    title: 'Comparative Stats',
    trendRows: buildTrendRows(trendRows),
  };

  const globalLeaderboardRows = buildGlobalLeaderboardRows(globalRows);
  const globalMapRows = buildGlobalMapRows(globalMapMetricRows);
  const topGlobalMap = globalMapMetricRows[0] ?? null;
  const globalSection: NativeDashboardSection | null =
    globalLeaderboardRows.length > 0 || globalMapRows.length > 0
      ? {
          leaderboardRows: globalLeaderboardRows,
          mapRows: globalMapRows,
          summary: topGlobalMap
            ? `${getJoinedMapName(topGlobalMap.maps) || 'The top map'} is the top global map baseline at ${formatAverage(
                toNumber(topGlobalMap.average_points_per_generation),
              )} pts/gen against ${formatAverage(
                toNumber(topGlobalMap.expected_score_baseline),
              )} expected points.`
            : topGlobalCorporation
              ? `${topGlobalCorporation.label} is setting the opted-in global pace right now.`
              : 'Opted-in global analytics are waiting on more finalized results.',
          title: 'Global Stats',
        }
      : null;

  return {
    global: globalSection,
    group: groupSection,
    groupName: currentGroupName,
    profile: profileSection,
    sessionEmail,
  };
}
