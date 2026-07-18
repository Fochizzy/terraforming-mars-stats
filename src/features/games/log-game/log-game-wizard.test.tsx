import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { LogGameWizard } from './log-game-wizard';

const GROUP_ID = '11111111-1111-4111-8111-111111111111';
const DRAFT_GAME_ID = '22222222-2222-4222-8222-222222222222';

function buildInitialValues(
  overrides: Partial<LogGameDraftInput> = {},
): LogGameDraftInput {
  return {
    awardClaims: {},
    gameId: undefined,
    groupId: GROUP_ID,
    milestoneClaims: {},
    playedOn: '2026-07-03',
    mapId: 'tharsis',
    objectiveConfiguration: 'board_defined',
    notes: '',
    playerCount: 2,
    playerScores: {},
    playerSelections: {},
    generationCount: 10,
    guaranteedMergerOffer: true,
    mergerOfferRuleSource: 'group_default',
    playerStyles: {},
    promoSetSlugs: [],
    selectedPlayerIds: ['p1', 'p2'],
    ...overrides,
  };
}

function renderWizard({
  initialValues = buildInitialValues(),
  onFinalizeGame = vi.fn().mockResolvedValue({
    status: 'success' as const,
    gameId: 'game-1',
    message: 'Game finalized.',
  }),
  onSaveDraft = vi.fn().mockResolvedValue({
    status: 'success' as const,
    gameId: 'game-1',
    message: 'Draft created.',
  }),
} = {}) {
  render(
    <LogGameWizard
      awardOptions={[
        { awardId: 'award1', awardName: 'Landlord', mapId: 'tharsis' },
      ]}
      cardOptions={[
        {
          cardName: 'Io Mining Industries',
          cardNumber: '042',
          expansionCode: 'base',
          id: 'card1',
          promoSetSlug: null,
        },
      ]}
      corporationOptions={[
        {
          code: 'base:tharsis-republic',
          expansionCode: 'base',
          id: 'corp1',
          logoPath: 'Tharsis_Republic.png',
          name: 'Tharsis Republic',
          promoSetSlug: null,
        },
      ]}
      groupName="Friday Group"
      initialValues={initialValues}
      mapOptions={[
        { id: 'tharsis', code: 'tharsis', name: 'Tharsis' },
        { id: 'elysium', code: 'elysium', name: 'Elysium' },
      ]}
      milestoneOptions={[
        { mapId: 'tharsis', milestoneId: 'milestone1', milestoneName: 'Builder' },
      ]}
      onFinalizeGame={onFinalizeGame}
      onSaveDraft={onSaveDraft}
      playerOptions={[
        { id: 'p1', display_name: 'Friday Mars' },
        { id: 'p2', display_name: 'Second Seat' },
        { id: 'p3', display_name: 'Third Seat' },
      ]}
      preludeOptions={[
        {
          expansionCode: 'prelude',
          id: 'prelude1',
          name: 'Allied Bank',
        },
        {
          expansionCode: 'prelude',
          id: 'prelude-merger',
          name: 'Merger',
        },
      ]}
      promoSetOptions={[
        {
          id: 'promo-2022',
          slug: '2022-promos',
          displayName: '2022 Promo Pack',
          editionLabel: '2022 Promo Pack',
          promoYear: 2022,
        },
      ]}
      styleOptions={[
        { code: 'engine_builder', id: 'style1', name: 'Engine Builder' },
        { code: 'card_combo', id: 'style2', name: 'Card Combo' },
      ]}
    />,
  );

  return { onFinalizeGame, onSaveDraft };
}

function stepNav() {
  return screen.getByRole('navigation', { name: /manual entry steps/i });
}

async function selectNavStep(
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
) {
  await user.click(within(stepNav()).getByRole('button', { name: label }));
}

async function clickContinue(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^continue/i }));
}

