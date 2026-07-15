import { Children, isValidElement, type ReactNode } from 'react';

type ParsedHeadToHeadRow = {
  firstPlayer: string;
  gamesPlayed: number;
  losses: number;
  margin: number;
  secondPlayer: string;
  ties: number;
  wins: number;
};

type ElementWithChildren = {
  children?: ReactNode;
};

function flattenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(flattenText).join('');
  }

  if (isValidElement<ElementWithChildren>(node)) {
    return flattenText(node.props.children);
  }

  return '';
}

function parseHeadToHeadRows(children: ReactNode): ParsedHeadToHeadRow[] | null {
  const root = Children.toArray(children)[0];

  if (!isValidElement<ElementWithChildren>(root) || root.type !== 'div') {
    return null;
  }

  const parsedRows = Children.toArray(root.props.children).map((candidate) => {
    if (!isValidElement<ElementWithChildren>(candidate) || candidate.type !== 'article') {
      return null;
    }

    const articleChildren = Children.toArray(candidate.props.children);
    const summary = articleChildren[0];
    const record = articleChildren[1];

    if (!isValidElement<ElementWithChildren>(summary)) {
      return null;
    }

    const summaryChildren = Children.toArray(summary.props.children);
    const label = flattenText(summaryChildren[0]).trim();
    const marginText = flattenText(summaryChildren[1]).trim();
    const recordText = flattenText(record).trim();
    const labelParts = label.split(' vs ');
    const recordMatch = recordText.match(/^(\d+)-(\d+)-(\d+) over (\d+) games?$/i);
    const margin = Number(marginText.replace(/[^\d.+-]/g, ''));

    if (labelParts.length < 2 || !recordMatch || Number.isNaN(margin)) {
      return null;
    }

    return {
      firstPlayer: labelParts[0],
      secondPlayer: labelParts.slice(1).join(' vs '),
      wins: Number(recordMatch[1]),
      losses: Number(recordMatch[2]),
      ties: Number(recordMatch[3]),
      gamesPlayed: Number(recordMatch[4]),
      margin,
    };
  });

  if (parsedRows.some((row) => row === null)) {
    return null;
  }

  return parsedRows as ParsedHeadToHeadRow[];
}

function getMarginTone(margin: number) {
  if (margin > 0) {
    return {
      bar: 'bg-emerald-400/80',
      text: 'text-emerald-300',
    };
  }

  if (margin < 0) {
    return {
      bar: 'bg-rose-400/80',
      text: 'text-rose-300',
    };
  }

  return {
    bar: 'bg-stone-400/70',
    text: 'text-stone-300',
  };
}

function formatMargin(value: number) {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    signDisplay: 'exceptZero',
  }).format(value);

  return `${formatted} pts`;
}

export function HeadToHeadLensFrame({ children }: { children: ReactNode }) {
  const rows = parseHeadToHeadRows(children);
  const largestMargin = rows?.reduce(
    (largest, row) => Math.max(largest, Math.abs(row.margin)),
    0,
  );

  return (
    <section className="tm-panel p-3 sm:p-4">
      <div className="flex flex-col gap-1">
        <h2 className="tm-panel-title text-lg font-semibold">Head-to-Head Lens</h2>
        <p className="tm-muted-copy max-w-3xl text-sm leading-relaxed">
          Direct matchup records between players. Average margin is shown from the
          first player&apos;s perspective across their shared games.
        </p>
      </div>

      {rows ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-stone-700/70 bg-stone-950/45">
          <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(190px,0.9fr)_minmax(145px,0.6fr)] gap-4 border-b border-stone-800/90 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500 md:grid">
            <span>Matchup</span>
            <span>Record</span>
            <span className="text-right">Average margin</span>
          </div>

          <div className="divide-y divide-stone-800/90">
            {rows.map((row) => {
              const marginTone = getMarginTone(row.margin);
              const indicatorWidth = largestMargin
                ? Math.max(8, (Math.abs(row.margin) / largestMargin) * 100)
                : 0;

              return (
                <article
                  className="grid min-h-[76px] gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.45fr)_minmax(190px,0.9fr)_minmax(145px,0.6fr)] md:items-center"
                  key={`${row.firstPlayer}-${row.secondPlayer}`}
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-stone-100">
                      {row.firstPlayer}
                      <span className="px-1.5 font-normal text-stone-500">vs</span>
                      {row.secondPlayer}
                    </h3>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {row.gamesPlayed} shared {row.gamesPlayed === 1 ? 'game' : 'games'}
                    </p>
                  </div>

                  <div className="tabular-nums">
                    <p className="text-sm font-medium text-stone-200">
                      <span>{row.wins} W</span>
                      <span className="px-1.5 text-stone-600">·</span>
                      <span>{row.losses} L</span>
                      <span className="px-1.5 text-stone-600">·</span>
                      <span>{row.ties} T</span>
                    </p>
                    <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-stone-600">
                      First-player record
                    </p>
                  </div>

                  <div className="tabular-nums md:text-right">
                    <p className={`text-sm font-semibold ${marginTone.text}`}>
                      {formatMargin(row.margin)}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-stone-600">
                      Per shared game
                    </p>
                  </div>

                  <div
                    aria-label={`${row.firstPlayer} average margin: ${formatMargin(row.margin)}`}
                    className="col-span-full grid h-1.5 grid-cols-2 overflow-hidden rounded-full bg-stone-800/90"
                    role="img"
                  >
                    <div className="flex justify-end border-r border-stone-600/70">
                      {row.margin < 0 ? (
                        <span
                          className={`block h-full rounded-l-full ${marginTone.bar}`}
                          style={{ width: `${indicatorWidth}%` }}
                        />
                      ) : null}
                    </div>
                    <div>
                      {row.margin > 0 ? (
                        <span
                          className={`block h-full rounded-r-full ${marginTone.bar}`}
                          style={{ width: `${indicatorWidth}%` }}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </section>
  );
}
