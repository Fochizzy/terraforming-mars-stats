import { ChartFrame } from '@/components/charts/chart-frame';
import { CorporationLogo } from '@/components/ui/corporation-logo';
import { TagLabel } from '@/components/ui/tag-icon';
import type {
  CrossGroupFocusPerson,
  FocusedHeadToHeadRow,
  GroupAnalytics,
  GroupInteractionRow,
  LeaderboardRow,
  ProfileStyleBreakdownRow,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import { buildScoreSourceEntries } from '@/lib/db/analytics-repo';
import type {
  ExtendedGroupAnalytics,
  TagOutcomeRow,
} from '@/lib/db/extended-analytics-repo';
import {
  formatAverage,
  formatPercentagePointDelta,
  formatPercent,
  formatSignedAverage,
} from './performance-delta';

type PlayerComparisonProps = {
  people: CrossGroupFocusPerson[];
  selfCanonicalId: string;
  selectedOpponentId?: string | null;
  overallAnalytics: Pick<GroupAnalytics, 'playerInteractionRows'>;
  overallExtended: Pick<ExtendedGroupAnalytics, 'tagOutcomeRows'>;
  unavailable?: boolean;
};

type TagSummary = {
  averageTagCount: number;
  tagCode: string;
  totalTagCount: number;
  winRate: number;
};

function getOpponentOptions(
  people: CrossGroupFocusPerson[],
  selfCanonicalId: string,
) {
  return people.filter((person) => person.canonicalId !== selfCanonicalId);
}

function getPrimaryStyle(rows: ProfileStyleBreakdownRow[] | undefined) {
  return rows?.[0] ?? null;
}

function getBestStyle(rows: ProfileStyleBreakdownRow[] | undefined) {
  return (
    [...(rows ?? [])].sort(
      (left, right) =>
        right.winRate - left.winRate ||
        right.gamesPlayed - left.gamesPlayed ||
        right.wins - left.wins ||
        left.styleName.localeCompare(right.styleName),
    )[0] ?? null
  );
}

function getTopInteractions(rows: GroupInteractionRow[], playerId: string) {
  return rows
    .filter(
      (row) =>
        'playerId' in row &&
        row.playerId === playerId &&
        row.interactionType === 'corporation_prelude_pair',
    )
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.winRate - left.winRate ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 3);
}

function summarizeTags(
  rows: TagOutcomeRow[],
  playerId: string,
  gameIds: string[],
): TagSummary[] {
  const scopedGameIds = new Set(gameIds);
  const playerResultRows = new Map<string, TagOutcomeRow>();

  for (const row of rows) {
    if (row.playerId !== playerId || !scopedGameIds.has(row.gameId)) {
      continue;
    }

    // player_tag_outcomes emits one row per selected corporation. Collapse
    // multi-corporation games back to one player/game/tag result here.
    const key = `${row.gameId}|${row.tagCode}`;
    if (!playerResultRows.has(key)) {
      playerResultRows.set(key, row);
    }
  }

  const gamesWithTagData = new Set(
    [...playerResultRows.values()].map((row) => row.gameId),
  );

  if (gamesWithTagData.size === 0) {
    return [];
  }

  const byTag = new Map<
    string,
    { gamesWithTag: number; totalTagCount: number; winsWithTag: number }
  >();

  for (const row of playerResultRows.values()) {
    const current = byTag.get(row.tagCode) ?? {
      gamesWithTag: 0,
      totalTagCount: 0,
      winsWithTag: 0,
    };
    current.totalTagCount += row.tagCount;
    if (row.tagCount > 0) {
      current.gamesWithTag += 1;
      current.winsWithTag += row.isWinner ? 1 : 0;
    }
    byTag.set(row.tagCode, current);
  }

  return [...byTag.entries()]
    .filter(([, total]) => total.totalTagCount > 0)
    .map(([tagCode, total]) => ({
      averageTagCount: total.totalTagCount / gamesWithTagData.size,
      tagCode,
      totalTagCount: total.totalTagCount,
      winRate:
        total.gamesWithTag > 0 ? total.winsWithTag / total.gamesWithTag : 0,
    }))
    .sort(
      (left, right) =>
        right.totalTagCount - left.totalTagCount ||
        right.averageTagCount - left.averageTagCount ||
        left.tagCode.localeCompare(right.tagCode),
    )
    .slice(0, 5);
}

