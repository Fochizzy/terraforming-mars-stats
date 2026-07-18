import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LogGameWizard } from './log-game-wizard';

describe('LogGameWizard', () => {
  it('adds a typed player name that is not already in the saved roster', async () => {
    const user = userEvent.setup();

    render(
      <LogGameWizard
        awardOptions={[]}
        cardOptions={[]}
        corporationOptions={[]}
        expansionOptions={[
          { id: 'e1', code: 'base', name: 'Base Game' },
        ]}
        groupName="Friday Group"
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
          guaranteedMergerOffer: true,
          mergerOfferRuleSource: 'group_default',
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
        promoSetOptions={[]}
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
        expansionOptions={[
          { id: 'e1', code: 'base', name: 'Base Game' },
          { id: 'e2', code: 'prelude', name: 'Prelude' },
          { id: 'e3', code: 'colonies', name: 'Colonies' },
        ]}
        groupName="Friday Group"
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
          guaranteedMergerOffer: true,
          mergerOfferRuleSource: 'group_default',
          playerStyles: {},
          expansionCodes: ['base', 'prelude'],
          promoSetSlugs: [],
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

    expect(
      screen.getByRole('link', { name: /import game/i }),
    ).toHaveAttribute('href', '/log-game/import');
    expect(
      screen.getByRole('link', { name: /manual entry/i }),
    ).toHaveAttribute('aria-current', 'page');

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
    await user.click(screen.getByLabelText(/colonies/i));
    await user.click(screen.getByLabelText(/2022 promo pack/i));
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
        expansionCodes: ['base', 'prelude', 'colonies'],
        promoSetSlugs: ['2022-promos'],
        selectedPlayerIds: ['p1', 'p2'],
      }),
    );
    expect(onFinalizeGame).not.toHaveBeenCalled();
  });
});
