import { TagLabel } from '@/components/ui/tag-icon';
import { ObjectiveInfoButton } from '@/components/ui/objective-info-button';
import type { MapAwardGroup } from '@/lib/db/reference-repo';
import type {
  CorporationSelectionStat,
  FinalTerraformingActionStat,
  HeadToHeadStats,
  MergerImpactStat,
  PreludeSelectionStat,
  SelectionDialogData,
  SelectionStats,
  SelectionStatRow,
  TagWinStat,
} from '@/lib/db/selection-stats-repo';
import { AwardFundingByMap } from './award-funding-by-map';
import { CorporationPreludePairings } from './corporation-prelude-pairings';
import { SelectionStatTable } from './selection-stat-table';
import { CorporationTagProfiles } from './corporation-tag-profiles';
import {
  SELECTION_NAME_LINK_CLASS,
  SelectionNameButton,
} from './selection-name-link';
import { SelectionOriginChart } from './selection-origin-chart';

type SelectionStatsSectionProps = {
  dialogData?: SelectionDialogData;
  global: SelectionStats;
  headToHead: HeadToHeadStats;
  finalTerraformingActions: FinalTerraformingActionStat[];
  mapAwardGroups?: MapAwardGroup[];
  mergerImpact: MergerImpactStat[];
  personal: SelectionStats;
};

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function formatNullableWinRate(winRate: number | null) {
  return winRate === null ? '-' : formatWinRate(winRate);
}

function formatWinRateDelta(winRateDelta: number | null) {
  if (winRateDelta === null) {
    return '-';
  }

  const formatted = formatWinRate(Math.abs(winRateDelta));
  if (winRateDelta === 0) {
    return formatted;
  }

  return winRateDelta > 0 ? `+${formatted}` : `-${formatted}`;
}

function formatWins(wins: number) {
  return `${wins} ${wins === 1 ? 'win' : 'wins'}`;
}

function formatActionType(actionType: string | null | undefined) {
  switch (actionType) {
    case 'ocean':
      return 'Ocean';
    case 'oxygen':
      return 'Oxygen';
    case 'temperature':
      return 'Temperature';
    default:
      return 'Unknown';
  }
}

function formatAverageNumber(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  });
}

function formatPlayCount(plays: number) {
  return `${plays} ${plays === 1 ? 'play' : 'plays'}`;
}

function formatTagAverage(value: number | null) {
  if (value === null) {
    return 'no recorded average';
  }

  const rounded = Math.round(value * 10) / 10;
  return `${formatAverageNumber(rounded)} ${rounded === 1 ? 'tag' : 'tags'}`;
}

type SelectionValueSummary = {
  kind: 'Corporation' | 'Prelude';
  name: string;
  sentence: string;
};

type NamedSelectionStat = SelectionStatRow & {
  name: string;
};

function buildTopSelectionValueSummaries(
  rows: NamedSelectionStat[],
  kind: SelectionValueSummary['kind'],
): SelectionValueSummary[] {
  const label = kind.toLowerCase();

  return [...rows]
    .filter((row) => row.plays > 0)
    .sort(
      (left, right) =>
        right.avg_points - left.avg_points ||
        right.win_rate - left.win_rate ||
        right.plays - left.plays ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 2)
    .map((row) => ({
      kind,
      name: row.name,
      sentence: `ranks among the top ${label}s by average VP, averaging ${formatAverageNumber(
        row.avg_points,
      )} VP with a ${formatWinRate(row.win_rate)} win rate and ${formatAverageNumber(
        row.avg_placement,
      )} average placement across ${formatPlayCount(row.plays)}.`,
    }));
}

function buildSelectionValueSummaries(stats: SelectionStats) {
  return [
    ...buildTopSelectionValueSummaries(
      stats.corporations.map((row) => ({
        ...row,
        name: row.corporation_name,
      })),
      'Corporation',
    ),
    ...buildTopSelectionValueSummaries(
      stats.preludes.map((row) => ({
        ...row,
        name: row.prelude_name,
      })),
      'Prelude',
    ),
  ];
}

