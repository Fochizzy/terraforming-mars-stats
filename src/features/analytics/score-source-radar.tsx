import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';

type ScoreSourceRadarProps = {
  groupAverages: ScoreSourceAverages | null;
  playerAverages: ScoreSourceAverages | null;
  playerName: string | null;
};

type ScoreSourceDefinition = {
  key: keyof ScoreSourceAverages;
  label: string;
};

const SCORE_SOURCES: ScoreSourceDefinition[] = [
  { key: 'averageTrPoints', label: 'TR' },
  { key: 'averageCardPoints', label: 'Cards' },
  { key: 'averageGreeneryPoints', label: 'Greenery' },
  { key: 'averageCitiesPoints', label: 'Cities' },
  { key: 'averageMilestonePoints', label: 'Milestones' },
  { key: 'averageAwardPoints', label: 'Awards' },
  { key: 'averageJovianPoints', label: 'Jovian' },
  { key: 'averageMicrobePoints', label: 'Microbes' },
  { key: 'averageAnimalPoints', label: 'Animals' },
];

const CHART_SIZE = 520;
const CHART_CENTER = CHART_SIZE / 2;
const CHART_RADIUS = 176;
const LABEL_RADIUS = 216;

function getPoint(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / SCORE_SOURCES.length;

  return {
    x: CHART_CENTER + Math.cos(angle) * radius,
    y: CHART_CENTER + Math.sin(angle) * radius,
  };
}

function getPolygonPoints(radius: number) {
  return SCORE_SOURCES.map((_, index) => {
    const point = getPoint(index, radius);
    return `${point.x},${point.y}`;
  }).join(' ');
}

