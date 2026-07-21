import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import { ImportReviewPanel } from './import-review-panel';

vi.mock('@/features/catalog/card-stats-actions', () => ({
  getCardWinStats: vi.fn().mockResolvedValue({
    globalGames: 0,
    globalWins: 0,
    personalGames: 0,
    personalWins: 0,
  }),
}));

describe('ImportReviewPanel', () => {
  it('treats matched cards with no printed tags as a valid zero-tag result', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 1,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
          tagSummaries: [
            {
              matchedCardCount: 1,
              matchedCards: [],
              playedCardCount: 1,
              playerName: 'Friday Mars',
              tagCounts: {
                animal: 0,
                building: 0,
                city: 0,
                earth: 0,
                event: 0,
                jovian: 0,
                microbe: 0,
                moon: 0,
                plant: 0,
                power: 0,
                science: 0,
                space: 0,
                venus: 0,
                wild: 0,
              },
              totalTags: 0,
              unresolvedCardCount: 0,
              unresolvedCards: [],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/friday mars: 0 played tags/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no tags were present on matched played cards/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/unresolved card/i)).not.toBeInTheDocument();
  });

  it('shows per-player played tag counts and unresolved catalog matches', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
          tagSummaries: [
            {
              matchedCardCount: 2,
              matchedCards: [],
              playedCardCount: 3,
              playerName: 'Friday Mars',
              tagCounts: {
                animal: 0,
                building: 1,
                city: 1,
                earth: 1,
                event: 0,
                jovian: 0,
                microbe: 0,
                moon: 0,
                plant: 0,
                power: 1,
                science: 1,
                space: 0,
                venus: 0,
                wild: 0,
              },
              totalTags: 5,
              unresolvedCardCount: 2,
              unresolvedCards: [
                {
                  cardName: 'Missing Project',
                  lineNumber: 7,
                  rawLine: 'Friday Mars played Missing Project',
                  reason: 'not_found',
                },
                {
                  candidateCards: [
                    {
                      cardId: 'card-duplicate-a',
                      cardName: 'Duplicate Project',
                      imageUrl: 'https://example.com/duplicate-project-a.png',
                    },
                    {
                      cardId: 'card-duplicate-b',
                      cardName: 'Duplicate Project',
                      imageUrl: 'https://example.com/duplicate-project-b.png',
                    },
                  ],
                  cardName: 'Duplicate Project',
                  lineNumber: 8,
                  rawLine: 'Friday Mars played Duplicate Project',
                  reason: 'ambiguous_match',
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /tags from log/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/friday mars: 5 played tags/i)).toBeInTheDocument();
    expect(screen.getByText('Building 1')).toBeInTheDocument();
    expect(screen.getByText('Science 1')).toBeInTheDocument();
    expect(screen.getByText('City 1')).toBeInTheDocument();
    expect(screen.getByText(/2 unresolved cards/i)).toBeInTheDocument();
    expect(screen.getByText(/missing project/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', {
        name: /show statistics for duplicate project/i,
      }),
    ).toHaveLength(2);
  });

  it('exposes only one manual-fill control when curated board review already covers the same unresolved card', async () => {
    const user = userEvent.setup();
    const onSelectManualReviewJumpTarget = vi.fn();
    const selectedManualReviewJumpTarget: ImportReviewJumpTarget = {
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    };

    render(
      <ImportReviewPanel
        onSelectManualReviewJumpTarget={onSelectManualReviewJumpTarget}
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          boardReviewItems: [
            {
              cardName: 'Commercial District',
              itemType: 'card',
              mapId: 'tharsis',
              notes: [
                'The city placement from Commercial District could not be linked safely from the imported log.',
              ],
              playerName: 'Friday Mars',
              sourceType: 'log_and_board',
              status: 'review_needed',
            },
          ],
          cardScoring: [
            {
              autoScoredCards: [],
              pendingCards: [
                {
                  cardId: 'card-1',
                  cardName: 'Commercial District',
                  reason:
                    'The city placement from Commercial District could not be linked safely from the imported log.',
                  reviewKind: 'board_evidence',
                },
              ],
              playerName: 'Friday Mars',
              totals: {
                animals: 0,
                complete: false,
                jovian: 0,
                microbes: 0,
                other: 0,
                total: 0,
              },
            },
          ],
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 1,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
        }}
        selectedManualReviewJumpTarget={selectedManualReviewJumpTarget}
      />,
    );

    const buttons = screen.getAllByRole('button', {
      name: /fill manually commercial district for friday mars/i,
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(/manual fill selected/i);

    await user.click(buttons[0]);

    expect(onSelectManualReviewJumpTarget).toHaveBeenCalledWith(
      selectedManualReviewJumpTarget,
    );
  });

  it('threads manual-fill jump props into board-aware pending card scoring rows', async () => {
    const user = userEvent.setup();
    const onSelectManualReviewJumpTarget = vi.fn();
    const selectedManualReviewJumpTarget: ImportReviewJumpTarget = {
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    };

    render(
      <ImportReviewPanel
        onSelectManualReviewJumpTarget={onSelectManualReviewJumpTarget}
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          cardScoring: [
            {
              autoScoredCards: [],
              pendingCards: [
                {
                  cardId: 'card-1',
                  cardName: 'Commercial District',
                  reason:
                    'The city placement from Commercial District could not be linked safely from the imported log.',
                  reviewKind: 'board_evidence',
                },
              ],
              playerName: 'Friday Mars',
              totals: {
                animals: 0,
                complete: false,
                jovian: 0,
                microbes: 0,
                other: 0,
                total: 0,
              },
            },
          ],
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 1,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
        }}
        selectedManualReviewJumpTarget={selectedManualReviewJumpTarget}
      />,
    );

    const button = screen.getByRole('button', {
      name: /fill manually commercial district for friday mars/i,
    });

    expect(button).toHaveTextContent(/manual fill selected/i);

    await user.click(button);

    expect(onSelectManualReviewJumpTarget).toHaveBeenCalledWith(
      selectedManualReviewJumpTarget,
    );
  });

  it('explains why an unreadable game result upload left the scores empty', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          evidenceReadError:
            'We could not find the victory point table on the first page of this PDF.',
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
        }}
      />,
    );

    expect(screen.getByTestId('evidence-read-error')).toHaveTextContent(
      /could not find the victory point table/i,
    );
  });

  it('stays quiet about the game result upload when it read cleanly', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          evidenceReadError: null,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [
            { playerName: 'Friday Mars', totalPoints: 61, trPoints: 18 },
          ],
        }}
      />,
    );

    expect(
      screen.queryByTestId('evidence-read-error'),
    ).not.toBeInTheDocument();
  });

  it('calls out when the draft will fall back to log score rows', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          detectedParticipantNames: ['Friday Mars', 'Second Seat'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          logScoreCandidates: [
            { playerName: 'Friday Mars', totalPoints: 61, trPoints: 18 },
            { playerName: 'Second Seat', totalPoints: 54, trPoints: 16 },
          ],
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
        }}
      />,
    );

    expect(
      screen.getByText(/no screenshot score rows were detected/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the draft will use the log score breakdown where available/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /log score breakdown/i }),
    ).toBeInTheDocument();
  });

  it('warns that conflicting score fields will be left blank for manual entry before save', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [{ playerName: 'Friday Mars', totalPoints: 62, trPoints: 18 }],
          scoreCrossChecks: [
            {
              conflictingFields: ['totalPoints'],
              matchingFields: ['trPoints'],
              playerName: 'Friday Mars',
              status: 'conflict',
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText(
        /conflicting score fields will be left blank in the draft and must be entered manually before the game can be saved/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/friday mars: log and screenshot disagree on total/i),
    ).toBeInTheDocument();
  });

  it('cross-checks calculated card scoring against the screenshot summary when no log score row exists (owner-reported scenario)', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          cardScoring: [
            {
              autoScoredCards: [
                {
                  cardId: 'card-1',
                  cardName: 'Ants',
                  category: 'animals',
                  evidenceSummary: '2 animals => 2 VP',
                  humanSummary: '1 VP per animal on this card',
                  points: 2,
                  sourceType: 'curated',
                },
              ],
              pendingCards: [],
              playerName: 'Izzy',
              totals: {
                animals: 9,
                complete: true,
                jovian: 3,
                microbes: 2,
                other: 17,
                total: 31,
              },
            },
          ],
          cardScoringCrossChecks: [
            {
              conflictingFields: [],
              hasExplicitLogScoreRow: false,
              matchingFields: [
                { calculatedValue: 31, field: 'cardPointsTotal', referenceValue: 31 },
              ],
              pendingCardCount: 0,
              playerName: 'Izzy',
              status: 'matched',
            },
          ],
          detectedParticipantNames: ['James', 'Izzy'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          // James has no calculated-card evidence, so his screenshot_only
          // line must be preserved exactly as before — only Izzy's is
          // superseded by the combined calculated-card message.
          scoreCandidates: [
            { cardPointsTotal: 31, playerName: 'Izzy' },
            { totalPoints: 40, playerName: 'James' },
          ],
          scoreCrossChecks: [
            {
              conflictingFields: [],
              matchingFields: [],
              playerName: 'Izzy',
              status: 'screenshot_only',
            },
            {
              conflictingFields: [],
              matchingFields: [],
              playerName: 'James',
              status: 'screenshot_only',
            },
          ],
        }}
      />,
    );

    // The obsolete standalone line the owner reported must be gone for Izzy,
    // once a combined calculated-card explanation exists for her.
    expect(
      screen.queryByText(/izzy: the screenshot provided score data without a log score row/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /no explicit log score row was present.*izzy: the summary card score and calculated card details agree at 31 vp/i,
      ),
    ).toBeInTheDocument();
    // James has no calculated-card evidence, so his original message is untouched.
    expect(
      screen.getByText(/james: the screenshot provided score data without a log score row/i),
    ).toBeInTheDocument();
    // The Calculated Card Scoring panel must remain visible.
    expect(
      screen.getByText(/izzy: 31 calculated card points/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/9 animal, 2 microbe, 3 jovian, 17 other/i)).toBeInTheDocument();
  });

  it('flags a conflict and requires manual review when calculated card scoring disagrees with the screenshot summary', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          cardScoring: [],
          cardScoringCrossChecks: [
            {
              conflictingFields: [
                { calculatedValue: 25, field: 'cardPointsTotal', referenceValue: 31 },
              ],
              hasExplicitLogScoreRow: false,
              matchingFields: [],
              pendingCardCount: 0,
              playerName: 'Izzy',
              status: 'conflict',
            },
          ],
          detectedParticipantNames: ['Izzy'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [{ cardPointsTotal: 31, playerName: 'Izzy' }],
        }}
      />,
    );

    expect(
      screen.getByText(
        /conflicting score fields will be left blank in the draft and must be entered manually before the game can be saved/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /izzy: the summary card score and calculated card details disagree on card points \(calculated 25 vs\. summary 31\)\. manual review is required/i,
      ),
    ).toBeInTheDocument();
  });

  it('suppresses the redundant screenshot_only line for a conflicting calculated cross-check too, matched by normalized player name', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          cardScoring: [],
          cardScoringCrossChecks: [
            {
              conflictingFields: [
                { calculatedValue: 25, field: 'cardPointsTotal', referenceValue: 31 },
              ],
              hasExplicitLogScoreRow: false,
              matchingFields: [],
              pendingCardCount: 0,
              // Differs in case from the scoreCrossChecks entry below —
              // normalized matching must still associate them as the same
              // player, not raw display-string equality.
              playerName: 'izzy',
              status: 'conflict',
            },
          ],
          detectedParticipantNames: ['Izzy'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [{ cardPointsTotal: 31, playerName: 'Izzy' }],
          scoreCrossChecks: [
            {
              conflictingFields: [],
              matchingFields: [],
              playerName: 'Izzy',
              status: 'screenshot_only',
            },
          ],
        }}
      />,
    );

    expect(
      screen.queryByText(/^izzy: the screenshot provided score data without a log score row\.$/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /izzy: the summary card score and calculated card details disagree on card points/i,
      ),
    ).toBeInTheDocument();
  });

  it('describes an incomplete calculated card score as partial evidence instead of a false conflict', () => {
    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        playerSelections={{}}
        review={{
          cardScoring: [],
          cardScoringCrossChecks: [
            {
              conflictingFields: [],
              hasExplicitLogScoreRow: false,
              matchingFields: [],
              pendingCardCount: 1,
              playerName: 'Izzy',
              status: 'incomplete',
            },
          ],
          detectedParticipantNames: ['Izzy'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 3,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [{ cardPointsTotal: 31, playerName: 'Izzy' }],
        }}
      />,
    );

    expect(
      screen.getByText(
        /izzy: calculated card scoring is still incomplete \(1 card pending review\), so it can't be fully cross-checked against the summary yet/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        /conflicting score fields will be left blank in the draft/i,
      ),
    ).not.toBeInTheDocument();
  });
});