async function clickBack(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^back/i }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LogGameWizard', () => {
  it('starts on Setup with draft context, progress, and only Setup content', () => {
    renderWizard();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Setup' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('manual-entry-step-counter')).toHaveTextContent(
      'Step 1 of 6',
    );
    expect(screen.getByLabelText('Played On')).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/friday mars corporation/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('New manual game — not saved yet'),
    ).toBeInTheDocument();
    expect(screen.getByText('Not saved yet.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^back/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^continue/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save draft/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /finalize game/i }),
    ).not.toBeInTheDocument();
  });

  it('adds a typed player name that is not already in the saved roster', async () => {
    const user = userEvent.setup();

    renderWizard({
      initialValues: buildInitialValues({
        playerCount: 1,
        selectedPlayerIds: [],
      }),
    });

    await selectNavStep(user, /players & corporations/i);

    await user.type(
      screen.getByLabelText(/add or select player/i),
      'New Player Name',
    );
    await user.click(screen.getByRole('button', { name: /add player/i }));

    expect(screen.getByText(/1 of 1 seats filled/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/add or select player/i)).toHaveValue('');
    expect(
      screen.getAllByRole('button', { name: /remove/i }),
    ).toHaveLength(1);
  });

  it('prevents duplicate players and keeps seat counts consistent', async () => {
    const user = userEvent.setup();

    renderWizard();

    await selectNavStep(user, /players & corporations/i);

    expect(screen.getByText(/2 of 2 seats filled/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add player/i })).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: /remove friday mars/i }),
    );
    expect(screen.getByText(/1 of 2 seats filled/i)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/add or select player/i),
      'Second Seat',
    );
    await user.click(screen.getByRole('button', { name: /add player/i }));

    expect(
      screen.getByText('That player is already selected for this game.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 seats filled/i)).toBeInTheDocument();
  });

  it('submits a full draft payload with player, score, milestone, award, and style data', async () => {
    const user = userEvent.setup();
    const { onFinalizeGame, onSaveDraft } = renderWizard();

    expect(
      screen.getByRole('link', { name: /import game/i }),
    ).toHaveAttribute('href', '/log-game/import');
    expect(
      screen.getByRole('link', { name: /manual entry/i }),
    ).toHaveAttribute('aria-current', 'page');

    await user.clear(screen.getByLabelText(/generation count/i));
    await user.type(screen.getByLabelText(/generation count/i), '11');
    await user.click(screen.getByLabelText(/2022 promo pack/i));

    await clickContinue(user);
    await user.selectOptions(screen.getByLabelText(/friday mars corporation/i), 'corp1');
    await user.selectOptions(screen.getByLabelText(/friday mars prelude 1/i), 'prelude1');

    await clickContinue(user);
    await user.click(screen.getByLabelText(/builder claimed/i));
    await user.click(screen.getByLabelText(/builder winner friday mars/i));
    await user.click(screen.getByLabelText(/landlord funded/i));
    await user.selectOptions(screen.getByLabelText(/landlord funded by/i), 'p2');
    await user.click(screen.getByLabelText(/landlord first place friday mars/i));
    await user.click(screen.getByLabelText(/landlord second place second seat/i));

    await clickContinue(user);
    await user.clear(screen.getByLabelText(/friday mars cities/i));
    await user.type(screen.getByLabelText(/friday mars cities/i), '5');
    await user.clear(screen.getByLabelText(/friday mars greenery/i));
    await user.type(screen.getByLabelText(/friday mars greenery/i), '6');
    await user.clear(screen.getByLabelText(/friday mars total card points/i));
    await user.type(screen.getByLabelText(/friday mars total card points/i), '18');
    await user.clear(screen.getByLabelText(/friday mars terraform rating points/i));
    await user.type(screen.getByLabelText(/friday mars terraform rating points/i), '21');
    await user.clear(screen.getByLabelText(/friday mars milestone points/i));
    await user.type(screen.getByLabelText(/friday mars milestone points/i), '5');
    await user.clear(screen.getByLabelText(/friday mars award points/i));
    await user.type(screen.getByLabelText(/friday mars award points/i), '5');
    await user.clear(screen.getByLabelText(/friday mars total points/i));
    await user.type(screen.getByLabelText(/friday mars total points/i), '55');
    await user.clear(screen.getByLabelText(/friday mars final megacredits/i));
    await user.type(screen.getByLabelText(/friday mars final megacredits/i), '8');

    await clickContinue(user);
    await user.selectOptions(screen.getByLabelText(/friday mars declared style/i), 'engine_builder');
    await user.selectOptions(screen.getByLabelText(/friday mars style modifier 1/i), 'card_combo');
    await user.selectOptions(screen.getByLabelText(/friday mars key card 1/i), 'card1');

    await clickContinue(user);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Review' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() =>
      expect(onSaveDraft).toHaveBeenCalledWith({
        awardClaims: {
          award1: {
            firstPlaceWinnerPlayerIds: ['p1'],
            funded: true,
            fundedByPlayerId: 'p2',
            secondPlaceWinnerPlayerIds: ['p2'],
          },
        },
        gameId: undefined,
        groupId: GROUP_ID,
        playedOn: '2026-07-03',
        mapId: 'tharsis',
        objectiveConfiguration: 'board_defined',
        milestoneClaims: {
          milestone1: {
            claimed: true,
            winnerPlayerId: 'p1',
          },
        },
        notes: '',
        playerCount: 2,
        generationCount: 11,
        guaranteedMergerOffer: true,
        mergerOfferRuleSource: 'group_default',
        playerScores: {
          p1: {
            awardPoints: 5,
            cardPointsAnimals: undefined,
            cardPointsJovian: undefined,
            cardPointsMicrobes: undefined,
            cardPointsTotal: 18,
            citiesPoints: 5,
            finalMegacredits: 8,
            greeneryPoints: 6,
            milestonePoints: 5,
            totalPoints: 55,
            trPoints: 21,
          },
        },
        playerSelections: {
          p1: {
            corporationId: 'corp1',
            preludeIds: ['prelude1'],
          },
        },
        playerStyles: {
          p1: {
            keyCardIds: ['card1'],
            modifierStyleCodes: ['card_combo'],
            primaryStyleCode: 'engine_builder',
          },
        },
        promoSetSlugs: ['2022-promos'],
        selectedPlayerIds: ['p1', 'p2'],
      }),
    );
    expect(onFinalizeGame).not.toHaveBeenCalled();
  });

  it('preserves entered data when leaving and revisiting steps', async () => {
    const user = userEvent.setup();

    renderWizard();

    await user.click(screen.getByLabelText(/2022 promo pack/i));
    await clickContinue(user);
    await user.selectOptions(
      screen.getByLabelText(/friday mars corporation/i),
      'corp1',
    );

    await clickContinue(user);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Milestones & Awards' }),
    ).toBeInTheDocument();

    await clickBack(user);
    expect(
      screen.getByLabelText(/friday mars corporation/i),
    ).toHaveValue('corp1');

    await clickBack(user);
    expect(screen.getByLabelText(/2022 promo pack/i)).toBeChecked();
  });

  it('moves focus to the active step heading on step transitions', async () => {
    const user = userEvent.setup();

    renderWizard();

    await clickContinue(user);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Players & Corporations' }),
    ).toHaveFocus();

    await clickBack(user);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Setup' }),
    ).toHaveFocus();

    await selectNavStep(user, /final scores/i);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Final Scores' }),
    ).toHaveFocus();
  });

  it('identifies the active step and supports revisiting completed steps', async () => {
    const user = userEvent.setup();

    renderWizard();

    const setupButton = within(stepNav()).getByRole('button', {
      name: /^setup/i,
    });

    expect(setupButton).toHaveAttribute('aria-current', 'step');

    await clickContinue(user);
    expect(setupButton).not.toHaveAttribute('aria-current', 'step');
    expect(
      within(stepNav()).getByRole('button', {
        name: /players & corporations/i,
      }),
    ).toHaveAttribute('aria-current', 'step');

    await selectNavStep(user, /setup, completed/i);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Setup' }),
    ).toBeInTheDocument();
    expect(setupButton).toHaveAttribute('aria-current', 'step');
  });

  it('shows resumed-draft context with immediately visible step validation state', () => {
    renderWizard({
      initialValues: buildInitialValues({ gameId: DRAFT_GAME_ID }),
    });

    expect(screen.getByText('Saved draft 22222222')).toBeInTheDocument();
    expect(
      screen.getByText('No changes since the last save.'),
    ).toBeInTheDocument();
    expect(
      within(stepNav()).getByRole('button', {
        name: /players & corporations, has \d+ validation issue/i,
      }),
    ).toBeInTheDocument();
  });

  it('reports save success with last-saved time and unsaved changes after edits', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { onSaveDraft } = renderWizard();

    await user.clear(screen.getByLabelText(/generation count/i));
    await user.type(screen.getByLabelText(/generation count/i), '12');
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Draft created.'),
    );
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/All changes saved\./)).toBeInTheDocument();
    expect(screen.getByText(/Last saved/)).toBeInTheDocument();
    expect(screen.getByText('Saved draft game-1')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /saved games/i }));
    expect(confirmSpy).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/generation count/i));
    await user.type(screen.getByLabelText(/generation count/i), '13');
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument();
  });

  it('keeps entries and reports a distinct failure state when saving fails', async () => {
    const user = userEvent.setup();
    const onSaveDraft = vi.fn().mockResolvedValue({
      status: 'error' as const,
      gameId: 'game-err',
      message: 'Save exploded.',
    });

    renderWizard({ onSaveDraft });

    await user.clear(screen.getByLabelText(/generation count/i));
    await user.type(screen.getByLabelText(/generation count/i), '12');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Save exploded.'),
    );
    expect(
      screen.getByText('Save failed — your entries are still here.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Saved draft game-err')).toBeInTheDocument();
    expect(screen.getByLabelText(/generation count/i)).toHaveValue(12);
  });

  it('keeps Finalize on the Review step behind the existing blocking-issue gate', async () => {
    const user = userEvent.setup();
    const { onFinalizeGame } = renderWizard();

    expect(
      screen.queryByRole('button', { name: /finalize game/i }),
    ).not.toBeInTheDocument();

    await selectNavStep(user, /^review/i);

    const finalizeButton = screen.getByRole('button', {
      name: /finalize game/i,
    });

    expect(finalizeButton).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /^continue/i }),
    ).not.toBeInTheDocument();
    expect(onFinalizeGame).not.toHaveBeenCalled();
  });

  it('finalizes a complete game from the Review step', async () => {
    const user = userEvent.setup();
    const { onFinalizeGame, onSaveDraft } = renderWizard({
      initialValues: buildInitialValues({
        playerCount: 1,
        playerScores: {
          p1: {
            awardPoints: 0,
            cardPointsAnimals: undefined,
            cardPointsJovian: undefined,
            cardPointsMicrobes: undefined,
            cardPointsTotal: 18,
            citiesPoints: 5,
            finalMegacredits: 8,
            greeneryPoints: 6,
            milestonePoints: 0,
            totalPoints: 50,
            trPoints: 21,
          },
        },
        playerSelections: {
          p1: {
            corporationId: 'corp1',
            preludeIds: ['prelude1'],
          },
        },
        selectedPlayerIds: ['p1'],
      }),
    });

    await selectNavStep(user, /^review/i);

    const finalizeButton = screen.getByRole('button', {
      name: /finalize game/i,
    });

    expect(finalizeButton).toBeEnabled();
    await user.click(finalizeButton);

    await waitFor(() => expect(onFinalizeGame).toHaveBeenCalledTimes(1));
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Game finalized.');
  });

  it('navigates to the step owning a schema error and lists it on failed submit', async () => {
    const user = userEvent.setup();
    const { onSaveDraft } = renderWizard({
      initialValues: buildInitialValues({ generationCount: 0 }),
    });

    await selectNavStep(user, /^review/i);
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Some entries need attention before this game can be saved:',
        ),
      ).toBeInTheDocument(),
    );
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Setup' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/generation count/i)).toBeInTheDocument();
  });

  it('offers Merger in every Prelude slot and consumes one slot when selected', async () => {
    const user = userEvent.setup();
    const { onSaveDraft } = renderWizard({
      initialValues: buildInitialValues({
        playerCount: 1,
        selectedPlayerIds: ['p1'],
      }),
    });

    await selectNavStep(user, /players & corporations/i);

    for (const slot of [1, 2, 3]) {
      const slotSelect = screen.getByLabelText(
        new RegExp(`friday mars prelude ${slot}`, 'i'),
      );

      expect(
        within(slotSelect as HTMLElement).getByRole('option', {
          name: 'Merger',
        }),
      ).toBeInTheDocument();
    }

    await user.selectOptions(
      screen.getByLabelText(/friday mars prelude 1/i),
      'prelude-merger',
    );
    await user.selectOptions(
      screen.getByLabelText(/friday mars prelude 2/i),
      'prelude1',
    );
    expect(screen.getByLabelText(/friday mars prelude 3/i)).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() =>
      expect(onSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          playerSelections: {
            p1: {
              corporationId: '',
              preludeIds: ['prelude-merger', 'prelude1'],
            },
          },
        }),
      ),
    );
  });

  it('preserves the saved Merger rule semantics, including unknown', async () => {
    const user = userEvent.setup();
    const { onSaveDraft } = renderWizard();

    await user.selectOptions(
      screen.getByLabelText(/saved merger rule/i),
      'unknown',
    );
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() =>
      expect(onSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          guaranteedMergerOffer: null,
          mergerOfferRuleSource: 'manual_override',
        }),
      ),
    );
  });

  it('keeps milestones map-specific and surfaces stale claims after a map change', async () => {
    const user = userEvent.setup();

    renderWizard();

    await selectNavStep(user, /milestones & awards/i);
    expect(screen.getByLabelText(/builder claimed/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/builder claimed/i));
    await user.click(screen.getByLabelText(/builder winner friday mars/i));

    await selectNavStep(user, /^setup/i);
    await user.selectOptions(screen.getByLabelText('Map'), 'elysium');

    await selectNavStep(user, /milestones/i);
    expect(
      screen.getByText('No milestones are mapped to this board yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No awards are mapped to this board yet.'),
    ).toBeInTheDocument();

    await selectNavStep(user, /^review/i);
    expect(
      screen.getByText('A claimed milestone is not valid for the selected map.'),
    ).toBeInTheDocument();
    expect(
      within(stepNav()).getByRole('button', {
        name: /milestones & awards, has \d+ validation issue/i,
      }),
    ).toBeInTheDocument();
  });

  it('links review issues to the owning step', async () => {
    const user = userEvent.setup();

    renderWizard({
      initialValues: buildInitialValues({
        playerCount: 1,
        selectedPlayerIds: ['p1'],
      }),
    });

    await selectNavStep(user, /^review/i);
    await user.click(
      screen.getAllByRole('button', {
        name: /go to players & corporations/i,
      })[0],
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Players & Corporations' }),
    ).toHaveFocus();
  });
});