function getSeriesPoints(values: number[], maxValue: number) {
  return values
    .map((value, index) => {
      const normalizedRadius = Math.max(0, Math.min(value / maxValue, 1)) * CHART_RADIUS;
      const point = getPoint(index, normalizedRadius);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

function getLabelAnchor(x: number) {
  if (Math.abs(x - CHART_CENTER) < 18) {
    return 'middle';
  }

  return x < CHART_CENTER ? 'end' : 'start';
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function RadarMark() {
  return (
    <svg aria-hidden="true" className="h-9 w-9" viewBox="0 0 40 40">
      <path
        d="M20 3.5 34.3 11.8v16.4L20 36.5 5.7 28.2V11.8L20 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="20" cy="20" fill="none" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="20" fill="currentColor" r="2.3" />
      <path d="M20 9.5v5M30.5 20h-5M20 30.5v-5M9.5 20h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function FooterMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="m12 3 2.4 5.4 5.9.6-4.4 4 1.2 5.8-5.1-3-5.1 3 1.2-5.8-4.4-4 5.9-.6L12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ScoreSourceRadar({
  groupAverages,
  playerAverages,
  playerName,
}: ScoreSourceRadarProps) {
  const focusedPlayerLabel = playerName ?? 'Focused player';

  if (!groupAverages || !playerAverages) {
    return (
      <section className="tm-panel" aria-labelledby="score-source-radar-title">
        <h2 className="tm-panel-title text-lg font-semibold" id="score-source-radar-title">
          Score Source Radar
        </h2>
        <p className="mt-4 text-sm text-stone-400">
          Finalize more linked games to compare this player&apos;s score-source mix with the group average.
        </p>
      </section>
    );
  }

  const groupValues = SCORE_SOURCES.map((source) => groupAverages[source.key]);
  const playerValues = SCORE_SOURCES.map((source) => playerAverages[source.key]);
  const maximumObservedValue = Math.max(...groupValues, ...playerValues, 1);
  const maximumValue = Math.max(40, Math.ceil(maximumObservedValue / 10) * 10);
  const ringValues = [0.25, 0.5, 0.75, 1];
  const playerSeriesPoints = getSeriesPoints(playerValues, maximumValue);
  const groupSeriesPoints = getSeriesPoints(groupValues, maximumValue);

  return (
    <section
      aria-labelledby="score-source-radar-title"
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-orange-400/35 bg-[#070b12] px-5 py-5 shadow-[0_28px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,226,190,0.12)] sm:px-7 sm:py-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(circle at 65% 46%, rgba(55, 170, 224, 0.13), transparent 29%), radial-gradient(circle at 7% 103%, rgba(214, 91, 35, 0.34), transparent 29%), linear-gradient(120deg, rgba(255, 170, 93, 0.045), transparent 38%, rgba(78, 153, 194, 0.045))',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-28 h-72 w-72 rounded-full border border-orange-300/20 shadow-[0_0_55px_rgba(214,91,35,0.24)]"
        style={{
          background:
            'radial-gradient(circle at 62% 35%, rgba(230, 129, 72, 0.6), rgba(104, 42, 24, 0.92) 38%, rgba(18, 10, 10, 0.98) 70%)',
        }}
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-16 h-[520px] w-[520px] opacity-[0.12]"
        viewBox="0 0 520 520"
      >
        {Array.from({ length: 11 }, (_, index) => (
          <path
            d={`M${68 + index * 15} 28 C ${320 + index * 8} ${80 + index * 10}, ${215 - index * 5} ${252 + index * 13}, ${490 - index * 13} ${478 - index * 8}`}
            fill="none"
            key={index}
            stroke="#df7a3c"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.55fr)] lg:gap-10">
        <header className="self-start lg:pt-2">
          <div className="flex items-center gap-4 text-orange-400">
            <div className="rounded-2xl border border-orange-400/40 bg-orange-400/[0.055] p-2.5 shadow-[0_0_24px_rgba(239,122,48,0.12)]">
              <RadarMark />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className="tm-panel-title text-xl font-semibold tracking-[0.13em] text-amber-100 sm:text-2xl"
                id="score-source-radar-title"
              >
                Score Source Radar
              </h2>
              <div className="mt-3 flex items-center gap-2" aria-hidden="true">
                <span className="h-px flex-1 bg-gradient-to-r from-orange-400 via-orange-400/70 to-transparent" />
                <span className="h-1.5 w-1.5 rotate-45 border-r border-t border-orange-300" />
                <span className="h-1.5 w-1.5 rotate-45 border-r border-t border-orange-300/70" />
                <span className="h-1.5 w-1.5 rotate-45 border-r border-t border-orange-300/40" />
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-md text-base leading-7 text-stone-300">
            The same score sources plotted as a shape, so{' '}
            <span className="font-semibold text-sky-200">{focusedPlayerLabel}</span>
            &apos;s point mix can be compared against the group average at a glance.
          </p>

          <div className="mt-7 hidden rounded-2xl border border-orange-300/15 bg-black/20 p-4 lg:block">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-300">
              Reading the shape
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Longer spokes mean more average victory points from that source. The greater the separation, the more distinct the player&apos;s scoring profile.
            </p>
          </div>
        </header>

        <div className="min-w-0">
          <div className="relative mx-auto max-w-[720px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(64, 169, 215, 0.12), rgba(218, 111, 47, 0.05) 44%, transparent 72%)',
              }}
            />

            <svg
              aria-describedby="score-source-radar-caption"
              aria-label={`Radar chart comparing ${focusedPlayerLabel} with the group average across nine score sources`}
              className="relative block h-auto w-full overflow-visible"
              role="img"
              viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            >
              <defs>
                <radialGradient id="score-radar-field" cx="50%" cy="48%" r="55%">
                  <stop offset="0%" stopColor="#172432" stopOpacity="0.88" />
                  <stop offset="64%" stopColor="#0c121b" stopOpacity="0.52" />
                  <stop offset="100%" stopColor="#070b12" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="score-radar-group-fill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f6a34b" stopOpacity="0.46" />
                  <stop offset="100%" stopColor="#b94f25" stopOpacity="0.14" />
                </linearGradient>
                <linearGradient id="score-radar-player-fill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#69d8ff" stopOpacity="0.54" />
                  <stop offset="100%" stopColor="#178ec4" stopOpacity="0.2" />
                </linearGradient>
                <filter id="score-radar-player-glow" height="180%" width="180%" x="-40%" y="-40%">
                  <feGaussianBlur result="blur" stdDeviation="4" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="score-radar-group-glow" height="180%" width="180%" x="-40%" y="-40%">
                  <feGaussianBlur result="blur" stdDeviation="2.5" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle cx={CHART_CENTER} cy={CHART_CENTER} fill="url(#score-radar-field)" r="222" />
              <circle
                cx={CHART_CENTER}
                cy={CHART_CENTER}
                fill="none"
                r="205"
                stroke="#d87536"
                strokeDasharray="2 10"
                strokeOpacity="0.2"
              />

              {ringValues.map((ratio) => (
                <polygon
                  fill="rgba(10, 15, 22, 0.14)"
                  key={ratio}
                  points={getPolygonPoints(CHART_RADIUS * ratio)}
                  stroke={ratio === 1 ? '#d2b08b' : '#8d795f'}
                  strokeDasharray={ratio === 1 ? undefined : '2 4'}
                  strokeOpacity={ratio === 1 ? 0.72 : 0.42}
                  strokeWidth={ratio === 1 ? 1.35 : 1}
                />
              ))}

              {SCORE_SOURCES.map((source, index) => {
                const outerPoint = getPoint(index, CHART_RADIUS);

                return (
                  <line
                    key={source.key}
                    stroke="#9c8870"
                    strokeOpacity="0.48"
                    strokeWidth="1"
                    x1={CHART_CENTER}
                    x2={outerPoint.x}
                    y1={CHART_CENTER}
                    y2={outerPoint.y}
                  />
                );
              })}

              <polygon
                fill="url(#score-radar-group-fill)"
                filter="url(#score-radar-group-glow)"
                points={groupSeriesPoints}
                stroke="#f28b3c"
                strokeLinejoin="round"
                strokeWidth="3.2"
              />
              <polygon
                fill="url(#score-radar-player-fill)"
                filter="url(#score-radar-player-glow)"
                points={playerSeriesPoints}
                stroke="#56c9f3"
                strokeLinejoin="round"
                strokeWidth="3.4"
              />

              {groupValues.map((value, index) => {
                const point = getPoint(index, (value / maximumValue) * CHART_RADIUS);

                return (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="#f28b3c"
                    key={`group-${SCORE_SOURCES[index].key}`}
                    r="3.1"
                    stroke="#24140d"
                    strokeWidth="1.2"
                  />
                );
              })}
              {playerValues.map((value, index) => {
                const point = getPoint(index, (value / maximumValue) * CHART_RADIUS);

                return (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="#70dcff"
                    key={`player-${SCORE_SOURCES[index].key}`}
                    r="3.2"
                    stroke="#07131b"
                    strokeWidth="1.2"
                  />
                );
              })}

              {ringValues.map((ratio) => (
                <text
                  fill="#bca991"
                  fontFamily="var(--tm-font-body)"
                  fontSize="12"
                  key={`tick-${ratio}`}
                  opacity="0.82"
                  textAnchor="middle"
                  x={CHART_CENTER + CHART_RADIUS * ratio}
                  y={CHART_CENTER + 18}
                >
                  {Math.round(maximumValue * ratio)}
                </text>
              ))}

              {SCORE_SOURCES.map((source, index) => {
                const labelPoint = getPoint(index, LABEL_RADIUS);
                const isTopLabel = index === 0;
                const isBottomLabel = index === 4 || index === 5;

                return (
                  <text
                    dominantBaseline="middle"
                    fill="#f3ddbf"
                    fontFamily="var(--tm-font-body)"
                    fontSize="16"
                    fontWeight="600"
                    key={`label-${source.key}`}
                    textAnchor={getLabelAnchor(labelPoint.x)}
                    x={labelPoint.x}
                    y={labelPoint.y + (isTopLabel ? -6 : isBottomLabel ? 5 : 0)}
                  >
                    {source.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="mx-auto mt-1 flex w-fit flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-orange-300/25 bg-black/35 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:gap-x-7 sm:px-7">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-orange-300 sm:text-base">
              <span className="h-3.5 w-3.5 rounded-[0.28rem] bg-orange-400 shadow-[0_0_12px_rgba(245,132,55,0.45)]" />
              Group average
            </div>
            <span aria-hidden="true" className="hidden h-5 w-px bg-stone-700 sm:block" />
            <div className="flex items-center gap-2.5 text-sm font-semibold text-sky-300 sm:text-base">
              <span className="h-3.5 w-3.5 rounded-[0.28rem] bg-sky-400 shadow-[0_0_12px_rgba(73,190,238,0.45)]" />
              {focusedPlayerLabel}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative mt-7 flex items-start gap-3 border-t border-orange-300/15 pt-4 text-sm leading-6 text-stone-400"
        id="score-source-radar-caption"
      >
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-400/45 bg-orange-400/[0.07] text-orange-300">
          <FooterMark />
        </span>
        <p>
          Average <span className="font-semibold text-orange-300">victory points</span> per{' '}
          <span className="font-semibold text-orange-300">finalized game</span>, by source.{' '}
          <span className="font-semibold text-sky-300">{focusedPlayerLabel}</span> is overlaid on the group profile.
        </p>
      </div>

      <ul className="sr-only">
        {SCORE_SOURCES.map((source, index) => (
          <li key={`accessible-${source.key}`}>
            {source.label}: group average {formatAverage(groupValues[index])}; {focusedPlayerLabel}{' '}
            {formatAverage(playerValues[index])}.
          </li>
        ))}
      </ul>
    </section>
  );
}