function buildTagTrendSentences(tagWins: TagWinStat[]) {
  return tagWins
    .filter(
      (tagWin) =>
        tagWin.samples > 0 &&
        (tagWin.avg_tags_in_wins !== null ||
          tagWin.avg_tags_in_losses !== null),
    )
    .sort((left, right) => {
      const sampleDelta = right.samples - left.samples;

      if (sampleDelta !== 0) {
        return sampleDelta;
      }

      const leftGap =
        left.avg_tags_in_wins !== null && left.avg_tags_in_losses !== null
          ? Math.abs(left.avg_tags_in_wins - left.avg_tags_in_losses)
          : 0;
      const rightGap =
        right.avg_tags_in_wins !== null && right.avg_tags_in_losses !== null
          ? Math.abs(right.avg_tags_in_wins - right.avg_tags_in_losses)
          : 0;

      return rightGap - leftGap || left.tag_code.localeCompare(right.tag_code);
    })
    .slice(0, 4)
    .map((tagWin) => {
      const winsAverage = formatTagAverage(tagWin.avg_tags_in_wins);
      const lossesAverage = formatTagAverage(tagWin.avg_tags_in_losses);

      if (tagWin.avg_tags_in_wins === null) {
        return {
          sentence: `has only losing-result evidence so far: losses average ${lossesAverage} across ${tagWin.samples} samples.`,
          tagCode: tagWin.tag_code,
        };
      }

      if (tagWin.avg_tags_in_losses === null) {
        return {
          sentence: `has only winning-result evidence so far: wins average ${winsAverage} across ${tagWin.samples} samples.`,
          tagCode: tagWin.tag_code,
        };
      }

      const gap = tagWin.avg_tags_in_wins - tagWin.avg_tags_in_losses;

      if (Math.abs(gap) < 0.05) {
        return {
          sentence: `is roughly even: wins average ${winsAverage} versus ${lossesAverage} in losses across ${tagWin.samples} samples.`,
          tagCode: tagWin.tag_code,
        };
      }

      return {
        sentence:
          gap > 0
            ? `appears more often in wins: winners average ${winsAverage} versus ${lossesAverage} in losses across ${tagWin.samples} samples.`
            : `appears less often in wins: winners average ${winsAverage} versus ${lossesAverage} in losses across ${tagWin.samples} samples.`,
        tagCode: tagWin.tag_code,
      };
    });
}

function rate(count: number, denominator: number) {
  return denominator > 0 ? count / denominator : 0;
}

function buildAwardStats(funding: {
  funded_count: number;
  funder_first_place_count?: number;
  funder_first_place_rate?: number;
  funder_game_won_count?: number;
  funder_game_won_rate?: number;
  funder_second_place_count?: number;
  funder_second_place_rate?: number;
  funder_won_count: number;
}) {
  const firstPlaceCount =
    funding.funder_first_place_count ?? funding.funder_won_count;
  const secondPlaceCount = funding.funder_second_place_count ?? 0;
  const gameWonCount = funding.funder_game_won_count ?? 0;

  return {
    firstPlace: {
      count: firstPlaceCount,
      denominator: funding.funded_count,
      rate:
        funding.funder_first_place_rate ??
        rate(firstPlaceCount, funding.funded_count),
    },
    fundedCount: funding.funded_count,
    gameWins: {
      count: gameWonCount,
      denominator: funding.funded_count,
      rate:
        funding.funder_game_won_rate ??
        rate(gameWonCount, funding.funded_count),
    },
    secondPlace: {
      count: secondPlaceCount,
      denominator: funding.funded_count,
      rate:
        funding.funder_second_place_rate ??
        rate(secondPlaceCount, funding.funded_count),
    },
  };
}

