/* eslint-disable @typescript-eslint/no-require-imports */
import { useRef, useState, type ReactNode } from 'react';
import {
  Image,
  ImageBackground,
  Linking,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  NativeDashboardAccent,
  NativeDashboardBarRow,
  NativeDashboardCoverageBadge,
  NativeDashboardData,
  NativeDashboardRecordRow,
  NativeDashboardSection,
  NativeDashboardScope,
  NativeDashboardTrendRow,
} from './load-native-dashboard';

type NativeDashboardScreenProps = {
  dashboard: NativeDashboardData;
  onSignOut: () => Promise<void> | void;
};

type HeroMetric = {
  key: string;
  label: string;
  value: string;
};

type DashboardSectionKey = 'global' | 'group' | 'profile';

const sectionOrder: DashboardSectionKey[] = ['profile', 'group', 'global'];
const webInsightsUrl =
  'https://terraforming-mars-stats.izzy-hodnett.workers.dev/insights';

const accentColors: Record<NativeDashboardAccent, string> = {
  copper: '#d97706',
  greenery: '#65a30d',
  heat: '#f97316',
  ocean: '#38bdf8',
  sand: '#c4a46b',
};

function formatCoverage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildHeroMetrics(
  metrics: Array<{ label: string; value: string }>,
): HeroMetric[] {
  const definitions = [
    {
      aliases: ['weighted score'],
      key: 'weighted-score',
      label: 'Weighted Score',
    },
    {
      aliases: ['win rate'],
      key: 'win-rate',
      label: 'Win Rate',
    },
    {
      aliases: ['average score', 'avg score'],
      key: 'avg-score',
      label: 'Avg Score',
    },
  ] as const;

  return definitions.map((definition) => {
    const match = metrics.find((metric) => {
      const normalizedLabel = metric.label.trim().toLowerCase();
      return definition.aliases.some((alias) => alias === normalizedLabel);
    });

    return {
      key: definition.key,
      label: definition.label,
      value: match?.value ?? '--',
    };
  });
}

function SectionCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>{title}</Text>
      {children}
    </View>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: Array<{ label: string; value: string }>;
}) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
        </View>
      ))}
    </View>
  );
}

