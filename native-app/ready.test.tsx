import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ReadyRoute from './ready';

const mockReplace = vi.fn();
const mockLoadNativeDashboard = vi.fn();

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

    expect(await screen.findByText(/terraforming mars command center/i)).toBeInTheDocument();
    expect(screen.getByText(/personal stats/i)).toBeInTheDocument();
    expect(screen.getByText(/comparative stats/i)).toBeInTheDocument();
    expect(screen.getByText(/global stats/i)).toBeInTheDocument();
    expect(screen.getByText(/score mix chart/i)).toBeInTheDocument();
    expect(screen.getByText(/trend chart/i)).toBeInTheDocument();
    expect(screen.queryByText(/native shell ready/i)).not.toBeInTheDocument();
  });
});
