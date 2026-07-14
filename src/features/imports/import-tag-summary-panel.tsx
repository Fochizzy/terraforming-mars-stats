import { TagIcon } from '@/components/ui/tag-icon';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import {
  PLAYER_TAG_CODES,
  type ImportPlayerTagCandidateCard,
  type ImportPlayerTagSummary,
  type PlayerTagCode,
} from '@/lib/imports/derive-player-tag-summaries';

const tagLabels: Record<PlayerTagCode, string> = {
  animal: 'Animal',
  building: 'Building',
  city: 'City',
  earth: 'Earth',
  event: 'Event',
  jovian: 'Jovian',
  microbe: 'Microbe',
  moon: 'Moon',
  plant: 'Plant',
  power: 'Power',
  science: 'Science',
  space: 'Space',
  venus: 'Venus',
  wild: 'Wild',
};

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function CandidateCardButton({
  candidate,
  index,
}: {
  candidate: ImportPlayerTagCandidateCard;
  index: number;
}) {
  return (
    <CardStatsButton
      card={{
        cardName: candidate.cardName,
        fullImageUrl: candidate.imageUrl,
        id: candidate.cardId,
        thumbnailUrl: candidate.imageUrl,
      }}
      className="tm-button-secondary"
    >
      Open candidate {index + 1}
    </CardStatsButton>
  );
}

type ImportTagSummaryPanelProps = {
  summaries: ImportPlayerTagSummary[];
};

export function ImportTagSummaryPanel({
  summaries,
}: ImportTagSummaryPanelProps) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-4">
      <h3 className="tm-data-label text-xs">Tags from Log</h3>
      <div className="mt-3 flex flex-col gap-3 text-sm text-sky-50">
        {summaries.map((summary) => {
          const nonZeroTags = PLAYER_TAG_CODES.filter(
            (tagCode) => summary.tagCounts[tagCode] > 0,
          );

          return (
            <section
              className="rounded-xl bg-white/[0.03] px-3 py-3"
              key={summary.playerName}
            >
              <p className="font-semibold">
                {summary.playerName}: {formatCountLabel(summary.totalTags, 'played tag')}
              </p>
              <p className="mt-1 text-xs text-sky-100/80">
                {formatCountLabel(summary.matchedCardCount, 'matched card')} from{' '}
                {formatCountLabel(summary.playedCardCount, 'played card')}
                {summary.unresolvedCardCount > 0
                  ? `; ${formatCountLabel(summary.unresolvedCardCount, 'unresolved card')}`
                  : ''}
              </p>
              {nonZeroTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {nonZeroTags.map((tagCode) => (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-sky-100/20 bg-black/20 px-2.5 py-1"
                      key={`${summary.playerName}-${tagCode}`}
                    >
                      <TagIcon code={tagCode} size={16} />
                      {tagLabels[tagCode]} {summary.tagCounts[tagCode]}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-sky-100/80">
                  No tags were present on matched played cards.
                </p>
              )}
              {summary.unresolvedCards.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1 text-xs text-amber-100">
                  {summary.unresolvedCards.map((card) => (
                    <li key={`${summary.playerName}-${card.lineNumber}-${card.cardName}`}>
                      <div className="flex flex-col gap-2">
                        <span>
                          {card.cardName} on line {card.lineNumber}:{' '}
                          {card.reason === 'ambiguous_match'
                            ? 'multiple catalog cards matched this name'
                            : 'no catalog card matched this name'}
                        </span>
                        {card.candidateCards && card.candidateCards.length > 0 ? (
                          <span className="flex flex-wrap gap-2">
                            {card.candidateCards.map((candidate, candidateIndex) => (
                              <CandidateCardButton
                                candidate={candidate}
                                key={`${candidate.cardId}-${candidateIndex}`}
                                index={candidateIndex}
                              />
                            ))}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
