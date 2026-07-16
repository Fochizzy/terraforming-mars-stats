import Image from "next/image";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Eye,
  Globe2,
  Info,
  Layers3,
  Play,
  Target,
  Trophy,
  TrendingUp,
  User,
} from "lucide-react";
import { isRenderableCardImage } from "@/features/catalog/card-image";
import { CardStatsButton } from "@/features/catalog/card-stats-dialog";
import type { ProfileCardStat } from "@/lib/db/analytics-repo";
import { formatPercent } from "./performance-delta";

type ComparisonCardStat = ProfileCardStat & {
  globalPlayRate?: number;
  globalWinRate?: number;
  personalPlayRate?: number;
};

type MostPlayedCardsDashboardProps = {
  cards: ProfileCardStat[];
  emptyCopy: string;
};

function clampRate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(value, 1));
}

function formatOptionalPercent(value: number | undefined) {
  const rate = clampRate(value);
  return rate === undefined ? "—" : formatPercent(rate);
}

function formatDelta(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return "â€”";
  }

  const percentagePoints = Math.round(value * 100);

  if (percentagePoints > 0) {
    return `+${percentagePoints}%`;
  }

  if (percentagePoints < 0) {
    return `${percentagePoints}%`;
  }

  return "Even";
}

function playRateDelta(card: ComparisonCardStat) {
  const personal = clampRate(card.personalPlayRate);
  const global = clampRate(card.globalPlayRate);

  if (personal === undefined || global === undefined) {
    return undefined;
  }

  return personal - global;
}

function deltaToneClass(delta: number | undefined) {
  if (delta === undefined || Math.abs(delta) < 0.005) {
    return "border-stone-500/20 bg-white/[0.045] text-stone-300";
  }

  if (delta > 0) {
    return "border-emerald-400/20 bg-emerald-400/[0.09] text-emerald-300";
  }

  return "border-rose-400/20 bg-rose-400/[0.08] text-rose-300";
}

function winRateToneClass(winRate: number) {
  if (winRate >= 0.65) {
    return "border-emerald-400/20 bg-emerald-400/[0.09] text-emerald-300";
  }

  if (winRate >= 0.5) {
    return "border-lime-400/20 bg-lime-400/[0.08] text-lime-300";
  }

  if (winRate >= 0.4) {
    return "border-amber-400/20 bg-amber-400/[0.08] text-amber-300";
  }

  return "border-rose-400/20 bg-rose-400/[0.08] text-rose-300";
}

function cardSignal(card: ComparisonCardStat) {
  const delta = playRateDelta(card);

  if (card.plays > 0 && card.plays < 5) {
    return {
      className: "border-stone-500/20 bg-white/[0.045] text-stone-300",
      label: "Small sample",
    };
  }

  if (delta !== undefined && delta >= 0.1) {
    return {
      className: "border-emerald-400/20 bg-emerald-400/[0.09] text-emerald-300",
      label: "Above global",
    };
  }

  if (card.plays >= 10 && card.winRate >= 0.5) {
    return {
      className: "border-orange-400/25 bg-orange-400/[0.1] text-orange-300",
      label: "High usage",
    };
  }

  if (delta !== undefined && delta <= -0.1 && card.winRate < 0.45) {
    return {
      className: "border-rose-400/20 bg-rose-400/[0.08] text-rose-300",
      label: "Underperforming",
    };
  }

  return {
    className: "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
    label: "Tracked",
  };
}

function SummaryChip({
  accent,
  icon,
  label,
  value,
}: {
  accent?: "emerald" | "amber" | "orange";
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300"
      : accent === "amber"
        ? "border-amber-400/20 bg-amber-400/[0.08] text-amber-300"
        : "border-orange-400/20 bg-orange-400/[0.08] text-orange-300";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${accentClass}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold text-stone-100">
          {value}
        </span>
      </span>
    </div>
  );
}

