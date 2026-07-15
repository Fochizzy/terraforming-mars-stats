import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const sourcePath = 'src/features/insights/global-insight-metrics-section.tsx';
const testPath = 'src/features/insights/global-insight-metrics-section.test.tsx';
const workflowPath = '.github/workflows/apply-global-card-timing-formatting.yml';
const scriptPath = 'scripts/apply-global-card-timing-formatting.mjs';

const source = readFileSync(sourcePath, 'utf8');
const openingStart = source.indexOf('function OpeningComboCards');
const exportStart = source.indexOf('export function GlobalInsightMetricsSection');

if (openingStart === -1 || exportStart === -1 || exportStart <= openingStart) {
  throw new Error('Could not locate the opening combo and card timing section.');
}

const replacement = String.raw`function TimingDeltaBadge({ value }: { value: number }) {
  const points = Math.round(value * 100);
  let ariaLabel = 'Early and late win rates are equal';
  let label = '→ 0 pts';
  let toneClass = 'border-white/10 bg-white/5 text-stone-300';

  if (points > 0) {
    ariaLabel =
      'Early win rate is ' + points + ' points higher than late win rate';
    label = '↑ +' + points + ' pts';
    toneClass =
      'border-[#34d399]/25 bg-[#34d399]/10 text-[#34d399]';
  } else if (points < 0) {
    ariaLabel =
      'Early win rate is ' + Math.abs(points) + ' points lower than late win rate';
    label = '↓ −' + Math.abs(points) + ' pts';
    toneClass =
      'border-[#fb7185]/25 bg-[#fb7185]/10 text-[#fb7185]';
  }

  return (
    <span
      aria-label={ariaLabel}
      className={[
        'inline-flex min-w-[6.75rem] items-center justify-center rounded-full border',
        'px-2.5 py-1 text-xs font-semibold tabular-nums',
        toneClass,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function OpeningComboCards({ rows }: { rows: GlobalOpeningComboMetric[] }) {
  const displayedRows = compactRows(rows, 9);

  return (
    <section
      aria-labelledby="opening-combo-strength-title"
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-[#263241] bg-[#111821] shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
    >
      <header className="border-b border-[#263241] bg-black/10 px-5 py-5 sm:px-7 sm:py-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f6b94a]">
          Opening analysis
        </p>
        <h3
          className="mt-2 text-2xl font-semibold tracking-tight text-[#f1f5f9]"
          id="opening-combo-strength-title"
        >
          Opening combo strength
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#94a3b8]">
          Compare repeated corporation and prelude pairings across finalized games.
        </p>
      </header>

      <div className="p-5 sm:p-7">
        {displayedRows.length === 0 ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-[#f6b94a]/25 bg-[#f6b94a]/[0.07] px-4 py-3.5"
            role="note"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#f6b94a]/35 text-xs font-bold text-[#f6b94a]"
            >
              !
            </span>
            <div>
              <p className="text-sm font-semibold text-[#f1f5f9]">
                Limited confidence
              </p>
              <p className="mt-1 text-sm leading-6 text-[#94a3b8]">
                More repeated corporation and prelude pairings are needed before
                drawing strong conclusions.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {displayedRows.map((row, index) => (
              <article
                className="rounded-xl border border-[#263241] bg-black/20 p-4 transition-colors hover:border-white/20 hover:bg-white/[0.035]"
                key={[row.signalType, row.label, index].join('-')}
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  {OPENING_SIGNAL_LABELS[row.signalType]}
                </p>
                <h4 className="mt-2 font-semibold text-[#f1f5f9]">
                  {row.corporationName}
                </h4>
                <p className="mt-1 text-xs text-[#94a3b8]">{row.preludeLabel}</p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[#263241] pt-3 text-right text-sm tabular-nums">
                  <div>
                    <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-[#94a3b8]">
                      Win rate
                    </dt>
                    <dd className="mt-1 font-semibold text-[#f1f5f9]">
                      {formatPercent(row.winRate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-[#94a3b8]">
                      Plays
                    </dt>
                    <dd className="mt-1 font-semibold text-[#f1f5f9]">
                      {row.plays}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-[#94a3b8]">
                      Score SD
                    </dt>
                    <dd className="mt-1 font-semibold text-[#f1f5f9]">
                      {formatAverage(row.scoreDeviation)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CardTimingTable({ rows }: { rows: GlobalCardTimingMetric[] }) {
  const displayedRows = compactRows(rows, 8);
  const displayedCountLabel =
    displayedRows.length === 1 ? '1 card' : displayedRows.length + ' cards';

  return (
    <section
      aria-labelledby="log-derived-card-timing-title"
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-[#263241] bg-[#111821] shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#263241] bg-black/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f6b94a]">
            Card statistics
          </p>
          <h3
            className="mt-2 text-2xl font-semibold tracking-tight text-[#f1f5f9]"
            id="log-derived-card-timing-title"
          >
            Log-derived card timing
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#94a3b8]">
            Compare how the same cards perform when played early versus late.
          </p>
        </div>
        {displayedRows.length > 0 ? (
          <span className="w-fit rounded-full border border-[#263241] bg-black/20 px-3 py-1 text-xs font-medium tabular-nums text-[#94a3b8]">
            {displayedCountLabel}
          </span>
        ) : null}
      </header>

      {displayedRows.length === 0 ? (
        <p className="px-5 py-5 text-sm leading-6 text-[#94a3b8] sm:px-7">
          Card timing needs repeated early and late logged plays of the same card.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-[38%] border-b-2 border-[#263241] bg-[#111821] px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8] sm:px-6">
                  Card
                </th>
                <th className="sticky top-0 z-10 w-[14%] border-b-2 border-[#263241] bg-[#111821] px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Early win
                </th>
                <th className="sticky top-0 z-10 w-[14%] border-b-2 border-[#263241] bg-[#111821] px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Late win
                </th>
                <th className="sticky top-0 z-10 w-[17%] border-b-2 border-[#263241] bg-[#111821] px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Change
                </th>
                <th className="sticky top-0 z-10 w-[17%] border-b-2 border-[#263241] bg-[#111821] px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8] sm:px-6">
                  Plays
                </th>
              </tr>
            </thead>
            <tbody className="text-[#f1f5f9]">
              {displayedRows.map((row) => (
                <tr
                  className="h-[46px] transition-colors odd:bg-white/[0.018] hover:bg-amber-400/[0.045]"
                  key={row.cardName}
                >
                  <td className="border-b border-[#263241]/70 px-4 py-3 text-left font-semibold sm:px-6">
                    {row.cardName}
                  </td>
                  <td className="border-b border-[#263241]/70 px-3 py-3 text-right tabular-nums">
                    {formatPercent(row.earlyWinRate)}
                  </td>
                  <td className="border-b border-[#263241]/70 px-3 py-3 text-right tabular-nums">
                    {formatPercent(row.lateWinRate)}
                  </td>
                  <td className="border-b border-[#263241]/70 px-3 py-3 text-right">
                    <TimingDeltaBadge value={row.winRateDelta} />
                  </td>
                  <td className="border-b border-[#263241]/70 px-4 py-3 text-right tabular-nums sm:px-6">
                    <span
                      aria-label={
                        row.earlyPlays +
                        ' early plays to ' +
                        row.latePlays +
                        ' late plays'
                      }
                      className="inline-flex min-w-[5.5rem] items-center justify-end gap-2"
                    >
                      <span className="font-semibold text-[#f1f5f9]">
                        {row.earlyPlays}
                      </span>
                      <span aria-hidden="true" className="text-[#94a3b8]">
                        →
                      </span>
                      <span className="font-semibold text-[#f1f5f9]">
                        {row.latePlays}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

`;

