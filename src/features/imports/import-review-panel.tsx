import type {
  ImportCardScoringCrossCheck,
  ImportCardScoringFieldComparison,
  ImportReviewModel,
  ImportScoreCrossCheck,
} from '@/lib/imports/build-import-review-model';
import type { CuratedBoardImportItem } from '@/lib/imports/score-curated-board-import-items';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import type { PlayerIdentity } from '@/lib/imports/resolve-player-identity';
import { ImportCardScoringPanel } from './import-card-scoring-panel';
import { ImportPlayerResolutionPanel } from './import-player-resolution-panel';
import { ImportScoreCandidatesPanel } from './import-score-candidates-panel';
import { ImportTagSummaryPanel } from './import-tag-summary-panel';

function formatScoreFieldLabel(field: string) {
  switch (field) {
    case 'awardPoints':
      return 'awards';
    case 'cardPointsAnimals':
      return 'animal card points';
    case 'cardPointsJovian':
      return 'Jovian card points';
    case 'cardPointsMicrobes':
      return 'microbe card points';
    case 'cardPointsTotal':
      return 'card points';
    case 'citiesPoints':
      return 'cities';
    case 'finalMegacredits':
      return 'final MC';
    case 'greeneryPoints':
      return 'greenery';
    case 'milestonePoints':
      return 'milestones';
    case 'totalPoints':
      return 'total';
    case 'trPoints':
      return 'TR';
    default:
      return field;
  }
}