function SummaryChipsRow({ cards }: { cards: ComparisonCardStat[] }) {
  if (cards.length === 0) return null;

  // Top win card: most wins
  const topWin = cards.reduce((best, c) => (c.wins > best.wins ? c : best));

  // Most overplayed: largest positive delta (personal >> global)
  const overplayed = cards
    .filter((c) => playRateDelta(c) !== undefined)
    .reduce<ComparisonCardStat | undefined>((best, c) => {
      const d = playRateDelta(c)!;
      if (!best) return d > 0 ? c : undefined;
      return d > playRateDelta(best)! ? c : best;
    }, undefined);

  // Best vs global: highest (personalPlayRate - globalPlayRate) with enough plays
  const bestVsGlobal = cards
    .filter((c) => c.plays >= 5 && playRateDelta(c) !== undefined)
    .reduce<ComparisonCardStat | undefined>((best, c) => {
      if (!best) return c;
      return playRateDelta(c)! > playRateDelta(best)! ? c : best;
    }, undefined);

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-white/[0.07] bg-black/10 px-5 py-4 sm:grid-cols-3 sm:px-6">
      <SummaryChip
        accent="orange"
        icon={<Trophy size={15} strokeWidth={1.8} />}
        label="Top win card"
        value={topWin.cardName}
      />
      {overplayed ? (
        <SummaryChip
          accent="amber"
          icon={<TrendingUp size={15} strokeWidth={1.8} />}
          label="Most above global"
          value={overplayed.cardName}
        />
      ) : null}
      {bestVsGlobal ? (
        <SummaryChip
          accent="emerald"
          icon={<Target size={15} strokeWidth={1.8} />}
          label="Best vs global"
          value={bestVsGlobal.cardName}
        />
      ) : null}
    </div>
  );
}

