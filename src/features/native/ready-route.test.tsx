import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ReadyRoute from '../../../native-app/ready';

const { mockLoadNativeDashboard, mockReplace } = vi.hoisted(() => ({
  mockLoadNativeDashboard: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-native', () => ({
  ActivityIndicator: () => <div>loading spinner</div>,
  Image: () => <div>banner image</div>,
  ImageBackground: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pressable: ({
    children,
    onPress,
  }: {
    children: ReactNode;
    onPress?: () => void;
  }) => <button onClick={onPress}>{children}</button>,
  Platform: {
    OS: 'android',
  },
  ScrollView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StyleSheet: {
    create: <T,>(styles: T) => styles,
  },
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/native/load-native-dashboard', () => ({
  loadNativeDashboard: mockLoadNativeDashboard,
}));

vi.mock('@/lib/supabase/native', () => ({
  nativeSupabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              email: 'izzy.hodnett@gmail.com',
            },
          },
        },
      }),
      signOut: vi.fn(),
    },
  },
}));

describe('ReadyRoute', () => {
  it('renders board-themed native stats sections instead of the temporary shell', async () => {
    mockLoadNativeDashboard.mockResolvedValue({
      group: {
        headToHeadRows: [
          {
            averageScoreDifferential: 6.2,
            gamesPlayed: 5,
            label: 'Friday Mars vs Second Seat',
            record: '4-1-0',
          },
        ],
        leaderboardRows: [
          {
            accent: 'ocean',
            detail: '78% win rate',
            label: 'Friday Mars',
            value: 0.812,
          },
        ],
        summary: 'Helion-heavy games keep skewing the group podium.',
        title: 'Comparative Stats',
        trendRows: [
          {
            label: '06/12',
            value: 72,
          },
          {
            label: '06/28',
            value: 89,
          },
        ],
      },
      global: {
        leaderboardRows: [
          {
            accent: 'heat',
            detail: '18 plays',
            label: 'Helion',
            value: 0.611,
          },
        ],
        mapRows: [
          {
            accent: 'ocean',
            detail: '83.1 avg pts | 10.0 gens | 6 games | 4 players',
            label: 'Tharsis',
            value: 8.4,
          },
        ],
        summary: 'Opted-in groups globally are rewarding heat rush corps right now.',
        title: 'Global Stats',
      },
      groupName: 'Friday Night Mars',
      profile: {
        coverageBadges: [
          {
            label: 'Full card breakdown',
            value: 0.75,
          },
        ],
        headline: 'Friday Mars',
        metrics: [
          {
            label: 'Win Rate',
            value: '75%',
          },
          {
            label: 'Average Score',
            value: '84.5',
          },
          {
            label: 'Points Per Generation',
            value: '8.4 pts/gen',
          },
        ],
        rivalRows: [
          {
            detail: 'Score edge +5.8',
            label: 'Second Seat',
            record: '3-1-0',
          },
        ],
        scoreSourceRows: [
          {
            accent: 'greenery',
            label: 'Greenery',
            value: 11.6,
          },
          {
            accent: 'ocean',
            label: 'Terraform Rating',
            value: 25.3,
          },
        ],
        subtitle: '5 finalized games in Friday Night Mars',
        title: 'Personal Stats',
      },
      sessionEmail: 'izzy.hodnett@gmail.com',
    });

    render(<ReadyRoute />);

    expect((await screen.findAllByText(/friday night mars/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/command board/i)).toBeInTheDocument();
    expect(screen.getAllByText(/personal stats/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/comparative stats/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/global stats/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/weighted score/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^avg score$/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /personal stats/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /comparative stats/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /global stats/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/banner image/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/score mix chart/i)).toBeInTheDocument();
    expect(screen.getByText(/trend chart/i)).toBeInTheDocument();
    expect(screen.getByText(/points per generation/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.4 pts\/gen/i)).toBeInTheDocument();
    expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
    expect(screen.queryByText(/native shell ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/native analytics bridge/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/home screen now mirrors the board-game feel/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/win rate/i).length).toBeGreaterThan(0);
  });

  it('keeps a global placeholder card visible when opted-in global data is still empty', async () => {
    mockLoadNativeDashboard.mockResolvedValue({
      group: {
        headToHeadRows: [],
        leaderboardRows: [],
        summary: 'Finalize a few more games in this table to light up the comparative charts.',
        title: 'Comparative Stats',
        trendRows: [],
      },
      global: null,
      groupName: 'Friday Night Mars',
      profile: {
        coverageBadges: [],
        headline: 'Izzy Hodnett',
        metrics: [
          {
            label: 'Weighted Score',
            value: '--',
          },
        ],
        rivalRows: [],
        scoreSourceRows: [],
        subtitle: 'Link more finalized results to deepen the profile view.',
        title: 'Personal Stats',
      },
      sessionEmail: 'izzy.hodnett@gmail.com',
    });

    render(<ReadyRoute />);

    expect(await screen.findByText(/global corporation board/i)).toBeInTheDocument();
    expect(screen.getAllByText(/global stats/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/global bars will appear once opted-in groups contribute enough finalized data/i),
    ).toBeInTheDocument();
  });
});