function formatScoreFieldList(fields: string[]) {
  return fields.map(formatScoreFieldLabel).join(', ');
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildScoreCrossCheckMessage(check: ImportScoreCrossCheck) {
  switch (check.status) {
    case 'conflict': {
      const conflictSummary = formatScoreFieldList(check.conflictingFields);
      const matchSummary =
        check.matchingFields.length > 0
          ? ` but match on ${formatScoreFieldList(check.matchingFields)}`
          : '';

      return `${check.playerName}: log and screenshot disagree on ${conflictSummary}${matchSummary}.`;
    }
    case 'log_only':
      return `${check.playerName}: the log provided score data without a screenshot match.`;
    case 'matched':
      return `${check.playerName}: log and screenshot agree on ${formatScoreFieldList(check.matchingFields)}.`;
    case 'screenshot_only':
      return `${check.playerName}: the screenshot provided score data without a log score row.`;
    default:
      return '';
  }
}

function formatCardScoringFieldComparison(
  comparison: ImportCardScoringFieldComparison,
) {
  return `${formatScoreFieldLabel(comparison.field)} (calculated ${comparison.calculatedValue} vs. summary ${comparison.referenceValue})`;
}

function buildCardScoringCrossCheckMessage(check: ImportCardScoringCrossCheck) {
  const missingLogRowNote = check.hasExplicitLogScoreRow
    ? ''
    : 'No explicit log score row was present for this player. ';

  if (check.status === 'incomplete') {
    return `${missingLogRowNote}${check.playerName}: calculated card scoring is still incomplete (${formatCountLabel(check.pendingCardCount, 'card')} pending review), so it can't be fully cross-checked against the summary yet.`;
  }

  if (check.status === 'conflict') {
    return `${missingLogRowNote}${check.playerName}: the summary card score and calculated card details disagree on ${check.conflictingFields
      .map(formatCardScoringFieldComparison)
      .join(', ')}. Manual review is required.`;
  }

  const totalMatch = check.matchingFields.find(
    (field) => field.field === 'cardPointsTotal',
  );

  if (totalMatch) {
    return `${missingLogRowNote}${check.playerName}: the summary card score and calculated card details agree at ${totalMatch.calculatedValue} VP.`;
  }

  return `${missingLogRowNote}${check.playerName}: the summary card score and calculated card details agree on ${formatScoreFieldList(
    check.matchingFields.map((field) => field.field),
  )}.`;
}

function formatManualReviewScoreFieldLabel(scoreField: ImportReviewJumpTarget['scoreField']) {
  switch (scoreField) {
    case 'awardPoints':
      return 'Award Points';
    case 'cardPointsTotal':
      return 'Total Card Points';
    default:
      return scoreField;
  }
}

function buildBoardReviewItemHeading(item: CuratedBoardImportItem) {
  if (item.itemType === 'card') {
    return `${item.cardName} · ${item.playerName}`;
  }

  return `${item.awardName} · ${item.fundedByPlayerName}`;
}

function buildBoardReviewJumpTarget(
  item: CuratedBoardImportItem,
): ImportReviewJumpTarget | null {
  if (item.status !== 'review_needed') {
    return null;
  }

  if (item.itemType === 'card') {
    return {
      itemLabel: item.cardName,
      message:
        item.notes[0] ??
        `${item.cardName} could not be read from the imported board evidence.`,
      playerName: item.playerName,
      scoreField: 'cardPointsTotal',
    };
  }

  return {
    itemLabel: item.awardName,
    message:
      item.notes[0] ??
      `${item.awardName} could not be read from the imported board evidence.`,
    playerName: item.fundedByPlayerName,
    scoreField: 'awardPoints',
  };
}

type ImportReviewPanelProps = {
  creatingImportedName?: string | null;
  onCreatePlayer?: (
    importedName: string,
    username?: string,
    fullName?: string,
  ) => Promise<void>;
  onIdentityChange?: (importedName: string, identity: PlayerIdentity) => void;
  onSelectionChange: (importedName: string, playerId: string) => void;
  onSelectManualReviewJumpTarget?: (target: ImportReviewJumpTarget) => void;
  playerIdentities?: Record<string, PlayerIdentity>;
  review: ImportReviewModel | null;
  selectedManualReviewJumpTarget?: ImportReviewJumpTarget | null;
  playerSelections: Record<string, string>;
};

export function ImportReviewPanel({
  creatingImportedName,
  onCreatePlayer,
  onIdentityChange,
  onSelectionChange,
  onSelectManualReviewJumpTarget,
  playerIdentities,
  review,
  selectedManualReviewJumpTarget,
  playerSelections,
}: ImportReviewPanelProps) {
  if (!review) {
    return null;
  }

  const detectedParticipantNames = review.detectedParticipantNames ?? [];
  const cardScoring = review.cardScoring ?? [];
  const tagSummaries = review.tagSummaries ?? [];
  const logScoreCandidates = review.logScoreCandidates ?? [];
  const boardReviewItems = review.boardReviewItems ?? [];
  const boardReviewJumpTargets = boardReviewItems.flatMap((item) => {
    const jumpTarget = buildBoardReviewJumpTarget(item);
    return jumpTarget ? [jumpTarget] : [];
  });
  const scoreCrossChecks = review.scoreCrossChecks ?? [];
  const cardScoringCrossChecks = review.cardScoringCrossChecks ?? [];
  const hasScoreConflicts =
    scoreCrossChecks.some((check) => check.status === 'conflict') ||
    cardScoringCrossChecks.some((check) => check.status === 'conflict');
  const screenshotScoreDetails = review.screenshotScoreDetails ?? {
    awardPlacements: [],
    efficiencies: [],
    milestoneClaims: [],
  };
  const hasScreenshotScoreDetails =
    screenshotScoreDetails.awardPlacements.length > 0 ||
    screenshotScoreDetails.efficiencies.length > 0 ||
    screenshotScoreDetails.milestoneClaims.length > 0;
  const shouldExplainLogScoreFallback =
    logScoreCandidates.length > 0 && review.scoreCandidates.length === 0;

  return (
    <section className="tm-panel flex flex-col gap-3">
      <h2 className="tm-panel-title text-lg">Import Review</h2>
      <p className="tm-body-copy text-sm">
        Parsed {review.parsedEventCount} actionable log events and ignored{' '}
        {review.ignoredLineCount} filler lines.
      </p>
      <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
        {review.drawInfoLineCount} draw-only lines were kept as context.
      </p>
      {detectedParticipantNames.length > 0 ? (
        <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
          Detected from log: {detectedParticipantNames.join(', ')}
        </p>
      ) : null}
      {review.evidenceReadError ? (
        <p className="tm-banner-danger" data-testid="evidence-read-error">
          The game result upload could not be read: {review.evidenceReadError}{' '}
          Scores, milestones and award placements it carries are missing below.
        </p>
      ) : null}
      {review.requiresPlayerConfirmation ? (
        <p className="tm-banner-warning">
          Some imported names still need profile confirmation before final
          scoring.
        </p>
      ) : null}
      {shouldExplainLogScoreFallback ? (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <h3 className="tm-data-label text-xs">Score Row Fallback</h3>
          <p className="mt-3 text-sm text-emerald-50">
            No screenshot score rows were detected. The log includes{' '}
            {formatCountLabel(logScoreCandidates.length, 'score row')}, so the
            draft will use the log score breakdown where available.
          </p>
        </div>
      ) : null}
      {logScoreCandidates.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="tm-data-label text-xs">Log Score Breakdown</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {logScoreCandidates.map((candidate) => (
              <li
                className="rounded-xl bg-white/[0.03] px-3 py-2 text-stone-100"
                key={`log-${candidate.playerName}`}
              >
                {candidate.playerName}: {candidate.totalPoints ?? 'unknown'} total
                {candidate.trPoints == null ? null : `, ${candidate.trPoints} TR`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {scoreCrossChecks.length > 0 || cardScoringCrossChecks.length > 0 ? (
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
          <h3 className="tm-data-label text-xs">Evidence Cross-Check</h3>
          {hasScoreConflicts ? (
            <p className="mt-3 text-sm text-cyan-50">
              Conflicting score fields will be left blank in the draft and must
              be entered manually before the game can be saved.
            </p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-2 text-sm text-cyan-50">
            {scoreCrossChecks.map((check) => (
              <li key={`${check.playerName}-${check.status}`}>
                {buildScoreCrossCheckMessage(check)}
              </li>
            ))}
            {cardScoringCrossChecks.map((check) => (
              <li key={`card-scoring-${check.playerName}-${check.status}`}>
                {buildCardScoringCrossCheckMessage(check)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {boardReviewItems.length > 0 ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
          <h3 className="tm-data-label text-xs">Curated Board Review</h3>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {boardReviewItems.map((item) => {
              const jumpTarget = buildBoardReviewJumpTarget(item);
              const isSelected =
                jumpTarget != null &&
                selectedManualReviewJumpTarget?.itemLabel === jumpTarget.itemLabel &&
                selectedManualReviewJumpTarget.playerName === jumpTarget.playerName &&
                selectedManualReviewJumpTarget.scoreField === jumpTarget.scoreField;

              return (
                <li
                  className="rounded-xl bg-white/[0.03] px-3 py-3"
                  key={`${item.itemType}-${buildBoardReviewItemHeading(item)}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-stone-100">
                        {buildBoardReviewItemHeading(item)}
                      </p>
                      {item.notes[0] ? (
                        <p style={{ color: 'var(--tm-muted)' }}>{item.notes[0]}</p>
                      ) : null}
                      <p className="text-xs tm-accent-copy">
                        {item.status === 'review_needed'
                          ? 'Needs manual review before final scoring.'
                          : 'Curated board evidence covered this item.'}
                      </p>
                    </div>
                    {jumpTarget ? (
                      <button
                        aria-label={`Fill manually ${jumpTarget.itemLabel} for ${jumpTarget.playerName}`}
                        className="tm-button-secondary shrink-0"
                        onClick={() => onSelectManualReviewJumpTarget?.(jumpTarget)}
                        type="button"
                      >
                        {isSelected
                          ? `Manual fill selected · ${formatManualReviewScoreFieldLabel(jumpTarget.scoreField)}`
                          : 'Fill manually'}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <ImportCardScoringPanel
        onSelectManualReviewJumpTarget={onSelectManualReviewJumpTarget}
        selectedManualReviewJumpTarget={selectedManualReviewJumpTarget}
        suppressedManualReviewTargets={boardReviewJumpTargets}
        summaries={cardScoring}
      />
      {hasScreenshotScoreDetails ? (
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4">
          <h3 className="tm-data-label text-xs">
            Milestones, Awards &amp; Efficiency (Screenshot)
          </h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-emerald-50">
            {screenshotScoreDetails.milestoneClaims.map((claim) => (
              <li key={`milestone-${claim.playerName}-${claim.milestoneName}`}>
                {claim.playerName} claimed the {claim.milestoneName} milestone
                for {claim.points} VP
                {claim.matchedMilestoneId
                  ? ''
                  : ' (milestone name not recognized for this map)'}
                .
              </li>
            ))}
            {screenshotScoreDetails.awardPlacements.map((placement) => (
              <li
                key={`award-${placement.playerName}-${placement.awardName}-${placement.placement}`}
              >
                {placement.playerName} took{' '}
                {placement.placement === 1 ? '1st' : '2nd'} place for the{' '}
                {placement.awardName} award for {placement.points} VP
                {placement.fundedByPlayerName
                  ? ` (funded by ${placement.fundedByPlayerName})`
                  : ''}
                {placement.matchedAwardId
                  ? ''
                  : ' (award name not recognized for this map)'}
                .
              </li>
            ))}
            {screenshotScoreDetails.efficiencies.map((entry) => (
              <li key={`efficiency-${entry.playerName}`}>
                {entry.playerName} efficiency:{' '}
                {entry.efficiency > 0 ? '+' : ''}
                {entry.efficiency}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ImportTagSummaryPanel summaries={tagSummaries} />
      <ImportPlayerResolutionPanel
        creatingImportedName={creatingImportedName}
        onCreatePlayer={onCreatePlayer}
        onIdentityChange={onIdentityChange}
        onSelectionChange={onSelectionChange}
        playerIdentities={playerIdentities}
        playerLinks={review.playerLinks}
        playerSelections={playerSelections}
      />
      <ImportScoreCandidatesPanel scoreCandidates={review.scoreCandidates} />
    </section>
  );
}
