import Image from "next/image";
import type { ReactNode } from "react";
import {
  Globe2,
  Info,
  Layers3,
  Play,
  Target,
  Trophy,
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

function CardThumbnail({ card }: { card: ProfileCardStat }) {
  if (isRenderableCardImage(card.thumbnailUrl)) {
    return (
      <Image
        alt={`${card.cardName} thumbnail`}
        className="h-[54px] w-[42px] shrink-0 rounded-md border border-white/10 object-cover shadow-lg transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
        height={54}
        src={card.thumbnailUrl}
        unoptimized
        width={42}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-[54px] w-[42px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.045] text-orange-300/60 shadow-inner"
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
      <CardThumbnail card={card} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-stone-100 transition-colors group-hover:text-white">
          {card.cardName}
        </span>
        <span className="mt-1 block text-xs text-stone-500">
          Open image and detailed statistics
        </span>
      </span>
    </span>
  );
}

function MetricLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
      {children}
    </span>
  );
}

function DesktopHeader() {
  const headerClass =
    "flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-orange-300";

  return (
    <div className="grid min-w-[1080px] grid-cols-[minmax(20rem,1.45fr)_6.5rem_5rem_minmax(12rem,0.85fr)_minmax(12rem,0.85fr)_7rem] items-center gap-5 border-b border-white/[0.07] bg-black/20 px-5 py-3.5">
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
        <Target aria-hidden="true" size={15} /> Win rate
      </span>
    </div>
  );
}

function CardRow({ card, rank }: { card: ComparisonCardStat; rank: number }) {
  return (
    <li>
      <CardStatsButton
        card={{
          cardName: card.cardName,
          fullImageUrl: card.fullImageUrl,
          id: card.cardId,
          thumbnailUrl: card.thumbnailUrl,
        }}
        className="group grid min-w-[1080px] w-full grid-cols-[minmax(20rem,1.45fr)_6.5rem_5rem_minmax(12rem,0.85fr)_minmax(12rem,0.85fr)_7rem] items-center gap-5 px-5 py-2.5 text-left transition-all hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400/70"
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
          className={`inline-flex min-w-[5.5rem] justify-center justify-self-end rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums ${winRateToneClass(card.winRate)}`}
        >
          {formatPercent(card.winRate)}
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
          <div className="overflow-x-auto">
            <DesktopHeader />
            <ol className="divide-y divide-white/[0.065]" role="list">
              {rankedCards.map((card, index) => (
                <CardRow card={card} key={card.cardId} rank={index + 1} />
              ))}
            </ol>
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.07] bg-black/15 px-5 py-3 text-xs text-stone-500 sm:px-6">
            <Info aria-hidden="true" className="text-orange-400/80" size={14} />
            Click any card row to view its image and personal/global win
            statistics.
          </div>
        </div>
      )}
    </section>
  );
}