function buildPointSourceRows(
  selfAverages: ScoreSourceAverages | null,
  opponentAverages: ScoreSourceAverages | null,
) {
  const selfEntries = new Map(
    selfAverages
      ? buildScoreSourceEntries(selfAverages).map((entry) => [entry.label, entry])
      : [],
  );
  const opponentEntries = new Map(
    opponentAverages
      ? buildScoreSourceEntries(opponentAverages).map((entry) => [
          entry.label,
          entry,
        ])
      : [],
  );
  const labels = [...new Set([...selfEntries.keys(), ...opponentEntries.keys()])];

  return labels
    .map((label) => {
      const selfValue = selfEntries.get(label)?.value ?? 0;
      const opponentValue = opponentEntries.get(label)?.value ?? 0;

      return {
        delta: selfValue - opponentValue,
        label,
        opponentValue,
        selfValue,
      };
    })
    .sort(
      (left, right) =>
        Math.max(right.selfValue, right.opponentValue) -
          Math.max(left.selfValue, left.opponentValue) ||
        Math.abs(right.delta) - Math.abs(left.delta) ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 6);
}

function findDirectRecord(
  rows: FocusedHeadToHeadRow[],
  opponent: CrossGroupFocusPerson,
) {
  return (
    rows.find((row) => row.opponentId === opponent.canonicalId) ??
    rows.find((row) => row.label.includes(opponent.displayName)) ??
    null
  );
}

function StatCard({
  delta,
  label,
  opponentValue,
  selfValue,
}: {
  delta?: string | null;
  label: string;
  opponentValue: string;
  selfValue: string;
}) {
  return (
    <div className="tm-stat-card">
      <dt className="tm-data-label">{label}</dt>
      <dd className="mt-2 grid gap-2 text-sm">
        <span className="flex items-center justify-between gap-3">
          <span className="tm-muted-copy">You</span>
          <span className="font-semibold text-stone-100">{selfValue}</span>
        </span>
        <span className="flex items-center justify-between gap-3">
          <span className="tm-muted-copy">Opponent</span>
          <span className="font-semibold text-stone-100">{opponentValue}</span>
        </span>
      </dd>
      {delta ? <dd className="tm-accent-copy mt-2 text-xs">{delta}</dd> : null}
    </div>
  );
}

