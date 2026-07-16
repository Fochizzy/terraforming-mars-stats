import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import { ImportReviewPanel } from './import-review-panel';

describe('ImportReviewPanel', () => {
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
});
