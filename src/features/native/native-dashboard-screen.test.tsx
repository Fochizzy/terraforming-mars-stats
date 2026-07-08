import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeDashboardScreen } from './native-dashboard-screen';
import type { NativeDashboardData } from './load-native-dashboard';

const nativeHarness = vi.hoisted(() => {
  let scrollHandler:
    | null
    | ((event: { nativeEvent: { contentOffset: { y: number } } }) => void) = null;

  return {
    emitScroll(y: number) {
      if (!scrollHandler) {
        throw new Error('Scroll handler has not been registered.');
      }

      scrollHandler({
        nativeEvent: {
          contentOffset: {
            y,
          },
        },
      });
    },
    layoutYByTestId: {
      'dashboard-section-global': 1020,
      'dashboard-section-group': 640,
      'dashboard-section-profile': 260,
    } as Record<string, number>,
    registerScrollHandler(
      handler: null | ((event: { nativeEvent: { contentOffset: { y: number } } }) => void),
    ) {
      scrollHandler = handler;
    },
    reset() {
      scrollHandler = null;
      this.scrollToMock.mockReset();
    },
    scrollToMock: vi.fn(),
  };
});

vi.mock('react-native', async () => {
  const React = await import('react');

  return {
    Image: () => <div>banner image</div>,
    ImageBackground: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Pressable: ({
      children,
      onPress,
      style,
    }: {
      children: ReactNode;
      onPress?: () => void;
      style?: Record<string, unknown> | Array<Record<string, unknown> | false | null>;
    }) => {
      const flattenedStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : (style ?? {});
      const isActive = flattenedStyle.backgroundColor === '#f59e0b';

      return (
        <button data-active={isActive ? 'true' : 'false'} onClick={onPress}>
          {children}
        </button>
      );
    },
    ScrollView: React.forwardRef(function ScrollViewMock(
      {
        children,
        onScroll,
      }: {
        children: ReactNode;
        onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
      },
      ref,
    ) {
      React.useEffect(() => {
        nativeHarness.registerScrollHandler(onScroll ?? null);
      }, [onScroll]);

      React.useImperativeHandle(ref, () => ({
        scrollTo: nativeHarness.scrollToMock,
      }));

      return <div>{children}</div>;
    }),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    View: ({
      children,
      onLayout,
      testID,
    }: {
      children: ReactNode;
      onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
      testID?: string;
    }) => {
      React.useEffect(() => {
        const y = testID ? nativeHarness.layoutYByTestId[testID] : undefined;

        if (onLayout && typeof y === 'number') {
          onLayout({
            nativeEvent: {
              layout: {
                y,
              },
            },
          });
        }
      }, [onLayout, testID]);

      return <div data-testid={testID}>{children}</div>;
    },
  };
});

const dashboardFixture: NativeDashboardData = {
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
  group: {
    headToHeadRows: [
      {
        detail: 'Score edge +6.2',
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
        label: 'Weighted Score',
        value: '91.4',
      },
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
      {
        label: 'Normalized Efficiency',
        value: '1.08',
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
        detail: '11.6 avg points',
        label: 'Greenery',
        value: 11.6,
      },
      {
        accent: 'ocean',
        detail: '25.3 avg points',
        label: 'Terraform Rating',
        value: 25.3,
      },
    ],
    subtitle: '5 finalized games in Friday Night Mars',
    title: 'Personal Stats',
  },
  sessionEmail: 'izzy.hodnett@gmail.com',
};

describe('NativeDashboardScreen', () => {
  beforeEach(() => {
    nativeHarness.reset();
  });

  it('scrolls to the tapped section and updates the active hero button', async () => {
    const user = userEvent.setup();

    render(<NativeDashboardScreen dashboard={dashboardFixture} onSignOut={vi.fn()} />);

    const personalButton = screen.getByRole('button', { name: /personal stats/i });
    const comparativeButton = screen.getByRole('button', {
      name: /comparative stats/i,
    });

    expect(personalButton).toHaveAttribute('data-active', 'true');
    expect(comparativeButton).toHaveAttribute('data-active', 'false');

    await user.click(comparativeButton);

    expect(nativeHarness.scrollToMock).toHaveBeenCalledWith({
      animated: true,
      y: 628,
    });
    expect(personalButton).toHaveAttribute('data-active', 'false');
    expect(comparativeButton).toHaveAttribute('data-active', 'true');
  });

  it('moves the active hero button when scrolling reaches a later section', () => {
    render(<NativeDashboardScreen dashboard={dashboardFixture} onSignOut={vi.fn()} />);

    const personalButton = screen.getByRole('button', { name: /personal stats/i });
    const globalButton = screen.getByRole('button', { name: /global stats/i });

    expect(personalButton).toHaveAttribute('data-active', 'true');
    expect(globalButton).toHaveAttribute('data-active', 'false');

    act(() => {
      nativeHarness.emitScroll(960);
    });

    expect(personalButton).toHaveAttribute('data-active', 'false');
    expect(globalButton).toHaveAttribute('data-active', 'true');
  });

  it('renders persisted profile metrics and global map rows', () => {
    render(<NativeDashboardScreen dashboard={dashboardFixture} onSignOut={vi.fn()} />);

    expect(screen.getByText(/points per generation/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.4 pts\/gen/i)).toBeInTheDocument();
    expect(screen.getByText(/normalized efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
    expect(screen.getByText(/tharsis/i)).toBeInTheDocument();
  });
});
