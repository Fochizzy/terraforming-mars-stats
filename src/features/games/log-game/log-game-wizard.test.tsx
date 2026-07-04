import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LogGameWizard } from './log-game-wizard';

describe('LogGameWizard', () => {
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
        expansionOptions={[
          { id: 'e1', code: 'base', name: 'Base Game' },
          { id: 'e2', code: 'prelude', name: 'Prelude' },
          { id: 'e3', code: 'colonies', name: 'Colonies' },
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
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
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
      screen.getByRole('link', { name: /open web import/i }),
    ).toHaveAttribute('href', '/log-game/import');

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

  it('filters corporation, prelude, and key-card choices to the selected expansions and promo bundles', async () => {
    const user = userEvent.setup();

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
            promoSetSlug: 'x-series-promos',
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
            promoSetSlug: 'promo-corporations',
            requiredExpansionCodes: [],
          },
        ]}
        expansionOptions={[
          { id: 'e1', code: 'base', name: 'Base Game' },
          { id: 'e2', code: 'prelude', name: 'Prelude' },
          { id: 'e3', code: 'colonies', name: 'Colonies' },
          { id: 'e4', code: 'turmoil', name: 'Turmoil' },
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
          expansionCodes: ['base', 'prelude'],
          promoSetSlugs: [],
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
            promoSetSlug: 'x-series-promos',
            requiredExpansionCodes: ['prelude'],
          },
        ]}
        promoSetOptions={[
          {
            id: 'promo-x',
            slug: 'x-series-promos',
            displayName: 'X Series Promos',
            editionLabel: 'Promo Cards X01-X79',
            promoYear: null,
          },
          {
            id: 'promo-corp',
            slug: 'promo-corporations',
            displayName: 'Promo Corporations',
            editionLabel: 'Promo Corporation Bundle',
            promoYear: null,
          },
        ]}
        styleOptions={[{ code: 'balanced', id: 'style1', name: 'Balanced' }]}
      />,
    );

    expect(screen.getByRole('option', { name: /tharsis republic/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /poseidon/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /arcadian communities/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /allied bank/i })).toHaveLength(3);
    expect(
      screen.queryByRole('option', { name: /corporate archives/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('option', { name: /001 - colonizer training camp/i }),
    ).toHaveLength(3);
    expect(
      screen.queryByRole('option', { name: /x09 - political alliance/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/colonies/i));
    await user.click(screen.getByLabelText(/x series promos/i));
    await user.click(screen.getByLabelText(/turmoil/i));
    await user.click(screen.getByLabelText(/promo corporations/i));

    expect(screen.getByRole('option', { name: /poseidon/i })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /arcadian communities/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /corporate archives/i })).toHaveLength(3);
    expect(
      screen.getAllByRole('option', { name: /x09 - political alliance/i }),
    ).toHaveLength(3);
  });
});