function CardThumbnail({ card }: { card: ProfileCardStat }) {
  if (isRenderableCardImage(card.thumbnailUrl)) {
    return (
      <Image
        alt={`${card.cardName} thumbnail`}
        className="h-[62px] w-[48px] shrink-0 rounded-md border border-white/10 object-cover shadow-lg transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
        height={62}
        src={card.thumbnailUrl}
        unoptimized
        width={48}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-[62px] w-[48px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.045] text-orange-300/60 shadow-inner"
    >
      <Layers3 aria-hidden="true" size={18} strokeWidth={1.6} />
    </span>
  );
}

function RateBar({
  accent,
  label,
  value,
}: {
  accent: "global" | "personal";
  label: string;
  value: number | undefined;
}) {
  const rate = clampRate(value);
  const percent = rate === undefined ? undefined : Math.round(rate * 100);
  const fillClass =
    accent === "personal"
      ? "bg-gradient-to-r from-orange-500 to-amber-300"
      : "bg-gradient-to-r from-stone-400 to-orange-200";

  return (
    <div className="flex items-center gap-3">
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full border border-white/[0.04] bg-white/[0.055] shadow-inner"
        role="progressbar"
      >
        {percent !== undefined ? (
          <span
            className={`block h-full rounded-full ${fillClass}`}
            style={{ width: `${percent}%` }}
          />
        ) : null}
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-stone-200">
        {formatOptionalPercent(rate)}
      </span>
    </div>
  );
}

function CardIdentity({ card, rank }: { card: ProfileCardStat; rank: number }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-label={`Rank ${rank}`}
        className="w-5 shrink-0 text-right text-xs tabular-nums text-stone-600"
      >
        {rank}
      </span>
      <span className="relative shrink-0">
        <CardThumbnail card={card} />
        {isRenderableCardImage(card.thumbnailUrl) ? (
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-14 top-1/2 z-20 hidden h-[164px] w-[126px] -translate-y-1/2 rounded-lg border border-orange-400/30 object-cover opacity-0 shadow-2xl shadow-black/50 transition-opacity duration-150 group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100"
            height={164}
            src={card.thumbnailUrl}
            unoptimized
            width={126}
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-stone-100 transition-colors group-hover:text-white">
          {card.cardName}
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-stone-500">
          <Eye aria-hidden="true" size={13} />
          <span>Details</span>
        </span>
      </span>
    </span>
  );
}

function DesktopHeader() {
  const headerClass =
    "flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-orange-300";

  return (
    <div className="sticky top-0 z-10 grid min-w-[1280px] grid-cols-[minmax(20rem,1.35fr)_6.5rem_5rem_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_6rem_8rem_7.5rem] items-center gap-5 border-b border-white/[0.07] bg-[#10161d]/95 px-5 py-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur">
      <span className={headerClass}>
        <Layers3 aria-hidden="true" size={15} /> Card
      </span>
      <span className={`${headerClass} justify-end`}>
        <Trophy aria-hidden="true" size={15} /> Wins
      </span>
      <span className={`${headerClass} justify-end`}>
        <Play aria-hidden="true" size={15} /> Plays
      </span>
      <span className={headerClass}>
        <User aria-hidden="true" size={15} /> Your play rate
      </span>
      <span className={headerClass}>
        <Globe2 aria-hidden="true" size={15} /> Global play rate
      </span>
      <span className={`${headerClass} justify-end`}>
        <TrendingUp aria-hidden="true" size={15} /> Delta
      </span>
      <span className={`${headerClass} justify-end`}>
        <BadgeCheck aria-hidden="true" size={15} /> Signal
      </span>
      <span className={`${headerClass} justify-end`}>
        <Target aria-hidden="true" size={15} /> Your win rate
      </span>
    </div>
  );
}

function CardRow({ card, rank }: { card: ComparisonCardStat; rank: number }) {
  const delta = playRateDelta(card);
  const signal = cardSignal(card);

  return (
    <li>
      <CardStatsButton
        card={{
          cardName: card.cardName,
          fullImageUrl: card.fullImageUrl,
          id: card.cardId,
          thumbnailUrl: card.thumbnailUrl,
        }}
        className="group grid min-w-[1280px] w-full grid-cols-[minmax(20rem,1.35fr)_6.5rem_5rem_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_6rem_8rem_7.5rem] items-center gap-5 px-5 py-2.5 text-left transition-all hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400/70"
      >
        <CardIdentity card={card} rank={rank} />
        <span className="text-right text-sm font-semibold tabular-nums text-stone-100">
          {card.wins}/{card.plays}
        </span>
        <span className="text-right text-sm font-medium tabular-nums text-stone-200">
          {card.plays}
        </span>
        <RateBar
          accent="personal"
          label={`Your play rate for ${card.cardName}`}
          value={card.personalPlayRate}
        />
        <RateBar
          accent="global"
          label={`Global play rate for ${card.cardName}`}
          value={card.globalPlayRate}
        />
        <span
          className={`inline-flex min-w-[5rem] justify-center justify-self-end rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${deltaToneClass(delta)}`}
        >
          {formatDelta(delta)}
        </span>
        <span
          className={`inline-flex min-w-[7rem] justify-center justify-self-end rounded-lg border px-2.5 py-1 text-xs font-bold ${signal.className}`}
        >
          {signal.label}
        </span>
        <span
          className={`inline-flex min-w-[6rem] justify-center justify-self-end rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums ${winRateToneClass(card.winRate)}`}
        >
          {formatPercent(card.winRate)}
        </span>
      </CardStatsButton>
    </li>
  );
}

function MobileCardRow({
  card,
  rank,
}: {
  card: ComparisonCardStat;
  rank: number;
}) {
  const delta = playRateDelta(card);
  const signal = cardSignal(card);

  return (
    <li>
      <CardStatsButton
        card={{
          cardName: card.cardName,
          fullImageUrl: card.fullImageUrl,
          id: card.cardId,
          thumbnailUrl: card.thumbnailUrl,
        }}
        className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400/70"
      >
        {/* Rank + thumbnail */}
        <span className="flex shrink-0 items-center gap-2">
          <span className="w-4 text-right text-[0.65rem] tabular-nums text-stone-600">
            {rank}
          </span>
          <CardThumbnail card={card} />
        </span>

        {/* Body */}
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Name + signal */}
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold leading-snug text-stone-100 transition-colors group-hover:text-white">
              {card.cardName}
            </span>
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[0.65rem] font-bold ${signal.className}`}
            >
              {signal.label}
            </span>
          </span>

          {/* Wins / Plays row */}
          <span className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <Trophy aria-hidden="true" size={11} />
              <span className="tabular-nums text-stone-200 font-medium">
                {card.wins}
              </span>
              <span>wins</span>
            </span>
            <span className="text-stone-600">/</span>
            <span className="flex items-center gap-1">
              <Play aria-hidden="true" size={11} />
              <span className="tabular-nums text-stone-200 font-medium">
                {card.plays}
              </span>
              <span>plays</span>
            </span>
          </span>

          {/* Rate bars */}
          <span className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-[0.65rem] text-stone-500">
              <User aria-hidden="true" size={10} />
              <span className="w-14 shrink-0">Your rate</span>
              <RateBar
                accent="personal"
                label={`Your play rate for ${card.cardName}`}
                value={card.personalPlayRate}
              />
            </span>
            <span className="flex items-center gap-2 text-[0.65rem] text-stone-500">
              <Globe2 aria-hidden="true" size={10} />
              <span className="w-14 shrink-0">Global</span>
              <RateBar
                accent="global"
                label={`Global play rate for ${card.cardName}`}
                value={card.globalPlayRate}
              />
            </span>
          </span>

          {/* Delta + win rate */}
          <span className="flex items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-[0.65rem] font-bold tabular-nums ${deltaToneClass(delta)}`}
            >
              {formatDelta(delta)}
            </span>
            <span className="text-[0.65rem] text-stone-500">vs global</span>
            <span className="ml-auto">
              <span
                className={`rounded-md border px-2 py-0.5 text-[0.65rem] font-bold tabular-nums ${winRateToneClass(card.winRate)}`}
              >
                {formatPercent(card.winRate)} win rate
              </span>
            </span>
          </span>
        </span>
      </CardStatsButton>
    </li>
  );
}