function BarList({
  emptyCopy,
  rows,
  title,
}: {
  emptyCopy: string;
  rows: NativeDashboardBarRow[];
  title: string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 0);

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.mutedCopy}>{emptyCopy}</Text>
      ) : (
        <View style={styles.chartList}>
          {rows.map((row) => {
            const width =
              maxValue > 0
                ? (`${Math.max((row.value / maxValue) * 100, 8)}%` as `${number}%`)
                : ('8%' as const);

            return (
              <View key={`${title}-${row.label}`} style={styles.chartRow}>
                <View style={styles.chartCopyRow}>
                  <Text style={styles.chartLabel}>{row.label}</Text>
                  <Text style={styles.chartDetail}>{row.detail}</Text>
                </View>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartFill,
                      {
                        backgroundColor: accentColors[row.accent],
                        width,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function RecordList({
  emptyCopy,
  rows,
  title,
}: {
  emptyCopy: string;
  rows: NativeDashboardRecordRow[];
  title: string;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.mutedCopy}>{emptyCopy}</Text>
      ) : (
        <View style={styles.recordList}>
          {rows.map((row) => (
            <View key={`${title}-${row.label}`} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordLabel}>{row.label}</Text>
                <Text style={styles.recordRecord}>{row.record}</Text>
              </View>
              <Text style={styles.recordDetail}>{row.detail}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CoverageBadgeList({
  badges,
}: {
  badges: NativeDashboardCoverageBadge[];
}) {
  if (badges.length === 0) {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Coverage Grid</Text>
        <Text style={styles.mutedCopy}>
          Coverage badges appear once optional scoring detail starts landing in finalized
          games.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Coverage Grid</Text>
      <View style={styles.badgeWrap}>
        {badges.map((badge) => (
          <View key={badge.label} style={styles.coverageBadge}>
            <Text style={styles.coverageValue}>{formatCoverage(badge.value)}</Text>
            <Text style={styles.coverageLabel}>{badge.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TrendChart({
  rows,
}: {
  rows: NativeDashboardTrendRow[];
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 0);

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Trend Chart</Text>
      {rows.length === 0 ? (
        <Text style={styles.mutedCopy}>
          Trend bars will appear after finalized games start stacking up in this group.
        </Text>
      ) : (
        <View style={styles.trendShell}>
          {rows.map((row) => {
            const height =
              maxValue > 0 ? Math.max((row.value / maxValue) * 120, 28) : 28;

            return (
              <View key={row.label} style={styles.trendColumn}>
                <View style={styles.trendTrack}>
                  <View
                    style={[
                      styles.trendFill,
                      {
                        height,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.trendValue}>{row.value}</Text>
                <Text style={styles.trendLabel}>{row.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function buildFallbackProfileSection(): NativeDashboardSection {
  return {
    coverageBadges: [],
    headline: 'Personal Stats',
    metrics: [
      { label: 'Weighted Score', value: '--' },
      { label: 'Win Rate', value: '--' },
      { label: 'Average Score', value: '--' },
      { label: 'Style Match', value: '--' },
    ],
    rivalRows: [],
    scoreSourceRows: [],
    subtitle:
      'Link a saved player seat to unlock your personal Terraforming Mars profile cards.',
    title: 'Personal Stats',
  };
}

function buildFallbackGroupSection(): NativeDashboardSection {
  return {
    headToHeadRows: [],
    leaderboardRows: [],
    summary:
      'Finalize a few more games in this table to light up the comparative charts.',
    title: 'Comparative Stats',
    trendRows: [],
  };
}

function buildFallbackGlobalSection(): NativeDashboardSection {
  return {
    leaderboardRows: [],
    summary:
      'Opted-in global analytics will appear here once more finalized tables sync in.',
    title: 'Global Stats',
  };
}

function buildLegacyScope(dashboard: NativeDashboardData): NativeDashboardScope {
  const groupName = dashboard.groupName ?? 'No active group selected';

  return {
    global: dashboard.global,
    group: dashboard.group,
    groupName,
    id: 'current',
    label: groupName,
    profile: dashboard.profile,
  };
}

export function NativeDashboardScreen({
  dashboard,
  onSignOut,
}: NativeDashboardScreenProps) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const sectionOffsetsRef = useRef<Record<DashboardSectionKey, number>>({
    global: 0,
    group: 0,
    profile: 0,
  });
  const [activeSection, setActiveSection] = useState<DashboardSectionKey>('profile');
  const availableScopes =
    dashboard.scopes && dashboard.scopes.length > 0
      ? dashboard.scopes
      : [buildLegacyScope(dashboard)];
  const [selectedScopeId, setSelectedScopeId] = useState(
    dashboard.selectedScopeId ?? availableScopes[0]?.id ?? 'current',
  );
  const selectedScope =
    availableScopes.find((scope) => scope.id === selectedScopeId) ??
    availableScopes[0] ??
    buildLegacyScope(dashboard);
  const profileSection = selectedScope.profile ?? buildFallbackProfileSection();
  const groupSection = selectedScope.group ?? buildFallbackGroupSection();
  const globalSection = selectedScope.global ?? buildFallbackGlobalSection();
  const heroTitle = 'Command Board';
  const heroTableName = selectedScope.groupName;
  const heroMetrics = buildHeroMetrics(profileSection.metrics ?? []);
  const heroSummary =
    dashboard.emptyState?.body ??
    groupSection.summary ??
    profileSection.subtitle ??
    'Personal, comparative, and global snapshots live here.';

  function updateSectionOffset(
    sectionKey: DashboardSectionKey,
    event: LayoutChangeEvent,
  ) {
    sectionOffsetsRef.current[sectionKey] = event.nativeEvent.layout.y;
  }

  function resolveActiveSection(scrollY: number) {
    const sectionThreshold = scrollY + 180;
    let currentSection: DashboardSectionKey = 'profile';

    for (const sectionKey of sectionOrder) {
      if (sectionOffsetsRef.current[sectionKey] <= sectionThreshold) {
        currentSection = sectionKey;
      }
    }

    return currentSection;
  }

  function handleSectionScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const currentSection = resolveActiveSection(
      event.nativeEvent.contentOffset.y,
    );

    setActiveSection((previousSection) =>
      previousSection === currentSection ? previousSection : currentSection,
    );
  }

  function scrollToSection(sectionKey: DashboardSectionKey) {
    setActiveSection(sectionKey);
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(sectionOffsetsRef.current[sectionKey] - 12, 0),
    });
  }

  function openWebInsights() {
    void Linking.openURL(webInsightsUrl);
  }

  return (
    <ImageBackground
      imageStyle={styles.pageBackgroundImage}
      source={require('../../../assets/mars.png')}
      style={styles.pageBackground}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleSectionScroll}
        ref={scrollViewRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBannerFrame}>
          <Image
            accessibilityLabel="Dashboard Banner"
            alt="Terraforming Mars Statistics banner"
            resizeMode="cover"
            source={require('../../../assets/banner.png')}
            style={styles.heroBannerImage}
          />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Terraforming Mars Stats</Text>
          <Text style={styles.heroTableName}>{heroTableName}</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSummary}>{heroSummary}</Text>

          {availableScopes.length > 1 ? (
            <View style={styles.scopeButtonRow}>
              {availableScopes.map((scope) => {
                const isSelected = scope.id === selectedScope.id;

                return (
                  <Pressable
                    key={scope.id}
                    onPress={() => setSelectedScopeId(scope.id)}
                    style={[
                      styles.scopeButton,
                      isSelected ? styles.heroNavButtonActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.scopeButtonText,
                        isSelected ? styles.heroNavButtonTextActive : null,
                      ]}
                    >
                      {scope.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.heroMetricRow}>
            {heroMetrics.map((metric) => (
              <View key={metric.key} style={styles.heroMetricCard}>
                <Text style={styles.heroMetricLabel}>{metric.label}</Text>
                <Text style={styles.heroMetricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroButtonRow}>
            <Pressable
              onPress={() => scrollToSection('profile')}
              style={[
                styles.heroNavButton,
                activeSection === 'profile' ? styles.heroNavButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.heroNavButtonText,
                  activeSection === 'profile'
                    ? styles.heroNavButtonTextActive
                    : null,
                ]}
              >
                Personal Stats
              </Text>
            </Pressable>
            <Pressable
              onPress={() => scrollToSection('group')}
              style={[
                styles.heroNavButton,
                activeSection === 'group' ? styles.heroNavButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.heroNavButtonText,
                  activeSection === 'group'
                    ? styles.heroNavButtonTextActive
                    : null,
                ]}
              >
                Comparative Stats
              </Text>
            </Pressable>
            <Pressable
              onPress={() => scrollToSection('global')}
              style={[
                styles.heroNavButton,
                activeSection === 'global' ? styles.heroNavButtonActive : null,
                !selectedScope.global && activeSection !== 'global'
                  ? styles.heroNavButtonMuted
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.heroNavButtonText,
                  activeSection === 'global'
                    ? styles.heroNavButtonTextActive
                    : null,
                ]}
              >
                Global Stats
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={openWebInsights} style={styles.insightsButton}>
            <Text style={styles.insightsButtonText}>Open Insights</Text>
          </Pressable>
        </View>

        {dashboard.emptyState ? (
          <SectionCard title={dashboard.emptyState.title}>
            <Text style={styles.sectionHeadline}>{dashboard.emptyState.title}</Text>
            <Text style={styles.sectionSubtitle}>{dashboard.emptyState.body}</Text>
          </SectionCard>
        ) : null}

        <View
          onLayout={(event) => updateSectionOffset('profile', event)}
          testID="dashboard-section-profile"
        >
          <SectionCard title={profileSection.title}>
            {profileSection.headline ? (
              <Text style={styles.sectionHeadline}>{profileSection.headline}</Text>
            ) : null}
            {profileSection.subtitle ? (
              <Text style={styles.sectionSubtitle}>{profileSection.subtitle}</Text>
            ) : null}
            <MetricGrid metrics={profileSection.metrics ?? []} />
            <BarList
              emptyCopy="Score-mix bars will appear once your linked player has finalized results in this group."
              rows={profileSection.scoreSourceRows ?? []}
              title="Score Mix Chart"
            />
            <RecordList
              emptyCopy="Rival snapshots will appear once repeat head-to-head games are logged."
              rows={profileSection.rivalRows ?? []}
              title="Rival Snapshot"
            />
            <CoverageBadgeList badges={profileSection.coverageBadges ?? []} />
          </SectionCard>
          {selectedScope.individualProfiles?.length ? (
            <SectionCard title="Individual Stats">
              {selectedScope.individualProfiles.map((profileScope, index) => (
                <View
                  key={profileScope.groupId}
                  style={[
                    styles.individualProfileBlock,
                    index === 0 ? styles.individualProfileBlockFirst : null,
                  ]}
                >
                  <Text style={styles.individualProfileGroup}>
                    {profileScope.groupName}
                  </Text>
                  {profileScope.profile?.headline ? (
                    <Text style={styles.individualProfileHeadline}>
                      {profileScope.profile.headline}
                    </Text>
                  ) : null}
                  {profileScope.profile?.subtitle ? (
                    <Text style={styles.sectionSubtitle}>
                      {profileScope.profile.subtitle}
                    </Text>
                  ) : null}
                  <MetricGrid metrics={profileScope.profile?.metrics ?? []} />
                </View>
              ))}
            </SectionCard>
          ) : null}
        </View>

        <View
          onLayout={(event) => updateSectionOffset('group', event)}
          testID="dashboard-section-group"
        >
          <SectionCard title={groupSection.title}>
            {groupSection.summary ? (
              <Text style={styles.sectionSubtitle}>{groupSection.summary}</Text>
            ) : null}
            <BarList
              emptyCopy="Group leaderboard bars will appear once finalized games are available."
              rows={groupSection.leaderboardRows ?? []}
              title="Leader Board"
            />
            <RecordList
              emptyCopy="Head-to-head matchups will appear after repeated pairings."
              rows={groupSection.headToHeadRows ?? []}
              title="Head-to-Head Ledger"
            />
            <TrendChart rows={groupSection.trendRows ?? []} />
          </SectionCard>
        </View>

        <View
          onLayout={(event) => updateSectionOffset('global', event)}
          testID="dashboard-section-global"
        >
          <SectionCard title={globalSection.title}>
            {globalSection.summary ? (
              <Text style={styles.sectionSubtitle}>{globalSection.summary}</Text>
            ) : null}
            <BarList
              emptyCopy="Global bars will appear once opted-in groups contribute enough finalized data."
              rows={globalSection.leaderboardRows ?? []}
              title="Global Corporation Board"
            />
          </SectionCard>
        </View>

        <Pressable onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  block: {
    gap: 12,
  },
  blockTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  chartCopyRow: {
    gap: 4,
  },
  chartDetail: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  chartFill: {
    borderRadius: 999,
    height: 12,
  },
  chartLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  chartList: {
    gap: 12,
  },
  chartRow: {
    gap: 6,
  },
  chartTrack: {
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  coverageBadge: {
    backgroundColor: 'rgba(11, 18, 32, 0.8)',
    borderColor: '#425066',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: '47%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  coverageLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },
  coverageValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  heroBannerFrame: {
    backgroundColor: 'rgba(10, 14, 20, 0.92)',
    borderColor: 'rgba(186, 94, 44, 0.72)',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  heroBannerImage: {
    borderRadius: 20,
    height: 108,
    width: '100%',
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCard: {
    backgroundColor: 'rgba(14, 20, 31, 0.94)',
    borderColor: 'rgba(186, 94, 44, 0.78)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: '#000000',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  heroEyebrow: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroMetricCard: {
    backgroundColor: 'rgba(8, 15, 24, 0.92)',
    borderColor: 'rgba(78, 98, 122, 0.82)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  heroMetricLabel: {
    color: '#d7e0ea',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
  heroMetricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroMetricValue: {
    color: '#fff7ed',
    fontSize: 24,
    fontWeight: '900',
  },
  heroNavButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 15, 24, 0.86)',
    borderColor: 'rgba(77, 97, 121, 0.78)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  heroNavButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#fbbf24',
  },
  heroNavButtonMuted: {
    opacity: 0.74,
  },
  heroNavButtonText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.06,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  heroNavButtonTextActive: {
    color: '#27150e',
  },
  heroSummary: {
    color: '#d6dde8',
    fontSize: 15,
    lineHeight: 22,
  },
  heroTableName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroTitle: {
    color: '#fff7ed',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  insightsButton: {
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderColor: '#fbbf24',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightsButtonText: {
    color: '#27150e',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  individualProfileBlock: {
    borderColor: 'rgba(78, 98, 122, 0.52)',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 16,
  },
  individualProfileBlockFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  individualProfileGroup: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  individualProfileHeadline: {
    color: '#fff7ed',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  metricCard: {
    backgroundColor: 'rgba(8, 15, 24, 0.88)',
    borderColor: 'rgba(77, 97, 121, 0.78)',
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '47%',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
  },
  mutedCopy: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  pageBackground: {
    backgroundColor: '#05080d',
    flex: 1,
  },
  pageBackgroundImage: {
    opacity: 0.16,
  },
  recordCard: {
    backgroundColor: 'rgba(8, 15, 24, 0.84)',
    borderColor: 'rgba(77, 97, 121, 0.72)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  recordDetail: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  recordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordLabel: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  recordList: {
    gap: 10,
  },
  recordRecord: {
    color: '#fb923c',
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  sectionCard: {
    backgroundColor: 'rgba(17, 24, 35, 0.92)',
    borderColor: 'rgba(181, 94, 44, 0.72)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  sectionEyebrow: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionHeadline: {
    color: '#fff7ed',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  sectionSubtitle: {
    color: '#d6dde8',
    fontSize: 15,
    lineHeight: 22,
  },
  scopeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 15, 24, 0.86)',
    borderColor: 'rgba(77, 97, 121, 0.78)',
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: '46%',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scopeButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopeButtonText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#354154',
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 56,
  },
  signOutButtonText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  trendColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  trendFill: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    width: '100%',
  },
  trendLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  trendShell: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    minHeight: 180,
  },
  trendTrack: {
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 132,
    overflow: 'hidden',
    padding: 4,
    width: '100%',
  },
  trendValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
});
