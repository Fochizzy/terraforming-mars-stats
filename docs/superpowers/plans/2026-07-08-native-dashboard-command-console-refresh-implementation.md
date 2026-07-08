# Native Dashboard Command Console Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the native Terraforming Mars dashboard into the approved command-console layout while preserving the existing dashboard data model and fallback behavior.

**Architecture:** Keep all data loading and analytics shaping unchanged, and concentrate the redesign inside `src/features/native/native-dashboard-screen.tsx`. Prove the new hero structure through focused route-level tests in `src/features/native/ready-route.test.tsx` so the layout refresh stays presentation-only and low risk.

**Tech Stack:** React Native, Expo Router, Vitest, Testing Library

---

## File Structure

1. `src/features/native/native-dashboard-screen.tsx`
   - owns the native dashboard presentation, hero structure, asset usage, section surfaces, and sign-out action
2. `src/features/native/ready-route.test.tsx`
   - proves the native dashboard renders the refreshed command-console hero, the separate dashboard buttons, and the existing section states
3. `docs/superpowers/specs/2026-07-08-native-dashboard-command-console-refresh-design.md`
   - approved design reference for the implementation

### Task 1: Lock the new hero structure with a failing route test

**Files:**
- Modify: `src/features/native/ready-route.test.tsx`
- Test: `src/features/native/ready-route.test.tsx`

- [ ] **Step 1: Write the failing test expectations for the refreshed command console**

```tsx
expect(await screen.findByText(/command board/i)).toBeInTheDocument();
expect(screen.getAllByText(/weighted score/i).length).toBeGreaterThan(0);
expect(screen.getAllByText(/win rate/i).length).toBeGreaterThan(0);
expect(screen.getAllByText(/avg score/i).length).toBeGreaterThan(0);
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
```

- [ ] **Step 2: Run the focused route test to verify it fails**

Run: `npm.cmd run test -- src/features/native/ready-route.test.tsx`
Expected: FAIL because the current dashboard hero still renders badge chips instead of button controls, does not expose `Avg Score`, and does not render the banner asset.

- [ ] **Step 3: Keep the existing placeholder/global assertions intact**

```tsx
expect(await screen.findByText(/global corporation board/i)).toBeInTheDocument();
expect(screen.getAllByText(/global stats/i).length).toBeGreaterThan(0);
expect(
  screen.getByText(
    /global bars will appear once opted-in groups contribute enough finalized data/i,
  ),
).toBeInTheDocument();
```

- [ ] **Step 4: Re-run the focused test after editing to confirm the new expectations are the failing ones**

Run: `npm.cmd run test -- src/features/native/ready-route.test.tsx`
Expected: FAIL with missing `Command Board` hero structure or missing button/banner assertions, not with unrelated route errors.

### Task 2: Implement the command-console refresh in the native dashboard screen

**Files:**
- Modify: `src/features/native/native-dashboard-screen.tsx`
- Test: `src/features/native/ready-route.test.tsx`

- [ ] **Step 1: Add the native image imports and hero metric helpers**

```tsx
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const heroMetricDefinitions = [
  { key: 'weighted-score', label: 'Weighted Score', aliases: ['weighted score'] },
  { key: 'win-rate', label: 'Win Rate', aliases: ['win rate'] },
  { key: 'avg-score', label: 'Avg Score', aliases: ['average score', 'avg score'] },
] as const;

function buildHeroMetrics(metrics: Array<{ label: string; value: string }>) {
  return heroMetricDefinitions.map((definition) => {
    const match = metrics.find((metric) =>
      definition.aliases.includes(metric.label.trim().toLowerCase()),
    );

    return {
      key: definition.key,
      label: definition.label,
      value: match?.value ?? '--',
    };
  });
}
```

- [ ] **Step 2: Replace the badge-style hero with the approved banner plus command card layout**

```tsx
const heroMetrics = buildHeroMetrics(profileSection.metrics ?? []);

return (
  <ImageBackground
    imageStyle={styles.pageBackgroundImage}
    source={require('../../../assets/mars.png')}
    style={styles.pageBackground}
  >
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroBannerFrame}>
        <Image
          accessibilityLabel="Dashboard Banner"
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

        <View style={styles.heroMetricRow}>
          {heroMetrics.map((metric) => (
            <View key={metric.key} style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>{metric.label}</Text>
              <Text style={styles.heroMetricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.heroButtonRow}>
          <Pressable onPress={() => undefined} style={[styles.heroNavButton, styles.heroNavButtonActive]}>
            <Text style={[styles.heroNavButtonText, styles.heroNavButtonTextActive]}>
              Personal Stats
            </Text>
          </Pressable>
          <Pressable onPress={() => undefined} style={styles.heroNavButton}>
            <Text style={styles.heroNavButtonText}>Comparative Stats</Text>
          </Pressable>
          <Pressable
            onPress={() => undefined}
            style={[styles.heroNavButton, !dashboard.global ? styles.heroNavButtonMuted : null]}
          >
            <Text style={styles.heroNavButtonText}>Global Stats</Text>
          </Pressable>
        </View>
      </View>
```

- [ ] **Step 3: Tighten the lower section surfaces so they share one cleaner console system**

```tsx
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
recordCard: {
  backgroundColor: 'rgba(8, 15, 24, 0.84)',
  borderColor: 'rgba(77, 97, 121, 0.72)',
  borderRadius: 18,
  borderWidth: 1,
  gap: 6,
  paddingHorizontal: 14,
  paddingVertical: 14,
},
```

- [ ] **Step 4: Run the focused route test to verify the refreshed hero now passes**

Run: `npm.cmd run test -- src/features/native/ready-route.test.tsx`
Expected: PASS with the banner, `Command Board`, `Weighted Score`, `Win Rate`, `Avg Score`, and the three separate buttons all present.

- [ ] **Step 5: Refactor only if needed to keep helper names and layout responsibilities clear**

```tsx
function SectionCard(...) { ... }
function MetricGrid(...) { ... }
function buildHeroMetrics(...) { ... }
```

Keep the screen data flow unchanged and avoid introducing new dashboard-loading responsibilities.

### Task 3: Run final scoped verification for the dashboard refresh

**Files:**
- Modify: `src/features/native/native-dashboard-screen.tsx`
- Modify: `src/features/native/ready-route.test.tsx`

- [ ] **Step 1: Run the focused route test one more time from a clean command**

Run: `npm.cmd run test -- src/features/native/ready-route.test.tsx`
Expected: PASS with 2 tests passing and no new warnings beyond existing environment noise.

- [ ] **Step 2: Run a TypeScript safety pass for the touched dashboard files**

Run: `npx.cmd tsc --noEmit --pretty false`
Expected: PASS with no TypeScript errors introduced by the new image usage, helper functions, or button structure.

- [ ] **Step 3: Check the final diff scope before reporting completion**

Run: `git diff -- src/features/native/native-dashboard-screen.tsx src/features/native/ready-route.test.tsx`
Expected: diff limited to the command-console hero refresh and the matching focused test assertions.
