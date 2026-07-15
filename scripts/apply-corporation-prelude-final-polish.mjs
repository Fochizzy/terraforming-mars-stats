import { readFile, writeFile } from 'node:fs/promises';

const componentPath = 'src/features/insights/corporation-prelude-pairings.tsx';
const testPath = 'src/features/insights/corporation-prelude-pairings.test.tsx';

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Could not find ${label}`);
  }

  return source.replace(search, replacement);
}

let component = await readFile(componentPath, 'utf8');

component = replaceRequired(
  component,
  `type PairingScoreProfile = {
  boardPoints: number;
  cardPoints: number;
  channelPoints: number;
  label: string;
  trPoints: number;
};`,
  `type PairingScoreProfile = {
  boardPoints: number;
  cardPoints: number;
  channelPoints: number;
  channels: Array<{ label: string; value: number }>;
  label: string;
  objectivePoints: number;
  trPoints: number;
};`,
  'PairingScoreProfile type',
);

component = replaceRequired(
  component,
  `  const cardPoints = average((row) => row.avg_card_points);
  const profiles: Array<{ label: ScoreProfileKey; value: number }> = [
    { label: 'terraforming-led', value: trPoints },
    { label: 'board-focused', value: boardPoints },
    { label: 'card-engine', value: cardPoints },
    {
      label: 'objective-focused',
      value: average((row) => row.avg_milestone_points + row.avg_award_points),
    },
  ];`,
  `  const cardPoints = average((row) => row.avg_card_points);
  const objectivePoints = average(
    (row) => row.avg_milestone_points + row.avg_award_points,
  );
  const channels = [
    { label: 'TR', value: trPoints },
    { label: 'Board', value: boardPoints },
    { label: 'Cards', value: cardPoints },
    { label: 'Objectives', value: objectivePoints },
  ];
  const profiles: Array<{ label: ScoreProfileKey; value: number }> = [
    { label: 'terraforming-led', value: trPoints },
    { label: 'board-focused', value: boardPoints },
    { label: 'card-engine', value: cardPoints },
    { label: 'objective-focused', value: objectivePoints },
  ];`,
  'score profile calculation',
);

component = replaceRequired(
  component,
  `  return {
    boardPoints,
    cardPoints,
    channelPoints: primaryProfile.value,
    label: SCORE_PROFILE_LABELS[primaryProfile.label],
    trPoints,
  };`,
  `  return {
    boardPoints,
    cardPoints,
    channelPoints: primaryProfile.value,
    channels,
    label: SCORE_PROFILE_LABELS[primaryProfile.label],
    objectivePoints,
    trPoints,
  };`,
  'score profile return value',
);

component = replaceRequired(
  component,
  `export function buildPairingNarratives({`,
  `function ScoreChannelBreakdown({ profile }: { profile: PairingScoreProfile }) {
  const maximum = Math.max(
    ...profile.channels.map((channel) => channel.value),
    1,
  );

  return (
    <div className="mt-4" aria-labelledby="scoring-channel-breakdown-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h6
          className="text-xs font-semibold text-stone-200"
          id="scoring-channel-breakdown-title"
        >
          Scoring channel breakdown
        </h6>
        <span className="text-[0.68rem] text-stone-500">
          Relative to the strongest channel
        </span>
      </div>
      <dl className="mt-3 grid gap-2.5">
        {profile.channels.map((channel) => {
          const isStrongest = channel.value === profile.channelPoints;
          const width = Math.max(
            (channel.value / maximum) * 100,
            channel.value > 0 ? 4 : 0,
          );

          return (
            <div
              className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3"
              key={channel.label}
            >
              <dt className="text-xs text-stone-400">{channel.label}</dt>
              <dd
                aria-label={\`${'${channel.label}'}: ${'${formatAverage(channel.value)}'} average points\`}
                className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
              >
                <span
                  aria-hidden="true"
                  className={\`block h-full rounded-full transition-[width] ${'${'}
                    isStrongest ? 'bg-amber-300/85' : 'bg-stone-300/35'
                  }\`}
                  style={{ width: \`${'${width}'}%\` }}
                />
              </dd>
              <dd className="text-right text-xs font-semibold tabular-nums text-stone-200">
                {formatAverage(channel.value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function buildPairingNarratives({`,
  'score channel breakdown helper insertion point',
);

component = replaceRequired(
  component,
  `<section aria-labelledby="corporation-prelude-pairings-title">`,
  `<section
      aria-labelledby="corporation-prelude-pairings-title"
      className="min-w-0 max-w-full overflow-x-clip"
    >`,
  'pairing section root',
);

component = replaceRequired(
  component,
  `                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    <MetricPill
                      compact
                      label="TR"
                      value={formatAverage(scoreProfile.trPoints)}
                    />
                    <MetricPill
                      compact
                      label="Board"
                      value={formatAverage(scoreProfile.boardPoints)}
                    />
                    <MetricPill
                      compact
                      label="Card"
                      value={formatAverage(scoreProfile.cardPoints)}
                    />
                  </dl>`,
  `                  <ScoreChannelBreakdown profile={scoreProfile} />`,
  'scoring metric pills',
);

await writeFile(componentPath, component);

let test = await readFile(testPath, 'utf8');
test = replaceRequired(
  test,
  `    expect(screen.getByText(/Terraforming-led/)).toBeInTheDocument();`,
  `    expect(screen.getByText(/Terraforming-led/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Scoring channel breakdown' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Objectives: 8 average points'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole('heading', { name: 'Corporation + Prelude Pairings' })
        .closest('section'),
    ).toHaveClass('overflow-x-clip');`,
  'pairing component assertions',
);

await writeFile(testPath, test);
