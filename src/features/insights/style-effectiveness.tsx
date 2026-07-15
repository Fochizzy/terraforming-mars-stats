'use client';

import {
  Award,
  Flag,
  Gauge,
  LayoutGrid,
  Leaf,
  Orbit,
  Scale,
  Sparkles,
  Star,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
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

const STYLE_ICONS: Record<string, LucideIcon> = {
  award_closer: Award,
  award_pressure: Award,
  balanced: Scale,
  board_control: LayoutGrid,
  card_combo: Sparkles,
  card_vp_engine: Star,
  city_building: LayoutGrid,
  economy_engine: Gauge,
  engine_builder: Gauge,
  engine_building: Gauge,
  jovian_payoff: Orbit,
  milestone_aggression: Flag,
  milestone_race: Flag,
  plant_greenery: Leaf,
  terraform_rush: Target,
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

type EffectivenessTone = 'positive' | 'negative' | 'neutral' | 'sample';

type EffectivenessVerdict = {
  text: string;
  tone: EffectivenessTone;
};

// Judge how well a style is working, relative to the subject's own baseline win
// rate and finishing position, with a small-sample guard.
function effectivenessVerdict(
  row: StylePerformanceInput,
  overallWinRate: number,
  subject: StyleSubject,
): EffectivenessVerdict {
  if (row.gamesPlayed < 3) {
    return {
      text: "the sample's still small, so treat this as an early read",
      tone: 'sample',
    };
  }

  const beatsWinRate = row.winRate >= overallWinRate + 0.08;
  const trailsWinRate = row.winRate <= overallWinRate - 0.08;
  const finishesWell = row.averagePlacement > 0 && row.averagePlacement <= 1.8;
  const finishesPoorly = row.averagePlacement >= 2.4;

  if ((beatsWinRate || finishesWell) && !trailsWinRate) {
    return {
      text: `it looks like a real strength for ${subject.subject}`,
      tone: 'positive',
    };
  }
  if (trailsWinRate || finishesPoorly) {
    return {
      text: `it has been less effective for ${subject.subject} so far`,
      tone: 'negative',
    };
  }
  return {
    text: `results here sit about in line with ${subject.possessive} other styles`,
    tone: 'neutral',
  };
}

export type StyleEffectivenessSentence = {
  averagePlacement: number;
  averageScore: number;
  description: string;
  gamesPlayed: number;
  label: string;
  sentence: string;
  styleCode: string;
  tone: EffectivenessTone;
  verdict: string;
  winRate: number;
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
      averagePlacement: row.averagePlacement,
      averageScore: row.averageScore,
      description: hint
        ? `Leans on ${hint}.`
        : 'A distinct scoring pattern inferred from finalized games.',
      gamesPlayed: row.gamesPlayed,
      label,
      sentence: `${label}${leansOn} shows up in ${row.gamesPlayed} ${
        row.gamesPlayed === 1 ? 'game' : 'games'
      }, averaging ${formatNumber(row.averageScore)} points and a ${formatNumber(
        row.averagePlacement,
      )} finish at a ${formatPercent(row.winRate)} win rate - ${verdict.text}.`,
      styleCode: row.styleCode,
      tone: verdict.tone,
      verdict: verdict.text,
      winRate: row.winRate,
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

const toneClasses: Record<EffectivenessTone, {
  badge: string;
  metric: string;
}> = {
  negative: {
    badge: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    metric: 'text-rose-300',
  },
  neutral: {
    badge: 'border-amber-300/15 bg-amber-300/[0.06] text-amber-100',
    metric: 'text-amber-200',
  },
  positive: {
    badge: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    metric: 'text-emerald-300',
  },
  sample: {
    badge: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
    metric: 'text-sky-300',
  },
};

function MetricCell({
  icon: Icon,
  label,
  value,
  valueClassName = 'text-stone-100',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 bg-black/15 px-3 py-3 first:rounded-l-lg last:rounded-r-lg">
      <dt className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.62rem] font-semibold uppercase leading-4 tracking-[0.14em] text-stone-500">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />
        {label}
      </dt>
      <dd className={`mt-1 break-words text-sm font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </dd>
    </div>
  );
}

function SummaryBody({ scope }: { scope: StyleEffectivenessScopeInput }) {
  const summary = buildStyleEffectivenessSummary({
    scoreEntries: scope.scoreEntries,
    styleRows: scope.styleRows,
    subject: scope.subject,
  });

  if (!summary) {
    return (
      <p className="tm-muted-copy rounded-xl border border-white/10 bg-black/15 p-4 text-sm">
        <GlossaryRichText>
          Style effectiveness will appear once finalized games record how points were scored.
        </GlossaryRichText>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-5xl text-sm leading-6 text-stone-200 sm:text-base">
        <GlossaryRichText>{summary.lead}</GlossaryRichText>
      </p>

      <div className="grid gap-3" role="list">
        {summary.styles.map((style) => {
          const StyleIcon = STYLE_ICONS[style.styleCode] ?? Target;
          const tone = toneClasses[style.tone];

          return (
            <article
              className="rounded-xl border border-amber-300/15 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,232,196,0.04)] transition hover:border-amber-300/25 hover:bg-black/25"
              key={style.styleCode}
              role="listitem"
            >
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,0.8fr)] xl:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/[0.07] shadow-[inset_0_0_18px_rgba(251,191,36,0.05)]">
                    <StyleIcon aria-hidden="true" className="h-6 w-6 text-amber-300" />
                  </span>
                  <h3 className="min-w-0 text-base font-semibold text-amber-200 sm:text-lg">
                    <GlossaryRichText maxLinks={1}>{style.label}</GlossaryRichText>
                  </h3>
                </div>

                <p className="min-w-0 text-sm leading-6 text-stone-300">
                  <GlossaryRichText>{style.description}</GlossaryRichText>{' '}
                  Appears in {style.gamesPlayed.toLocaleString('en-US')}{' '}
                  {style.gamesPlayed === 1 ? 'game' : 'games'}.
                </p>

                <dl className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
                  <MetricCell
                    icon={Star}
                    label="Games"
                    value={style.gamesPlayed.toLocaleString('en-US')}
                  />
                  <MetricCell
                    icon={Trophy}
                    label="Avg pts"
                    value={formatNumber(style.averageScore)}
                  />
                  <MetricCell
                    icon={Flag}
                    label="Avg finish"
                    value={formatNumber(style.averagePlacement)}
                  />
                  <MetricCell
                    icon={Gauge}
                    label="Win rate"
                    value={formatPercent(style.winRate)}
                    valueClassName={tone.metric}
                  />
                </dl>

                <p
                  className={`min-w-0 break-words rounded-lg border px-3 py-3 text-xs leading-5 ${tone.badge}`}
                >
                  <GlossaryRichText>{style.verdict}</GlossaryRichText>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function scopePriority(scope: StyleEffectivenessScopeInput) {
  if (scope.key === 'global') {
    return 0;
  }
  if (scope.key === 'group') {
    return 1;
  }
  if (scope.key === 'personal') {
    return 2;
  }
  return 3;
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
  const orderedScopes = [...scopes].sort(
    (left, right) => scopePriority(left) - scopePriority(right),
  );
  const [selectedKey, setSelectedKey] = useState('');
  const activeScope =
    orderedScopes.find((scope) => scope.key === selectedKey) ??
    orderedScopes[0] ??
    null;

  return (
    <section className="tm-panel">
      <div className="flex flex-col gap-5">
        <header className="flex items-start gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/[0.07] shadow-[inset_0_0_20px_rgba(251,191,36,0.06)] sm:flex">
            <Target aria-hidden="true" className="h-7 w-7 text-amber-300" />
          </span>
          <div>
            <h2 className="tm-panel-title text-xl font-semibold sm:text-2xl">
              <GlossaryRichText maxLinks={1}>{title}</GlossaryRichText>
            </h2>
            <p className="tm-panel-caption mt-1 max-w-3xl text-sm leading-6 sm:text-base">
              <GlossaryRichText>
                A plain-language read on the play styles these games fall into - what drives them, and how well each one works.
              </GlossaryRichText>
            </p>
          </div>
        </header>

        {!activeScope ? (
          <p className="tm-muted-copy text-sm">
            <GlossaryRichText>
              Style effectiveness will appear once finalized games record how points were scored.
            </GlossaryRichText>
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {orderedScopes.length > 1 ? (
              <div
                aria-label="Style effectiveness scope"
                className="inline-flex w-fit flex-wrap rounded-xl border border-white/10 bg-black/20 p-1"
                role="tablist"
              >
                {orderedScopes.map((scope) => {
                  const active = scope.key === activeScope.key;

                  return (
                    <button
                      aria-selected={active}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
                        active
                          ? 'border border-amber-300/20 bg-white/10 text-amber-100 shadow-sm'
                          : 'border border-transparent text-stone-400 hover:text-stone-100'
                      }`}
                      key={scope.key}
                      onClick={() => setSelectedKey(scope.key)}
                      role="tab"
                      type="button"
                    >
                      {scope.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div role="tabpanel">
              <SummaryBody scope={activeScope} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
