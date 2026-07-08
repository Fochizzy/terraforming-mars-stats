import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  readImportReviewJumpState,
  saveImportReviewJumpState,
} from '@/lib/imports/import-review-jump-state';
import { LogGameWizard } from './log-game-wizard';

describe('LogGameWizard', () => {
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
        cardOptions={[]}
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
              preludeIds: [],
            },
          },
          playerStyles: {},
          expansionCodes: ['base'],
          promoSetSlugs: [],
          selectedPlayerIds: ['p1'],
        }}
        mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
        milestoneOptions={[]}
        onFinalizeGame={onFinalizeGame}
        onSaveDraft={onSaveDraft}
        playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
        preludeOptions={[]}
        styleOptions={[]}
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
  });

  it('shows first name and username in the player picker list and lets the user choose a first-name-plus-initial match', async () => {
    const user = userEvent.setup();
    const playerOptions = [
      {
        id: 'p1',
        display_name: 'Friday Mars',
        linked_full_name: 'Friday Mars',
        linked_username: 'friday-mars',
      },
      {
        id: 'p2',
        display_name: 'Friday May',
        linked_full_name: 'Friday May',
        linked_username: 'friday-may',
      },
    ];

    render(
      <LogGameWizard
        awardOptions={[]}
        cardOptions={[]}
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
          expansionCodes: ['base'],
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
        styleOptions={[]}
      />,
    );

    await user.type(screen.getByLabelText(/add or select player/i), 'Friday M');

    expect(
      screen.getByRole('button', { name: /friday \(@friday-mars\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /friday \(@friday-may\)/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Friday Mars$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Friday May$/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /friday \(@friday-mars\)/i }),
    );

    expect(screen.getAllByText('Friday (@friday-mars)')).toHaveLength(2);
    expect(screen.getByLabelText(/add or select player/i)).toHaveValue('');
  });

  it('adds a typed player name that is not already in the saved roster', async () => {
    const user = userEvent.setup();

    render(
      <LogGameWizard
        awardOptions={[]}
        cardOptions={[]}
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
          expansionCodes: ['base'],
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
        styleOptions={[]}
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

  it('submits a full draft payload with player, score, milestone, award, and style data', async () => {
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
        cardOptions={[
          {
            cardName: 'Io Mining Industries',
            cardNumber: '042',
            expansionCode: 'base',
            id: 'card1',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
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
          expansionCodes: ['base', 'prelude', 'colonies'],
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
        styleOptions={[
          { code: 'engine_builder', id: 'style1', name: 'Engine Builder' },
          { code: 'card_combo', id: 'style2', name: 'Card Combo' },
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: /open web import/i }),
    ).toHaveAttribute('href', '/log-game');

    await user.selectOptions(screen.getByLabelText(/friday mars corporation/i), 'corp1');
    await user.selectOptions(screen.getByLabelText(/friday mars prelude 1/i), 'prelude1');
    await user.click(screen.getByLabelText(/builder claimed/i));
    await user.click(screen.getByLabelText(/builder winner friday mars/i));
    await user.click(screen.getByLabelText(/landlord funded/i));
    await user.selectOptions(screen.getByLabelText(/landlord funded by/i), 'p2');
    await user.click(screen.getByLabelText(/landlord first place friday mars/i));
    await user.click(screen.getByLabelText(/landlord second place second seat/i));
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
    await user.selectOptions(screen.getByLabelText(/friday mars declared style/i), 'engine_builder');
    await user.selectOptions(screen.getByLabelText(/friday mars style modifier 1/i), 'card_combo');
    await user.selectOptions(screen.getByLabelText(/friday mars key card 1/i), 'card1');
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
        expansionCodes: ['base', 'prelude', 'colonies'],
        promoSetSlugs: ['2022-seasonal-promos'],
        selectedPlayerIds: ['p1', 'p2'],
      }),
    );
    expect(onFinalizeGame).not.toHaveBeenCalled();
  });

  it('offers every corporation, prelude, and key card regardless of the stored expansion and promo selections', () => {
    const renderWizardWithSelections = (selections: {
      expansionCodes: string[];
      promoSetSlugs: string[];
    }) =>
      render(
        <LogGameWizard
          awardOptions={[]}
          cardOptions={[
            {
              cardName: 'Colonizer Training Camp',
              cardNumber: '001',
              expansionCode: 'base',
              id: 'card-base',
              promoSetSlug: null,
              requiredExpansionCodes: ['base'],
            },
            {
              cardName: 'Political Alliance',
              cardNumber: 'X09',
              expansionCode: 'promo',
              id: 'card-promo',
              promoSetSlug: '2019-turmoil-promos',
              requiredExpansionCodes: ['turmoil'],
            },
          ]}
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
            expansionCodes: selections.expansionCodes,
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
          styleOptions={[{ code: 'balanced', id: 'style1', name: 'Balanced' }]}
        />,
      );

    renderWizardWithSelections({
      expansionCodes: ['base'],
      promoSetSlugs: [],
    });

    expect(screen.getByRole('option', { name: /tharsis republic/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /poseidon/i })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /arcadian communities/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /allied bank/i })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: /corporate archives/i })).toHaveLength(3);
    expect(
      screen.getAllByRole('option', { name: /001 - colonizer training camp/i }),
    ).toHaveLength(3);
    expect(
      screen.getAllByRole('option', { name: /x09 - political alliance/i }),
    ).toHaveLength(3);
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
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });

    render(
      <LogGameWizard
        awardOptions={[]}
        cardOptions={[]}
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
          expansionCodes: ['base'],
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
        styleOptions={[]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /commercial district was not read and still needs manual entry\./i,
        ),
      ).toBeInTheDocument(),
    );

    const highlightedInput = screen.getByLabelText(/friday mars total card points/i);
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
        cardOptions={[]}
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
          expansionCodes: ['base'],
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
        styleOptions={[]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /commercial district was not read and still needs manual entry\./i,
        ),
      ).toBeInTheDocument(),
    );

    const highlightedInput = screen.getByLabelText(/roster name total card points/i);
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