function renderPerformanceStats({
  directRecord,
  opponentPerformance,
  selfPerformance,
}: {
  directRecord: FocusedHeadToHeadRow | null;
  opponentPerformance: LeaderboardRow | null;
  selfPerformance: LeaderboardRow | null;
}) {
  if (!selfPerformance || !opponentPerformance) {
    return (
      <p className="tm-muted-copy text-sm">
        Finalized-game performance appears once both players have logged results
        in games you share.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        delta={formatPercentagePointDelta(
          selfPerformance.winRate - opponentPerformance.winRate,
        )}
        label="Win Rate"
        opponentValue={formatPercent(opponentPerformance.winRate)}
        selfValue={formatPercent(selfPerformance.winRate)}
      />
      <StatCard
        delta={`${formatSignedAverage(
          opponentPerformance.averagePlacement -
            selfPerformance.averagePlacement,
        )} placement edge`}
        label="Average Placement"
        opponentValue={formatAverage(opponentPerformance.averagePlacement)}
        selfValue={formatAverage(selfPerformance.averagePlacement)}
      />
      <StatCard
        delta={`${formatSignedAverage(
          selfPerformance.averageScore - opponentPerformance.averageScore,
        )} points`}
        label="Average Score"
        opponentValue={formatAverage(opponentPerformance.averageScore)}
        selfValue={formatAverage(selfPerformance.averageScore)}
      />
      <StatCard
        delta={
          directRecord
            ? `${directRecord.wins}-${directRecord.losses}-${directRecord.ties} direct`
            : null
        }
        label="Shared Games"
        opponentValue={`${opponentPerformance.gamesPlayed} games`}
        selfValue={`${selfPerformance.gamesPlayed} games`}
      />
    </dl>
  );
}

function StyleSummary({
  label,
  rows,
}: {
  label: string;
  rows: ProfileStyleBreakdownRow[] | undefined;
}) {
  const primary = getPrimaryStyle(rows);
  const best = getBestStyle(rows);

  return (
    <article className="tm-stat-card">
      <h3 className="font-semibold text-stone-100">{label}</h3>
      {primary ? (
        <div className="mt-3 grid gap-3 text-sm">
          <p>
            <span className="tm-data-label">Most played</span>{' '}
            <span className="font-semibold text-stone-100">
              {primary.styleName}
            </span>
          </p>
          <p className="tm-muted-copy">
            {primary.gamesPlayed} games | {formatPercent(primary.playRate)} of
            style reads | {formatPercent(primary.winRate)} wins
          </p>
          {best && best.styleCode !== primary.styleCode ? (
            <p className="tm-muted-copy">
              Best result: {best.styleName} at {formatPercent(best.winRate)}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="tm-muted-copy mt-3 text-sm">
          No inferred-style reads yet.
        </p>
      )}
    </article>
  );
}

function TagSummaryList({
  label,
  rows,
}: {
  label: string;
  rows: TagSummary[];
}) {
  return (
    <article className="tm-stat-card">
      <h3 className="font-semibold text-stone-100">{label}</h3>
      {rows.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm">
          {rows.map((row) => (
            <li
              className="flex items-center justify-between gap-3"
              key={row.tagCode}
            >
              <TagLabel code={row.tagCode} />
              <span className="tm-muted-copy text-right">
                {formatAverage(row.averageTagCount)} / game |{' '}
                {formatPercent(row.winRate)} wins with tag
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tm-muted-copy mt-3 text-sm">
          No card-tag profile is available yet.
        </p>
      )}
    </article>
  );
}

function InteractionList({
  label,
  rows,
}: {
  label: string;
  rows: GroupInteractionRow[];
}) {
  return (
    <article className="tm-stat-card">
      <h3 className="font-semibold text-stone-100">{label}</h3>
      {rows.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm">
          {rows.map((row) => (
            <li className="flex items-start gap-2" key={`${row.label}-${row.gamesPlayed}`}>
              <CorporationLogo
                className="mt-0.5 h-6 w-12 shrink-0 rounded-sm"
                name={row.label.split(' | ')[0] ?? row.label}
                size={24}
              />
              <div className="min-w-0">
                <p className="font-semibold text-stone-100">{row.label}</p>
                <p className="tm-muted-copy mt-1">
                  {row.gamesPlayed} games | {formatPercent(row.winRate)} wins |
                  avg {formatAverage(row.averageScore)} points
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tm-muted-copy mt-3 text-sm">
          No corporation/prelude preferences are available yet.
        </p>
      )}
    </article>
  );
}

function buildAdditionalComparePoints({
  directRecord,
  opponentInteractions,
  opponentPointRows,
  opponentStyle,
  opponentTags,
  selfInteractions,
  selfPointRows,
  selfStyle,
  selfTags,
}: {
  directRecord: FocusedHeadToHeadRow | null;
  opponentInteractions: GroupInteractionRow[];
  opponentPointRows: ReturnType<typeof buildPointSourceRows>;
  opponentStyle: ProfileStyleBreakdownRow | null;
  opponentTags: TagSummary[];
  selfInteractions: GroupInteractionRow[];
  selfPointRows: ReturnType<typeof buildPointSourceRows>;
  selfStyle: ProfileStyleBreakdownRow | null;
  selfTags: TagSummary[];
}) {
  const suggestions: string[] = [];

  if (directRecord) {
    suggestions.push(
      `Pressure games: review the ${directRecord.gamesPlayed} direct matchups where the score edge is ${formatAverage(directRecord.averageScoreDifferential)} points.`,
    );
  }

  if (selfStyle && opponentStyle) {
    suggestions.push(
      selfStyle.styleCode === opponentStyle.styleCode
        ? `Style mirror: both profiles lean ${selfStyle.styleName}, so compare opening tempo and endgame point conversion.`
        : `Style clash: compare your ${selfStyle.styleName} games against their ${opponentStyle.styleName} games to see whose plan sets the pace.`,
    );
  }

  const biggestPointGap = selfPointRows[0] ?? opponentPointRows[0] ?? null;

  if (biggestPointGap) {
    suggestions.push(
      `Point-source gap: ${biggestPointGap.label} is worth checking because the current average gap is ${formatSignedAverage(biggestPointGap.delta)} points.`,
    );
  }

  if (selfTags[0] && opponentTags[0]) {
    suggestions.push(
      `Tag identity: compare ${selfTags[0].tagCode} tags against ${opponentTags[0].tagCode} tags to see whose engine cards show up more reliably.`,
    );
  }

  if (selfInteractions[0] && opponentInteractions[0]) {
    suggestions.push(
      `Selection comfort: compare ${selfInteractions[0].label} against ${opponentInteractions[0].label} when choosing corporations and preludes.`,
    );
  }

  if (suggestions.length < 3) {
    suggestions.push(
      'Data coverage: keep logging corporations, preludes, tag counts, milestones, awards, and full score-source rows so future comparisons can isolate the real swing points.',
    );
  }

  return suggestions.slice(0, 5);
}

export function PlayerComparison({
  people,
  selfCanonicalId,
  selectedOpponentId,
  overallAnalytics,
  overallExtended,
  unavailable = false,
}: PlayerComparisonProps) {
  const self = people.find((person) => person.canonicalId === selfCanonicalId) ?? null;
  const opponents = getOpponentOptions(people, selfCanonicalId);
  const selectedOpponent =
    opponents.find((person) => person.canonicalId === selectedOpponentId) ??
    opponents[0] ??
    null;

  if (unavailable) {
    return (
      <ChartFrame title="Player Comparison Unavailable">
        <p className="tm-muted-copy text-sm">
          We couldn&apos;t load your player comparison right now. Your logged
          games are still intact.
        </p>
      </ChartFrame>
    );
  }

  if (!self) {
    return (
      <ChartFrame title="Link Your Player">
        <p className="tm-muted-copy text-sm">
          Link a saved player profile to your account before comparing your play
          against opponents.
        </p>
      </ChartFrame>
    );
  }

  if (!selectedOpponent) {
    return (
      <ChartFrame title="No Faced Players Yet">
        <p className="tm-muted-copy text-sm">
          Direct player comparisons appear after you finalize a game with at
          least one other player.
        </p>
      </ChartFrame>
    );
  }

  const directRecord = findDirectRecord(
    self.bundle.headToHeadRows,
    selectedOpponent,
  );
  const selfStyle = getPrimaryStyle(self.bundle.styleBreakdownRows);
  const opponentStyle = getPrimaryStyle(
    selectedOpponent.bundle.styleBreakdownRows,
  );
  const selfTags = summarizeTags(
    overallExtended.tagOutcomeRows,
    selfCanonicalId,
    self.bundle.trendRows.map((row) => row.gameId),
  );
  const opponentTags = summarizeTags(
    overallExtended.tagOutcomeRows,
    selectedOpponent.canonicalId,
    selectedOpponent.bundle.trendRows.map((row) => row.gameId),
  );
  const selfInteractions = getTopInteractions(
    overallAnalytics.playerInteractionRows,
    selfCanonicalId,
  );
  const opponentInteractions = getTopInteractions(
    overallAnalytics.playerInteractionRows,
    selectedOpponent.canonicalId,
  );
  const pointSourceRows = buildPointSourceRows(
    self.bundle.scoreAverages,
    selectedOpponent.bundle.scoreAverages,
  );
  const additionalComparePoints = buildAdditionalComparePoints({
    directRecord,
    opponentInteractions,
    opponentPointRows: pointSourceRows,
    opponentStyle,
    opponentTags,
    selfInteractions,
    selfPointRows: pointSourceRows,
    selfStyle,
    selfTags,
  });

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Choose Player">
        <form
          action="/profile/compare"
          className="flex flex-wrap items-end gap-3"
          method="get"
        >
          <div className="grid gap-2">
            <label className="tm-data-label" htmlFor="compare-player">
              Player faced
            </label>
            <select
              className="tm-input min-w-56"
              defaultValue={selectedOpponent.canonicalId}
              id="compare-player"
              name="playerId"
            >
              {opponents.map((person) => (
                <option key={person.canonicalId} value={person.canonicalId}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </div>
          <button className="tm-button-primary px-4 py-2 text-xs" type="submit">
            Compare
          </button>
        </form>
        <p className="tm-muted-copy mt-3 text-sm">
          Comparing {self.displayName} with {selectedOpponent.displayName} from
          finalized games and logged selection details.
        </p>
      </ChartFrame>

      <ChartFrame title="Record and Win Rate">
        {directRecord ? (
          <p className="tm-muted-copy mb-3 text-sm">
            Direct record: {directRecord.wins}-{directRecord.losses}-
            {directRecord.ties} over {directRecord.gamesPlayed} shared games |
            score edge {formatAverage(directRecord.averageScoreDifferential)}.
          </p>
        ) : null}
        {renderPerformanceStats({
          directRecord,
          opponentPerformance: selectedOpponent.bundle.performance,
          selfPerformance: self.bundle.performance,
        })}
      </ChartFrame>

      <ChartFrame title="Playstyle">
        <div className="grid gap-3 lg:grid-cols-2">
          <StyleSummary label="You" rows={self.bundle.styleBreakdownRows} />
          <StyleSummary
            label={selectedOpponent.displayName}
            rows={selectedOpponent.bundle.styleBreakdownRows}
          />
        </div>
      </ChartFrame>

      <ChartFrame title="Preferred Point Sources">
        {pointSourceRows.length > 0 ? (
          <div className="grid gap-3">
            {pointSourceRows.map((row) => (
              <article className="tm-stat-card" key={row.label}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-stone-100">{row.label}</h3>
                  <p className="tm-accent-copy text-sm">
                    {formatSignedAverage(row.delta)} you vs opponent
                  </p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  You {formatAverage(row.selfValue)} |{' '}
                  {selectedOpponent.displayName}{' '}
                  {formatAverage(row.opponentValue)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="tm-muted-copy text-sm">
            Score-source preferences appear after score rows are finalized.
          </p>
        )}
      </ChartFrame>

      <ChartFrame title="Tag Profiles">
        <div className="grid gap-3 lg:grid-cols-2">
          <TagSummaryList label="You" rows={selfTags} />
          <TagSummaryList label={selectedOpponent.displayName} rows={opponentTags} />
        </div>
      </ChartFrame>

      <ChartFrame title="Preferred Corporations and Preludes">
        <div className="grid gap-3 lg:grid-cols-2">
          <InteractionList label="You" rows={selfInteractions} />
          <InteractionList
            label={selectedOpponent.displayName}
            rows={opponentInteractions}
          />
        </div>
      </ChartFrame>

      <ChartFrame title="Additional Compare Points">
        <ul className="grid list-disc gap-2 pl-5 text-sm text-stone-300">
          {additionalComparePoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </ChartFrame>
    </div>
  );
}