export function MostPlayedCardsDashboard({
  cards,
  emptyCopy,
}: MostPlayedCardsDashboardProps) {
  const rankedCards = [...(cards as ComparisonCardStat[])].sort(
    (left, right) =>
      right.wins - left.wins ||
      right.plays - left.plays ||
      right.winRate - left.winRate ||
      left.cardName.localeCompare(right.cardName),
  );

  return (
    <section className="tm-panel relative mx-auto w-full max-w-[96rem] overflow-hidden !border-orange-500/25 !bg-[#091017]/95 !p-0 shadow-[0_24px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_35%_65%,rgba(249,115,22,0.32),rgba(120,53,15,0.13)_38%,rgba(2,6,12,0)_72%)] blur-sm"
      />
      <header className="relative border-b border-white/[0.07] bg-gradient-to-r from-black/25 via-black/10 to-orange-950/10 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-400/[0.08] text-orange-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Layers3 aria-hidden="true" size={25} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-400">
              Card statistics
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-50 sm:text-[1.7rem]">
              Most-played cards in wins
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
              Select a card to open its image and compare your usage with the
              global field.
            </p>
          </div>
        </div>
      </header>

      {rankedCards.length === 0 ? (
        <p className="relative px-5 py-6 text-sm text-stone-400 sm:px-6">
          {emptyCopy}
        </p>
      ) : (
        <div className="relative">
          {/* Summary chips — always visible, full width */}
          <SummaryChipsRow cards={rankedCards} />

          {/* Desktop table (hidden on mobile) */}
          <div className="hidden overflow-x-auto sm:block">
            <DesktopHeader />
            <ol className="divide-y divide-white/[0.065]" role="list">
              {rankedCards.map((card, index) => (
                <CardRow card={card} key={card.cardId} rank={index + 1} />
              ))}
            </ol>
          </div>

          {/* Mobile card list (hidden on sm+) */}
          <ol
            className="divide-y divide-white/[0.065] sm:hidden"
            role="list"
          >
            {rankedCards.map((card, index) => (
              <MobileCardRow
                card={card}
                key={card.cardId}
                rank={index + 1}
              />
            ))}
          </ol>

          <div className="flex items-center gap-2 border-t border-white/[0.07] bg-black/15 px-5 py-3 text-xs text-stone-500 sm:px-6">
            <Info aria-hidden="true" className="text-orange-400/80" size={14} />
            Tap any card to view its image and personal/global win statistics.
          </div>
        </div>
      )}
    </section>
  );
}
