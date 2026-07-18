import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readImportReviewJumpState,
  saveImportReviewJumpState,
} from '@/lib/imports/import-review-jump-state';
import { LogGameWizard } from './log-game-wizard';

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerMocks.push }),
}));

describe('LogGameWizard', () => {
  beforeEach(() => {
    routerMocks.push.mockClear();
  });

  it('hides draft-save actions when editing a finalized game', async () => {
    const user = userEvent.setup();
    const onFinalizeGame = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-final',
      message: 'Game updated.',
    });
    const onSaveDraft = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-final',
      message: 'Draft saved.',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialStatus="finalized"
        initialValues={{
          awardClaims: {},
          gameId: 'game-final',
          generationCount: 10,
          groupId: '11111111-1111-4111-8111-111111111111',
          mapId: 'tharsis',
          milestoneClaims: {},
          notes: '',
          playedOn: '2026-07-03',
          playerCount: 1,
          playerScores: {
            p1: {
              awardPoints: 0,
              cardPointsTotal: 0,
              citiesPoints: 0,
              finalMegacredits: 0,
              greeneryPoints: 0,
              milestonePoints: 0,
              totalPoints: 0,
              trPoints: 0,
            },
          },
          playerSelections: {
            p1: {
              corporationId: 'corp1',
              corporationIds: ['corp1'],
              midgamePreludeIds: [],
              preludeIds: [],
            },
          },
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['p1'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={onFinalizeGame}
        onSaveDraft={onSaveDraft}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /save draft setup/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save finalized changes/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save finalized changes/i }));

    await waitFor(() => expect(onFinalizeGame).toHaveBeenCalledTimes(1));
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it('navigates to the profile page after a draft game is finalized', async () => {
    const user = userEvent.setup();
    const onFinalizeGame = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-new',
      message: 'Game finalized.',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialValues={{
          awardClaims: {},
          gameId: 'game-new',
          generationCount: 10,
          groupId: '11111111-1111-4111-8111-111111111111',
          mapId: 'tharsis',
          milestoneClaims: {},
          notes: '',
          playedOn: '2026-07-03',
          playerCount: 1,
          playerScores: {
            p1: {
              awardPoints: 0,
              cardPointsTotal: 0,
              citiesPoints: 0,
              finalMegacredits: 0,
              greeneryPoints: 0,
              milestonePoints: 0,
              totalPoints: 0,
              trPoints: 0,
            },
          },
          playerSelections: {
            p1: {
              corporationId: 'corp1',
              corporationIds: ['corp1'],
              midgamePreludeIds: [],
              preludeIds: [],
            },
          },
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['p1'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={onFinalizeGame}
        onSaveDraft={vi.fn()}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /finalize game/i }));

    await waitFor(() => expect(onFinalizeGame).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(routerMocks.push).toHaveBeenCalledWith('/profile'),
    );
  });

  it('stays on the review page when finalizing fails', async () => {
    const user = userEvent.setup();
    const onFinalizeGame = vi.fn().mockResolvedValue({
      status: 'error' as const,
      gameId: 'game-new',
      message: 'Unable to finalize this game right now.',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialValues={{
          awardClaims: {},
          gameId: 'game-new',
          generationCount: 10,
          groupId: '11111111-1111-4111-8111-111111111111',
          mapId: 'tharsis',
          milestoneClaims: {},
          notes: '',
          playedOn: '2026-07-03',
          playerCount: 1,
          playerScores: {
            p1: {
              awardPoints: 0,
              cardPointsTotal: 0,
              citiesPoints: 0,
              finalMegacredits: 0,
              greeneryPoints: 0,
              milestonePoints: 0,
              totalPoints: 0,
              trPoints: 0,
            },
          },
          playerSelections: {
            p1: {
              corporationId: 'corp1',
              corporationIds: ['corp1'],
              midgamePreludeIds: [],
              preludeIds: [],
            },
          },
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['p1'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={onFinalizeGame}
        onSaveDraft={vi.fn()}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /finalize game/i }));

    await waitFor(() => expect(onFinalizeGame).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/unable to finalize this game right now/i),
    ).toBeInTheDocument();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it('shows usernames only in the player picker and matches by username', async () => {
    const user = userEvent.setup();
    const playerOptions = [
      {
        id: 'p1',
        display_name: 'Friday Mars',
        linked_username: 'friday-mars',
      },
      {
        id: 'p2',
        display_name: 'Friday May',
        linked_username: 'friday-may',
      },
    ];

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialValues={{
          awardClaims: {},
          gameId: undefined,
          groupId: '11111111-1111-4111-8111-111111111111',
          milestoneClaims: {},
          playedOn: '2026-07-03',
          mapId: 'tharsis',
          notes: '',
          playerCount: 1,
          playerScores: {},
          playerSelections: {},
          generationCount: 10,
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: [],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-picked',
          message: 'Game finalized.',
        })}
        onSaveDraft={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-picked',
          message: 'Draft saved.',
        })}
        playerOptions={playerOptions}
        preludeOptions={[]}
      />,
    );

    await user.type(screen.getByLabelText(/add or select player/i), 'friday-');

    expect(
      screen.getByRole('button', { name: 'friday-mars' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'friday-may' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Friday Mars$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Friday May$/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'friday-mars' }),
    );

    expect(screen.getAllByText('friday-mars').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/^Friday Mars$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/add or select player/i)).toHaveValue('');
  });

  it('adds a typed player name that is not already in the saved roster', async () => {
    const user = userEvent.setup();

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialValues={{
          awardClaims: {},
          gameId: undefined,
          groupId: '11111111-1111-4111-8111-111111111111',
          milestoneClaims: {},
          playedOn: '2026-07-03',
          mapId: 'tharsis',
          notes: '',
          playerCount: 1,
          playerScores: {},
          playerSelections: {},
          generationCount: 10,
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: [],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-typed',
          message: 'Game finalized.',
        })}
        onSaveDraft={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-typed',
          message: 'Draft saved.',
        })}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
      />,
    );

    await user.type(
      screen.getByLabelText(/add or select player/i),
      'New Player Name',
    );
    await user.click(screen.getByRole('button', { name: /add player/i }));

    expect(screen.getByText(/1 of 1 seats filled/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/add or select player/i)).toHaveValue('');
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
  });

  it('submits a full draft payload with player, score, milestone, and award data', async () => {
    const user = userEvent.setup();
    const onFinalizeGame = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-1',
      message: 'Game finalized.',
    });
    const onSaveDraft = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-1',
      message: 'Draft created.',
    });

    render(
      <LogGameWizard
        awardOptions={[
          { awardId: 'award1', awardName: 'Landlord', mapId: 'tharsis' },
        ]}
        corporationOptions={[
          {
            expansionCode: 'base',
            id: 'corp1',
            name: 'Tharsis Republic',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
        ]}
        initialValues={{
          awardClaims: {},
          gameId: undefined,
          groupId: '11111111-1111-4111-8111-111111111111',
          milestoneClaims: {},
          playedOn: '2026-07-03',
          mapId: 'tharsis',
          notes: '',
          playerCount: 2,
          playerScores: {},
          playerSelections: {},
          generationCount: 10,
          playerStyles: {},
          promoSetSlugs: ['2022-seasonal-promos'],
          selectedPlayerIds: ['p1', 'p2'],
        }}
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
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: /open web import/i }),
    ).toHaveAttribute('href', '/log-game');

    await user.click(
      screen.getByRole('button', { name: /show milestone details for builder/i }),
    );
    expect(screen.getByText(/have 8 building tags in play/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    await user.click(
      screen.getByRole('button', { name: /show award details for landlord/i }),
    );
    expect(screen.getByText(/own the most non-ocean tiles/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));

    await user.selectOptions(screen.getByLabelText(/friday corporation 1/i), 'corp1');
    await user.selectOptions(screen.getByLabelText(/friday prelude 1/i), 'prelude1');
    await user.click(screen.getByLabelText(/builder claimed/i));
    await user.click(screen.getByLabelText(/builder winner friday/i));
    await user.click(screen.getByLabelText(/landlord funded/i));
    await user.selectOptions(screen.getByLabelText(/landlord funded by/i), 'p2');
    await user.click(screen.getByLabelText(/landlord first place friday/i));
    await user.click(screen.getByLabelText(/landlord second place second/i));
    await user.clear(screen.getByLabelText(/friday cities/i));
    await user.type(screen.getByLabelText(/friday cities/i), '5');
    await user.clear(screen.getByLabelText(/friday greenery/i));
    await user.type(screen.getByLabelText(/friday greenery/i), '6');
    await user.clear(screen.getByLabelText(/friday total card points/i));
    await user.type(screen.getByLabelText(/friday total card points/i), '18');
    await user.clear(screen.getByLabelText(/friday terraform rating points/i));
    await user.type(screen.getByLabelText(/friday terraform rating points/i), '21');
    await user.clear(screen.getByLabelText(/friday milestone points/i));
    await user.type(screen.getByLabelText(/friday milestone points/i), '5');
    await user.clear(screen.getByLabelText(/friday award points/i));
    await user.type(screen.getByLabelText(/friday award points/i), '5');
    await user.clear(screen.getByLabelText(/friday total points/i));
    await user.type(screen.getByLabelText(/friday total points/i), '55');
    await user.clear(screen.getByLabelText(/friday final megacredits/i));
    await user.type(screen.getByLabelText(/friday final megacredits/i), '8');
    await user.clear(screen.getByLabelText(/generation count/i));
    await user.type(screen.getByLabelText(/generation count/i), '11');
    await user.click(screen.getByRole('button', { name: /save draft setup/i }));

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
        groupId: '11111111-1111-4111-8111-111111111111',
        playedOn: '2026-07-03',
        mapId: 'tharsis',
        milestoneClaims: {
          milestone1: {
            claimed: true,
            winnerPlayerId: 'p1',
          },
        },
        notes: '',
        playerCount: 2,
        generationCount: 11,
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
            corporationIds: ['corp1'],
            midgamePreludeIds: [],
            preludeIds: ['prelude1'],
          },
        },
        playerStyles: {},
        promoSetSlugs: ['2022-seasonal-promos'],
        selectedPlayerIds: ['p1', 'p2'],
      }),
    );
    expect(onFinalizeGame).not.toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it('submits multiple corporations for one selected player', async () => {
    const user = userEvent.setup();
    const onSaveDraft = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-multi-corp',
      message: 'Draft created.',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[
          {
            expansionCode: 'base',
            id: 'corp1',
            name: 'Tharsis Republic',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
          {
            expansionCode: 'colonies',
            id: 'corp2',
            name: 'Poseidon',
            promoSetSlug: null,
            requiredExpansionCodes: ['colonies'],
          },
        ]}
        initialValues={{
          awardClaims: {},
          gameId: undefined,
          groupId: '11111111-1111-4111-8111-111111111111',
          milestoneClaims: {},
          playedOn: '2026-07-03',
          mapId: 'tharsis',
          notes: '',
          playerCount: 1,
          playerScores: {},
          playerSelections: {},
          generationCount: 10,
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['p1'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={vi.fn()}
        onSaveDraft={onSaveDraft}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/friday corporation 1/i), 'corp1');
    await user.selectOptions(screen.getByLabelText(/friday corporation 2/i), 'corp2');
    await user.click(screen.getByRole('button', { name: /save draft setup/i }));

    await waitFor(() =>
      expect(onSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          playerSelections: {
            p1: {
              corporationId: 'corp1',
              corporationIds: ['corp1', 'corp2'],
              midgamePreludeIds: [],
              preludeIds: [],
            },
          },
        }),
      ),
    );
  });

  it('offers every corporation and prelude regardless of catalog metadata and stored promo selections', () => {
    const renderWizardWithSelections = (selections: {
      promoSetSlugs: string[];
    }) =>
      render(
        <LogGameWizard
          awardOptions={[]}
          corporationOptions={[
            {
              expansionCode: 'base',
              id: 'corp-base',
              name: 'Tharsis Republic',
              promoSetSlug: null,
              requiredExpansionCodes: ['base'],
            },
            {
              expansionCode: 'colonies',
              id: 'corp-colonies',
              name: 'Poseidon',
              promoSetSlug: null,
              requiredExpansionCodes: ['colonies'],
            },
            {
              expansionCode: 'promo',
              id: 'corp-promo',
              name: 'Arcadian Communities',
              promoSetSlug: '2018-boardgamegeek-promos',
              requiredExpansionCodes: [],
            },
          ]}
          initialValues={{
            awardClaims: {},
            gameId: undefined,
            groupId: '11111111-1111-4111-8111-111111111111',
            milestoneClaims: {},
            playedOn: '2026-07-03',
            mapId: 'tharsis',
            notes: '',
            playerCount: 1,
            playerScores: {},
            playerSelections: {},
            generationCount: 10,
            playerStyles: {},
            promoSetSlugs: selections.promoSetSlugs,
            selectedPlayerIds: ['p1'],
          }}
          mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
          milestoneOptions={[]}
          onFinalizeGame={vi.fn().mockResolvedValue({
            status: 'success' as const,
            gameId: 'game-2',
            message: 'Game finalized.',
          })}
          onSaveDraft={vi.fn().mockResolvedValue({
            status: 'success' as const,
            gameId: 'game-2',
            message: 'Draft saved.',
          })}
          playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
          preludeOptions={[
            {
              expansionCode: 'prelude',
              id: 'prelude-base',
              name: 'Allied Bank',
              promoSetSlug: null,
              requiredExpansionCodes: ['prelude'],
            },
            {
              expansionCode: 'prelude',
              id: 'prelude-promo',
              name: 'Corporate Archives',
              promoSetSlug: '2022-seasonal-promos',
              requiredExpansionCodes: ['prelude'],
            },
          ]}
        />,
      );

    renderWizardWithSelections({
      promoSetSlugs: [],
    });

    expect(screen.getAllByRole('option', { name: /tharsis republic/i })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: /poseidon/i })).toHaveLength(3);
    expect(
      screen.getAllByRole('option', { name: /arcadian communities/i }),
    ).toHaveLength(3);
    // Each prelude is offered in the three setup slots plus the eight
    // mid-game slots.
    expect(screen.getAllByRole('option', { name: /allied bank/i })).toHaveLength(11);
    expect(screen.getAllByRole('option', { name: /corporate archives/i })).toHaveLength(11);
  });

  it('consumes a stored import-review jump target for the matching game and highlights the score field that still needs manual entry', async () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    saveImportReviewJumpState({
      gameId: 'game-jump',
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday',
      scoreField: 'cardPointsTotal',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialValues={{
          awardClaims: {},
          gameId: 'game-jump',
          groupId: '11111111-1111-4111-8111-111111111111',
          milestoneClaims: {},
          playedOn: '2026-07-03',
          mapId: 'tharsis',
          notes: '',
          playerCount: 1,
          playerScores: {},
          playerSelections: {},
          generationCount: 10,
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['p1'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-jump',
          message: 'Game finalized.',
        })}
        onSaveDraft={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-jump',
          message: 'Draft saved.',
        })}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /commercial district was not read and still needs manual entry\./i,
        ),
      ).toBeInTheDocument(),
    );

    const highlightedInput = screen.getByLabelText(/friday total card points/i);
    expect(highlightedInput).toHaveAttribute(
      'data-manual-review-highlight',
      'true',
    );
    expect(highlightedInput).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(readImportReviewJumpState('game-jump')).toBeNull();

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('highlights the mapped roster player even when the stored imported name differs from that roster display name', async () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    saveImportReviewJumpState({
      gameId: 'game-alias',
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerId: 'player-roster',
      playerName: 'Imported Alias',
      scoreField: 'cardPointsTotal',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        corporationOptions={[]}
        initialValues={{
          awardClaims: {},
          gameId: 'game-alias',
          groupId: '11111111-1111-4111-8111-111111111111',
          milestoneClaims: {},
          playedOn: '2026-07-03',
          mapId: 'tharsis',
          notes: '',
          playerCount: 1,
          playerScores: {},
          playerSelections: {},
          generationCount: 10,
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['player-roster'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-alias',
          message: 'Game finalized.',
        })}
        onSaveDraft={vi.fn().mockResolvedValue({
          status: 'success' as const,
          gameId: 'game-alias',
          message: 'Draft saved.',
        })}
        playerOptions={[{ id: 'player-roster', display_name: 'Roster Name' }]}
        preludeOptions={[]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /commercial district was not read and still needs manual entry\./i,
        ),
      ).toBeInTheDocument(),
    );

    const highlightedInput = screen.getByLabelText(/roster total card points/i);
    expect(highlightedInput).toHaveAttribute(
      'data-manual-review-highlight',
      'true',
    );
    expect(highlightedInput).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(readImportReviewJumpState('game-alias')).toBeNull();

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });
});
