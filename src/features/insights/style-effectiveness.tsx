'use client';

import { useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';

export type StyleEffectivenessScoreEntry = {
  label: string;
  value: number;
};

// Minimal shape the summary needs; GroupStylePerformanceRow and the global RPC
// rows both satisfy it, so any scope can feed the same builder.
export type StylePerformanceInput = {
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  styleCode: string;
  winRate: number;
  wins: number;
};

// Whose games the sentences describe. `subject` drives the verb ("you"/name/
// "this group"), `possessive` the possessive ("your"/"Ada's"/"this group's").
export type StyleSubject = {
  possessive: string;
  subject: string;
};

export const SELF_SUBJECT: StyleSubject = { possessive: 'your', subject: 'you' };

export function namedSubject(name: string): StyleSubject {
  return { possessive: `${name}'s`, subject: name };
}

// Friendly phrase for each score-source label, used to describe where points
// come from in plain language.
const LANE_PHRASES: Record<string, string> = {
  Animal: 'animal cards',
  Awards: 'awards',
  'Card Points': 'card points',
  Cities: 'city tiles',
  Greenery: 'greenery tiles',
  Jovian: 'Jovian cards',
  Microbe: 'microbe cards',
  Milestones: 'milestones',
  'Other Card': 'other card points',
  'Terraform Rating': 'terraform rating',
};

// What each inferred style leans on, so a sentence can explain how a player's
// tags and placements pushed their games into that style.
const STYLE_LANE_HINTS: Record<string, string> = {
  award_closer: 'award points',
  award_pressure: 'funded awards',
  balanced: 'a balanced spread of scoring',
  board_control: 'city and greenery placements',
  card_combo: 'card combos',
  card_vp_engine: 'card victory points',
  city_building: 'city placements',
  economy_engine: 'production and economy',
  engine_builder: 'a card engine',
  engine_building: 'a card engine',
  jovian_payoff: 'Jovian tags',
  milestone_aggression: 'milestone claims',
  milestone_race: 'milestone claims',
  plant_greenery: 'greenery tiles',
  terraform_rush: 'terraform rating',
};

function humanizeStyleCode(styleCode: string) {
  return styleCode
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function joinList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function topLanePhrases(scoreEntries: StyleEffectivenessScoreEntry[]) {
  return scoreEntries
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
    .map((entry) => LANE_PHRASES[entry.label] ?? entry.label.toLowerCase());
}

// Judge how well a style is working, relative to the subject's own baseline win
// rate and finishing position, with a small-sample guard.
function effectivenessVerdict(
  row: StylePerformanceInput,
  overallWinRate: number,
  subject: StyleSubject,
) {
  if (row.gamesPlayed < 3) {
    return "the sample's still small, so treat this as an early read";
  }

  const beatsWinRate = row.winRate >= overallWinRate + 0.08;
  const trailsWinRate = row.winRate <= overallWinRate - 0.08;
  const finishesWell = row.averagePlacement > 0 && row.averagePlacement <= 1.8;
  const finishesPoorly = row.averagePlacement >= 2.4;

  if ((beatsWinRate || finishesWell) && !trailsWinRate) {
    return `it looks like a real strength for ${subject.subject}`;
  }
  if (trailsWinRate || finishesPoorly) {
    return `it has been less effective for ${subject.subject} so far`;
  }
  return `results here sit about in line with ${subject.possessive} other styles`;
}

export type StyleEffectivenessSentence = {
  sentence: string;
  styleCode: string;
};

export type StyleEffectivenessSummary = {
  lead: string;
  styles: StyleEffectivenessSentence[];
};

export function buildStyleEffectivenessSummary(input: {
  scoreEntries: StyleEffectivenessScoreEntry[];
  styleRows: StylePerformanceInput[];
  subject: StyleSubject;
}): StyleEffectivenessSummary | null {
  const rows = input.styleRows
    .filter((row) => row.gamesPlayed > 0)
    .sort((left, right) => right.gamesPlayed - left.gamesPlayed);

  if (rows.length === 0) {
    return null;
  }

  const { subject } = input;
  const capitalizedPossessive =
    subject.possessive.charAt(0).toUpperCase() + subject.possessive.slice(1);

  const overallGames = rows.reduce((sum, row) => sum + row.gamesPlayed, 0);
  const overallWins = rows.reduce((sum, row) => sum + row.wins, 0);
  const overallWinRate = overallGames > 0 ? overallWins / overallGames : 0;

  const lanes = topLanePhrases(input.scoreEntries);
  const topStyleLabel = humanizeStyleCode(rows[0].styleCode);

  const lead =
    lanes.length > 0
      ? `${capitalizedPossessive} points come mostly from ${joinList(lanes)}, which most often plays as ${topStyleLabel}.`
      : `${capitalizedPossessive} most-played style is ${topStyleLabel}.`;

  const styles = rows.slice(0, 4).map((row) => {
    const label = humanizeStyleCode(row.styleCode);
    const hint = STYLE_LANE_HINTS[row.styleCode];
    const leansOn = hint ? ` leans on ${hint} and` : '';
    const verdict = effectivenessVerdict(row, overallWinRate, subject);

    return {
      sentence: `${label}${leansOn} shows up in ${row.gamesPlayed} ${
        row.gamesPlayed === 1 ? 'game' : 'games'
      }, averaging ${formatNumber(row.averageScore)} points and a ${formatNumber(
        row.averagePlacement,
      )} finish at a ${formatPercent(row.winRate)} win rate - ${verdict}.`,
      styleCode: row.styleCode,
    };
  });

  return { lead, styles };
}

export type StyleEffectivenessScopeInput = {
  key: string;
  /** Label shown in the scope selector, e.g. "Global", "This group", a name. */
  label: string;
  scoreEntries: StyleEffectivenessScoreEntry[];
  styleRows: StylePerformanceInput[];
  subject: StyleSubject;
};

function SummaryBody({ scope }: { scope: StyleEffectivenessScopeInput }) {
  const summary = buildStyleEffectivenessSummary({
    scoreEntries: scope.scoreEntries,
    styleRows: scope.styleRows,
    subject: scope.subject,
  });

  if (!summary) {
    return (
      <p className="tm-muted-copy text-sm">
        <GlossaryRichText>
          Style effectiveness will appear once finalized games record how points were scored.
        </GlossaryRichText>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-stone-100">
        <GlossaryRichText>{summary.lead}</GlossaryRichText>
      </p>
      <ul className="flex flex-col gap-2">
        {summary.styles.map((style) => (
          <li className="tm-muted-copy" key={style.styleCode}>
            <GlossaryRichText>{style.sentence}</GlossaryRichText>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A single Style Effectiveness readout with a scope selector when more than one
// scope is available (e.g. Global / your games / a group on the Global page).
export function StyleEffectivenessPanel({
  scopes,
  title = 'Style Effectiveness',
}: {
  scopes: StyleEffectivenessScopeInput[];
  title?: string;
}) {
  const [selectedKey, setSelectedKey] = useState('');
  const activeScope =
    scopes.find((scope) => scope.key === selectedKey) ?? scopes[0] ?? null;

  return (
    <ChartFrame
      description="A plain-language read on the play styles these games fall into - what drives them, and how well each one works."
      title={title}
    >
      {!activeScope ? (
        <p className="tm-muted-copy text-sm">
          <GlossaryRichText>
            Style effectiveness will appear once finalized games record how points were scored.
          </GlossaryRichText>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {scopes.length > 1 ? (
            <div
              aria-label="Style effectiveness scope"
              className="inline-flex flex-wrap gap-1 self-start rounded-lg border border-white/10 p-1"
              role="group"
            >
              {scopes.map((scope) => {
                const active = scope.key === activeScope.key;

                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-md px-3 py-1 text-xs transition ${
                      active ? 'bg-white/10 text-stone-100' : 'tm-muted-copy'
                    }`}
                    key={scope.key}
                    onClick={() => setSelectedKey(scope.key)}
                    type="button"
                  >
                    {scope.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <SummaryBody scope={activeScope} />
        </div>
      )}
    </ChartFrame>
  );
}