function SelectionStatRows(props: {
  rows: Array<
    (CorporationSelectionStat | PreludeSelectionStat) & { name: string }
  >;
  scopeTotalGames: number;
  globalTotalGames: number;
  globalPlaysByName: Map<string, number>;
  kind: 'Corporation' | 'Prelude';
  dialogData?: SelectionDialogData;
}) {
  return (
    <SelectionStatTable
      dialogData={props.dialogData}
      globalPlaysByName={props.globalPlaysByName}
      globalTotalGames={props.globalTotalGames}
      kind={props.kind}
      rows={props.rows}
      scopeTotalGames={props.scopeTotalGames}
    />
  );
}

export function SelectionStatsScope(props: {
  heading: string;
  stats: SelectionStats;
  /**
   * Global-scope stats used for the "Global playrate" column. Defaults to the
   * displayed stats (e.g. on the standalone Global Statistics page, where the
   * displayed scope already is global).
   */
  globalStats?: SelectionStats;
  /** Card art + win rates so corporation/prelude names can open a stats card. */
  dialogData?: SelectionDialogData;
  /**
   * Award-to-map reference data. When provided, Award Funding ROI becomes a
   * per-map dropdown with the map image; without it, it falls back to a flat
   * list (e.g. in unit tests that don't load reference data).
   */
  mapAwardGroups?: MapAwardGroup[];
}) {
  const globalStats = props.globalStats ?? props.stats;
  const globalCorpPlaysByName = new Map(
    globalStats.corporations.map((row) => [row.corporation_name, row.plays]),
  );
  const globalPreludePlaysByName = new Map(
    globalStats.preludes.map((row) => [row.prelude_name, row.plays]),
  );
  const isGlobalScope = props.stats === globalStats;
  const globalAwardFundingByName = new Map(
    globalStats.awardFunding.map((row) => [row.award_name, row]),
  );
  const hasData =
    props.stats.corporations.length > 0 ||
    props.stats.preludes.length > 0 ||
    props.stats.tagWins.length > 0;
  const tagTrendSentences = isGlobalScope
    ? buildTagTrendSentences(props.stats.tagWins)
    : [];
  const selectionValueSummaries = isGlobalScope
    ? buildSelectionValueSummaries(props.stats)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">{props.heading}</h3>
      {!hasData ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          No finalized games with corporation selections yet.
        </p>
      ) : (
        <>
          {selectionValueSummaries.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Global Value Summary
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {selectionValueSummaries.map((summary) => (
                  <li
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
                    key={`${summary.kind}-${summary.name}`}
                  >
                    <SelectionNameButton
                      className={`${SELECTION_NAME_LINK_CLASS} text-left`}
                      dialogData={props.dialogData}
                      kind={summary.kind}
                      name={summary.name}
                    />
                    {' '}
                    <span>{summary.sentence}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.stats.corporations.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Where Points Come From (share of VP by corporation)
              </h4>
              <SelectionOriginChart
                rows={props.stats.corporations.map((row) => ({
                  ...row,
                  name: row.corporation_name,
                }))}
              />
            </div>
          ) : null}
          {props.stats.preludes.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Where Points Come From (share of VP by prelude)
              </h4>
              <SelectionOriginChart
                rows={props.stats.preludes.map((row) => ({
                  ...row,
                  name: row.prelude_name,
                }))}
              />
            </div>
          ) : null}
          {props.stats.corporations.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Corporations
              </h4>
              <SelectionStatRows
                dialogData={props.dialogData}
                kind="Corporation"
                rows={props.stats.corporations.map((row) => ({
                  ...row,
                  name: row.corporation_name,
                }))}
                scopeTotalGames={props.stats.totalGames}
                globalTotalGames={globalStats.totalGames}
                globalPlaysByName={globalCorpPlaysByName}
              />
            </div>
          ) : null}
          {props.stats.preludes.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Preludes
              </h4>
              <SelectionStatRows
                dialogData={props.dialogData}
                kind="Prelude"
                rows={props.stats.preludes.map((row) => ({
                  ...row,
                  name: row.prelude_name,
                }))}
                scopeTotalGames={props.stats.totalGames}
                globalTotalGames={globalStats.totalGames}
                globalPlaysByName={globalPreludePlaysByName}
              />
            </div>
          ) : null}
          {props.stats.pairs.length > 0 ? (
            <CorporationPreludePairings
              dialogData={props.dialogData}
              rows={props.stats.pairs}
            />
          ) : null}
          {props.stats.awardFunding.length > 0 ? (
            props.mapAwardGroups && props.mapAwardGroups.length > 0 ? (
              <AwardFundingByMap
                globalRows={globalStats.awardFunding}
                mapGroups={props.mapAwardGroups}
                personalRows={isGlobalScope ? undefined : props.stats.awardFunding}
                rows={props.stats.awardFunding}
              />
            ) : (
              <div>
                <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                  Award Funding ROI
                </h4>
                <ul className="flex flex-col gap-1 text-xs">
                  {props.stats.awardFunding.map((funding) => (
                    <li key={funding.award_name}>
                      <ObjectiveInfoButton
                        awardStats={{
                          global: buildAwardStats(
                            globalAwardFundingByName.get(funding.award_name) ??
                              funding,
                          ),
                          personal: isGlobalScope
                            ? null
                            : buildAwardStats(funding),
                        }}
                        kind="award"
                        name={funding.award_name}
                      />
                      : funded {funding.funded_count}×,
                      funder took 1st {funding.funder_won_count}× (
                      {funding.funded_count > 0
                        ? Math.round(
                            (funding.funder_won_count / funding.funded_count) *
                              100,
                          )
                        : 0}
                      % ROI)
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
          {props.stats.tagWins.length > 0 ? (
            <div>
              {tagTrendSentences.length > 0 ? (
                <div className="mb-3">
                  <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                    Most Prevalent Tag Trends
                  </h4>
                  <ul className="flex flex-col gap-1 text-xs">
                    {tagTrendSentences.map((trend) => (
                      <li
                        className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
                        key={trend.tagCode}
                      >
                        <TagLabel code={trend.tagCode} />
                        {' '}
                        <span>{trend.sentence}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Tags in Wins vs Losses
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {props.stats.tagWins.map((tagWin) => (
                  <li className="flex items-center gap-1.5" key={tagWin.tag_code}>
                    <TagLabel code={tagWin.tag_code} />:{' '}
                    {tagWin.avg_tags_in_wins ?? '—'} per win vs{' '}
                    {tagWin.avg_tags_in_losses ?? '—'} per loss ({tagWin.samples}{' '}
                    samples)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.stats.corporationTags.length > 0 ? (
            <CorporationTagProfiles
              dialogData={props.dialogData}
              rows={props.stats.corporationTags}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function HeadToHeadBlock(props: {
  dialogData?: SelectionDialogData;
  headToHead: HeadToHeadStats;
}) {
  if (props.headToHead.pairs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Head-to-Head (This Group)</h3>
      <ul className="flex flex-col gap-1 text-xs">
        {props.headToHead.pairs.map((pair) => (
          <li key={`${pair.player_a}-${pair.player_b}`}>
            {pair.player_a} vs {pair.player_b}: {pair.player_a_wins}–
            {pair.player_b_wins} over {pair.games} games, avg margin{' '}
            {pair.avg_margin > 0 ? '+' : ''}
            {pair.avg_margin} VP for {pair.player_a}
          </li>
        ))}
      </ul>
      {props.headToHead.corporationMatchups.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
            Corporation Matchups
          </h4>
          <ul className="flex flex-col gap-1 text-xs">
            {props.headToHead.corporationMatchups.slice(0, 15).map((matchup) => (
              <li key={`${matchup.corporation_a}-${matchup.corporation_b}`}>
                <SelectionNameButton
                  dialogData={props.dialogData}
                  kind="Corporation"
                  name={matchup.corporation_a}
                />{' '}
                vs{' '}
                <SelectionNameButton
                  dialogData={props.dialogData}
                  kind="Corporation"
                  name={matchup.corporation_b}
                />
                :{' '}
                {matchup.corporation_a_wins}–{matchup.corporation_b_wins} over{' '}
                {matchup.games} games
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MergerImpactBlock(props: { rows: MergerImpactStat[] }) {
  if (props.rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Merger Impact (Imported Logs)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="tm-data-label">
              <th className="py-1 pr-3">Player</th>
              <th className="py-1 pr-3">Imported games</th>
              <th className="py-1 pr-3">Merger games</th>
              <th className="py-1 pr-3">Merger win rate</th>
              <th className="py-1 pr-3">Non-Merger win rate</th>
              <th className="py-1 pr-3">Delta</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr className="border-t border-white/5" key={row.player_id}>
                <td className="py-1 pr-3 font-semibold text-stone-100">
                  {row.player_name}
                </td>
                <td className="py-1 pr-3">{row.imported_games}</td>
                <td className="py-1 pr-3">
                  {row.merger_games} ({formatWinRate(row.merger_play_rate)})
                </td>
                <td className="py-1 pr-3">
                  {formatNullableWinRate(row.merger_win_rate)}
                  {row.merger_games > 0 ? ` (${formatWins(row.merger_wins)})` : ''}
                </td>
                <td className="py-1 pr-3">
                  {formatNullableWinRate(row.non_merger_win_rate)}
                  {row.non_merger_games > 0
                    ? ` (${formatWins(row.non_merger_wins)})`
                    : ''}
                </td>
                <td className="py-1 pr-3">
                  {formatWinRateDelta(row.win_rate_delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinalTerraformingActionBlock(props: {
  rows: FinalTerraformingActionStat[];
}) {
  if (props.rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">
        Final Terraforming Action (Imported Logs)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="tm-data-label">
              <th className="py-1 pr-3">Player</th>
              <th className="py-1 pr-3">Imported games</th>
              <th className="py-1 pr-3">Final actions</th>
              <th className="py-1 pr-3">Final-action win rate</th>
              <th className="py-1 pr-3">Overall win rate</th>
              <th className="py-1 pr-3">Delta</th>
              <th className="py-1 pr-3">Common finisher</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr className="border-t border-white/5" key={row.player_id}>
                <td className="py-1 pr-3 font-semibold text-stone-100">
                  {row.player_name}
                </td>
                <td className="py-1 pr-3">{row.imported_games}</td>
                <td className="py-1 pr-3">
                  {`${row.final_action_games} (${formatWinRate(
                    row.final_action_rate,
                  )})`}
                </td>
                <td className="py-1 pr-3">
                  {formatNullableWinRate(row.final_action_win_rate)}
                  {row.final_action_games > 0
                    ? ` (${formatWins(row.final_action_wins)})`
                    : ''}
                </td>
                <td className="py-1 pr-3">
                  {formatNullableWinRate(row.overall_win_rate)}
                  {row.imported_games > 0 ? ` (${formatWins(row.overall_wins)})` : ''}
                </td>
                <td className="py-1 pr-3">
                  {formatWinRateDelta(row.win_rate_delta)}
                </td>
                <td className="py-1 pr-3">
                  {formatActionType(row.most_common_action_type)}
                  {row.most_common_action_count
                    ? ` (${row.most_common_action_count})`
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SelectionStatsSection({
  dialogData,
  finalTerraformingActions,
  global,
  headToHead,
  mapAwardGroups,
  mergerImpact,
  personal,
}: SelectionStatsSectionProps) {
  return (
    <section className="tm-panel flex flex-col gap-5">
      <h2 className="tm-panel-title text-lg">Corporation &amp; Prelude Stats</h2>
      <HeadToHeadBlock dialogData={dialogData} headToHead={headToHead} />
      <MergerImpactBlock rows={mergerImpact} />
      <FinalTerraformingActionBlock rows={finalTerraformingActions} />
      <SelectionStatsScope
        dialogData={dialogData}
        heading="Your Games"
        mapAwardGroups={mapAwardGroups}
        stats={personal}
        globalStats={global}
      />
      <SelectionStatsScope
        dialogData={dialogData}
        heading="All Recorded Games"
        mapAwardGroups={mapAwardGroups}
        stats={global}
        globalStats={global}
      />
    </section>
  );
}
