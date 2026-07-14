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
});
