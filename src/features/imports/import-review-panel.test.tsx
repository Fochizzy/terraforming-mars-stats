import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import { ImportReviewPanel } from './import-review-panel';

describe('ImportReviewPanel', () => {
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
});
