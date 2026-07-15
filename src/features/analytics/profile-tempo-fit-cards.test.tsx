import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileTempoFitCards } from './profile-tempo-fit-cards';

describe('ProfileTempoFitCards', () => {
  it('renders concise takeaways, aligned metric tables, and collapsed methodology', () => {
    render(
      <ProfileTempoFitCards
        gameLengthProfile={{
          bestBucket: {
            averageGenerationCount: 12.4,
            averagePlacement: 1.67,
            averagePointsPerGeneration: 8.78,
            averageScore: 108.9,
            bucket: 'long',
            gamesPlayed: 9,
            label: 'Long Games',
            rangeLabel: '12 or more generations',
            winRate: 0.33,
            wins: 3,
          },
          rows: [
            {
              averageGenerationCount: 8.5,
              averagePlacement: 2.5,
              averagePointsPerGeneration: 7.37,
              averageScore: 62.6,
              bucket: 'short',
              gamesPlayed: 3,
              label: 'Short Games',
              rangeLabel: '9 or fewer generations',
              winRate: 0.33,
              wins: 1,
            },
            {
              averageGenerationCount: 10.5,
              averagePlacement: 2.2,
              averagePointsPerGeneration: 7.91,
              averageScore: 83.1,
              bucket: 'standard',
              gamesPlayed: 10,
              label: 'Standard Games',
              rangeLabel: '10-11 generations',
              winRate: 0.1,
              wins: 1,
            },
            {
              averageGenerationCount: 12.4,
              averagePlacement: 1.67,
              averagePointsPerGeneration: 8.78,
              averageScore: 108.9,
              bucket: 'long',
              gamesPlayed: 9,
              label: 'Long Games',
              rangeLabel: '12 or more generations',
              winRate: 0.33,
              wins: 3,
            },
          ],
          weakestBucket: {
            averageGenerationCount: 10.5,
            averagePlacement: 2.2,
            averagePointsPerGeneration: 7.91,
            averageScore: 83.1,
            bucket: 'standard',
            gamesPlayed: 10,
            label: 'Standard Games',
            rangeLabel: '10-11 generations',
            winRate: 0.1,
            wins: 1,
          },
        }}
        gameLengthStatements={[]}
        globalParameterTempoProfile={{
          bestMix: {
            averageFastGeneration: 1,
            averagePlacement: 2,
            averageScore: 76,
            code: 'fast_oxygen',
            gamesPlayed: 1,
            label: 'Fast Oxygen',
            parameters: ['oxygen'],
            winRate: 0,
            wins: 0,
          },
          confidenceLabel:
            'Fast means the first oxygen, heat, or ocean raise happened by the game midpoint.',
          importedGames: 5,
          rows: [
            {
              averageFastGeneration: 2.63,
              averagePlacement: 2.5,
              averageScore: 74,
              code: 'fast_oxygen_ocean',
              gamesPlayed: 4,
              label: 'Fast Oxygen + Oceans',
              parameters: ['oxygen', 'ocean'],
              winRate: 0,
              wins: 0,
            },
            {
              averageFastGeneration: 1,
              averagePlacement: 2,
              averageScore: 76,
              code: 'fast_oxygen',
              gamesPlayed: 1,
              label: 'Fast Oxygen',
              parameters: ['oxygen'],
              winRate: 0,
              wins: 0,
            },
          ],
          weakestMix: {
            averageFastGeneration: 2.63,
            averagePlacement: 2.5,
            averageScore: 74,
            code: 'fast_oxygen_ocean',
            gamesPlayed: 4,
            label: 'Fast Oxygen + Oceans',
            parameters: ['oxygen', 'ocean'],
            winRate: 0,
            wins: 0,
          },
        }}
        globalParameterTempoStatements={[]}
        phaseTempoProfile={{
          bestPhase: {
            actions: 23,
            actionsPerImportedGame: 4.63,
            awardsFunded: 1,
            averagePlacementWhenPeak: 2.4,
            averageScoreWhenPeak: 82,
            cardsPlayed: 12,
            citiesPlaced: 2,
            gamesWithPeak: 5,
            greeneriesPlaced: 3,
            label: 'Late Game',
            milestonesClaimed: 1,
            phase: 'late',
            removalEvents: 4,
            tilesPlaced: 5,
            winRateWhenPeak: 0,
            winsWhenPeak: 0,
          },
          confidenceLabel:
            'Early, mid, and late are split by each game generation count and use logged actions as the tempo signal.',
          importedGames: 5,
          mostActivePhase: {
            actions: 23,
            actionsPerImportedGame: 4.63,
            awardsFunded: 1,
            averagePlacementWhenPeak: 2.4,
            averageScoreWhenPeak: 82,
            cardsPlayed: 12,
            citiesPlaced: 2,
            gamesWithPeak: 5,
            greeneriesPlaced: 3,
            label: 'Late Game',
            milestonesClaimed: 1,
            phase: 'late',
            removalEvents: 4,
            tilesPlaced: 5,
            winRateWhenPeak: 0,
            winsWhenPeak: 0,
          },
          rows: [
            {
              actions: 11,
              actionsPerImportedGame: 2.2,
              awardsFunded: 0,
              averagePlacementWhenPeak: 2.5,
              averageScoreWhenPeak: 74,
              cardsPlayed: 5,
              citiesPlaced: 1,
              gamesWithPeak: 1,
              greeneriesPlaced: 2,
              label: 'Early Game',
              milestonesClaimed: 0,
              phase: 'early',
              removalEvents: 1,
              tilesPlaced: 3,
              winRateWhenPeak: 0,
              winsWhenPeak: 0,
            },
            {
              actions: 10,
              actionsPerImportedGame: 1.94,
              awardsFunded: 0,
              averagePlacementWhenPeak: 2.2,
              averageScoreWhenPeak: 78,
              cardsPlayed: 6,
              citiesPlaced: 1,
              gamesWithPeak: 1,
              greeneriesPlaced: 1,
              label: 'Mid Game',
              milestonesClaimed: 1,
              phase: 'mid',
              removalEvents: 1,
              tilesPlaced: 2,
              winRateWhenPeak: 0,
              winsWhenPeak: 0,
            },
            {
              actions: 23,
              actionsPerImportedGame: 4.63,
              awardsFunded: 1,
              averagePlacementWhenPeak: 2.4,
              averageScoreWhenPeak: 82,
              cardsPlayed: 12,
              citiesPlaced: 2,
              gamesWithPeak: 5,
              greeneriesPlaced: 3,
              label: 'Late Game',
              milestonesClaimed: 1,
              phase: 'late',
              removalEvents: 4,
              tilesPlaced: 5,
              winRateWhenPeak: 0,
              winsWhenPeak: 0,
            },
          ],
        }}
        phaseTempoStatements={[]}
      />,
    );

    const phaseCard = screen
      .getByRole('heading', { name: /early, mid, and late game/i })
      .closest('article');
    const tempoCard = screen
      .getByRole('heading', { name: /terraforming tempo/i })
      .closest('article');
    const lengthCard = screen
      .getByRole('heading', { name: /generation length fit/i })
      .closest('article');

    expect(phaseCard).not.toBeNull();
    expect(tempoCard).not.toBeNull();
    expect(lengthCard).not.toBeNull();

    expect(within(phaseCard!).getByText(/best phase/i)).toBeInTheDocument();
    expect(within(phaseCard!).getByText('Late Game')).toBeInTheDocument();
    expect(
      within(phaseCard!).getByRole('table', {
        name: /early, mid, and late game comparison metrics/i,
      }),
    ).toBeInTheDocument();
    expect(within(phaseCard!).queryByRole('list')).not.toBeInTheDocument();

    expect(within(tempoCard!).getByText(/best fast mix/i)).toBeInTheDocument();
    expect(within(tempoCard!).getByText('Gen 1')).toBeInTheDocument();
    expect(
      within(tempoCard!).getByText(/how this is calculated/i),
    ).toBeInTheDocument();

    expect(within(lengthCard!).getByText(/best game length/i)).toBeInTheDocument();
    expect(within(lengthCard!).getByText(/8.78/)).toBeInTheDocument();
    expect(within(lengthCard!).getByText(/standard games are the roughest/i)).toBeInTheDocument();
    expect(
      within(lengthCard!).getByText(/game-length buckets use recorded generation counts/i),
    ).toBeInTheDocument();
  });
});
