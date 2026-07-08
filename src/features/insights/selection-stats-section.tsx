import type {
  CorporationSelectionStat,
  HeadToHeadStats,
  PreludeSelectionStat,
  SelectionStats,
} from '@/lib/db/selection-stats-repo';
import { SelectionOriginChart } from './selection-origin-chart';

type SelectionStatsSectionProps = {
  global: SelectionStats;
  headToHead: HeadToHeadStats;
  personal: SelectionStats;
};

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function SelectionStatRows(props: {
  rows: Array<
    (CorporationSelectionStat | PreludeSelectionStat) & { name: string }
  >;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="tm-data-label">
            <th className="py-1 pr-3">Name</th>
            <th className="py-1 pr-3">Plays</th>
            <th className="py-1 pr-3">Win rate</th>
            <th className="py-1 pr-3">Avg place</th>
            <th className="py-1 pr-3">1st/2nd/3rd+</th>
            <th className="py-1 pr-3">Avg VP</th>
            <th className="py-1 pr-3">TR</th>
            <th className="py-1 pr-3">Cards</th>
            <th className="py-1 pr-3">Microbes</th>
            <th className="py-1 pr-3">Animals</th>
            <th className="py-1 pr-3">Greenery</th>
            <th className="py-1 pr-3">Cities</th>
            <th className="py-1 pr-3">Milestones</th>
            <th className="py-1 pr-3">Awards</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr className="border-t border-white/5" key={row.name}>
              <td className="py-1 pr-3 font-semibold text-stone-100">
                {row.name}
              </td>
              <td className="py-1 pr-3">{row.plays}</td>
              <td className="py-1 pr-3">{formatWinRate(row.win_rate)}</td>
              <td className="py-1 pr-3">{row.avg_placement}</td>
              <td className="py-1 pr-3">
                {row.first_place_finishes}/{row.second_place_finishes}/
                {row.third_plus_finishes}
              </td>
              <td className="py-1 pr-3">{row.avg_points}</td>
              <td className="py-1 pr-3">{row.avg_tr_points}</td>
              <td className="py-1 pr-3">{row.avg_card_points}</td>
              <td className="py-1 pr-3">{row.avg_microbe_points}</td>
              <td className="py-1 pr-3">{row.avg_animal_points}</td>
              <td className="py-1 pr-3">{row.avg_greenery_points}</td>
              <td className="py-1 pr-3">{row.avg_cities_points}</td>
              <td className="py-1 pr-3">
                {row.avg_milestone_points} ({row.avg_milestones_won})
              </td>
              <td className="py-1 pr-3">
                {row.avg_award_points} ({row.avg_awards_won})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectionStatsScope(props: {
  heading: string;
  stats: SelectionStats;
}) {
  const hasData =
    props.stats.corporations.length > 0 || props.stats.preludes.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">{props.heading}</h3>
      {!hasData ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          No finalized games with corporation selections yet.
        </p>
      ) : (
        <>
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
                Preludes
              </h4>
              <SelectionStatRows
                rows={props.stats.preludes.map((row) => ({
                  ...row,
                  name: row.prelude_name,
                }))}
              />
            </div>
          ) : null}
          {props.stats.pairs.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Corporation + Prelude Pairings
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {props.stats.pairs.slice(0, 15).map((pair) => (
                  <li key={`${pair.corporation_name}-${pair.prelude_name}`}>
                    {pair.corporation_name} + {pair.prelude_name}: {pair.plays}{' '}
                    plays, {formatWinRate(pair.win_rate)} wins, {pair.avg_points}{' '}
                    avg VP
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.stats.awardFunding.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Award Funding ROI
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {props.stats.awardFunding.map((funding) => (
                  <li key={funding.award_name}>
                    {funding.award_name}: funded {funding.funded_count}×, funder
                    took 1st {funding.funder_won_count}× (
                    {funding.funded_count > 0
                      ? Math.round(
                          (funding.funder_won_count / funding.funded_count) * 100,
                        )
                      : 0}
                    % ROI)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.stats.cards.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Card Win Correlation (baseline win rate{' '}
                {formatWinRate(props.stats.baselineWinRate)})
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {props.stats.cards.slice(0, 20).map((card) => (
                  <li key={card.card_name}>
                    {card.card_name}: {card.plays} plays,{' '}
                    {formatWinRate(card.win_rate_when_played)} wins when played (
                    {card.win_rate_when_played - props.stats.baselineWinRate >= 0
                      ? '+'
                      : ''}
                    {Math.round(
                      (card.win_rate_when_played - props.stats.baselineWinRate) *
                        100,
                    )}
                    % vs baseline)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.stats.tagWins.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Tags in Wins vs Losses
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {props.stats.tagWins.map((tagWin) => (
                  <li key={tagWin.tag_code}>
                    {tagWin.tag_code}: {tagWin.avg_tags_in_wins ?? '—'} per win
                    vs {tagWin.avg_tags_in_losses ?? '—'} per loss (
                    {tagWin.samples} samples)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.stats.corporationTags.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold tm-accent-copy">
                Tag Profiles by Corporation
              </h4>
              <ul className="flex flex-col gap-1 text-xs">
                {props.stats.corporationTags.slice(0, 20).map((tagStat) => (
                  <li key={`${tagStat.corporation_name}-${tagStat.tag_code}`}>
                    {tagStat.corporation_name}: {tagStat.avg_tag_count}{' '}
                    {tagStat.tag_code} tags per game
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function HeadToHeadBlock(props: { headToHead: HeadToHeadStats }) {
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
                {matchup.corporation_a} vs {matchup.corporation_b}:{' '}
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

export function SelectionStatsSection({
  global,
  headToHead,
  personal,
}: SelectionStatsSectionProps) {
  return (
    <section className="tm-panel flex flex-col gap-5">
      <h2 className="tm-panel-title text-lg">Corporation &amp; Prelude Stats</h2>
      <HeadToHeadBlock headToHead={headToHead} />
      <SelectionStatsScope heading="Your Games" stats={personal} />
      <SelectionStatsScope heading="All Recorded Games" stats={global} />
    </section>
  );
}