writeFileSync(
  sourcePath,
  source.slice(0, openingStart) + replacement + source.slice(exportStart),
);

let testSource = readFileSync(testPath, 'utf8');

testSource = testSource
  .replace("screen.getByText('Opening Combo Strength')", "screen.getByText('Opening combo strength')")
  .replace("screen.getByText('Log-Derived Card Timing')", "screen.getByText('Log-derived card timing')");

const assertionAnchor =
  "    expect(screen.getByText('Mars University')).toBeInTheDocument();";

if (!testSource.includes(assertionAnchor)) {
  throw new Error('Could not locate the global metric rendering assertions.');
}

testSource = testSource.replace(
  assertionAnchor,
  String.raw`    expect(screen.getByText('Mars University')).toBeInTheDocument();
    expect(screen.getByText('↑ +42 pts')).toBeInTheDocument();
    expect(screen.getByLabelText('4 early plays to 3 late plays')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Plays' })).toBeInTheDocument();
    expect(screen.queryByText('Early Plays')).not.toBeInTheDocument();
    expect(screen.queryByText('Late Plays')).not.toBeInTheDocument();`,
);

const suiteEnd = testSource.lastIndexOf('\n});');

if (suiteEnd === -1) {
  throw new Error('Could not locate the end of the global insight test suite.');
}

const emptyStateTest = String.raw`

  it('uses a contained confidence callout when opening samples are missing', () => {
    render(
      <GlobalInsightMetricsSection
        metrics={{ ...metrics, openingCombos: [] }}
      />,
    );

    expect(screen.getByText('Limited confidence')).toBeInTheDocument();
    expect(
      screen.getByText(
        'More repeated corporation and prelude pairings are needed before drawing strong conclusions.',
      ),
    ).toBeInTheDocument();
  });`;

testSource =
  testSource.slice(0, suiteEnd) + emptyStateTest + testSource.slice(suiteEnd);
writeFileSync(testPath, testSource);

rmSync(workflowPath);
rmSync(scriptPath);
