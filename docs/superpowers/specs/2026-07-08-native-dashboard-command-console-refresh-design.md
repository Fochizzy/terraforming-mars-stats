# Native Dashboard Command Console Refresh Design

Date: 2026-07-08

## Goal

Refresh the native Terraforming Mars dashboard so it feels like a polished command console built around the provided banner and Mars artwork, while keeping the current dashboard data model and section content stable.

## Approved Direction

1. Use the `B` layout direction: a tighter command-console presentation instead of a cinematic poster layout.
2. Make the top card `headline stats first` instead of action-first.
3. Show `3 compact stats` in the hero:
   - `Weighted Score`
   - `Win Rate`
   - `Avg Score`
4. Keep `Personal Stats`, `Comparative Stats`, and `Global Stats` as separate buttons.
5. Make those three buttons equal-size, neatly aligned, and center their text instead of rendering them as uneven pill chips.
6. Keep the Mars background subtle behind the panels rather than making it a dominant foreground shape.

## Recommended Approach

Use a focused native dashboard presentation refresh centered in `src/features/native/native-dashboard-screen.tsx`.

Why this approach fits:

1. The user asked to improve this page's layout and display rather than redesign the whole app.
2. The current native dashboard already has the correct data surfaces and fallback behavior.
3. The app already uses local image assets in native screens, so the banner and Mars art can be integrated without introducing new infrastructure.
4. A presentation-only change keeps the work lower risk and easier to verify than touching dashboard loading or analytics shaping.

## Product Rules

1. The redesign must preserve the current native dashboard's content model: hero area, profile section, comparative section, global section, and sign-out action all remain available.
2. The redesign must not require changes to `NativeDashboardData` or the profile/group/global payload shapes.
3. The banner should feel branded and intentional, but it should not consume so much space that it delays access to real stats.
4. The top `Command Board` card should be the main visual anchor of the screen.
5. The three headline stats should scan quickly on mobile before the user reaches the rest of the dashboard.
6. The Mars background should act as atmospheric support through soft contrast and glow rather than as a competing visual subject.
7. Charts, metric cards, and record cards should feel cleaner and more consistent than decorative.
8. Empty-state and fallback copy should remain functional and readable after the visual pass.

## Layout Structure

### Header Strip

1. Replace the current plain hero lead-in with a slimmer framed banner header that uses the provided `banner.png`.
2. The banner should read as a branded strip near the top of the screen rather than a full-height splash.
3. The banner should visually connect to the rest of the dashboard through matching border color, corner treatment, and surface glow.

### Command Board Card

Immediately beneath the banner, render one primary command card that contains:

1. the `Terraforming Mars Stats` eyebrow
2. the active group name
3. the `Command Board` title
4. one short supporting summary line
5. a three-up compact metric row for:
   - weighted score
   - win rate
   - average score

This card should be tighter and more structured than the current hero, with cleaner alignment and less free-form vertical stacking.

### Mode Button Row

Below the command card, keep:

1. `Personal Stats`
2. `Comparative Stats`
3. `Global Stats`

These should render as:

1. equal-width controls
2. equal-height controls
3. centered labels
4. consistent horizontal spacing
5. a clear selected state that feels like an active dashboard tab, not a pill badge

### Lower Dashboard Sections

Keep the current profile, comparative, and global data sections, but reframe them with a more disciplined surface system:

1. consistent corner radius family
2. consistent border weight
3. consistent inner spacing rhythm
4. consistent title treatment
5. cleaner chart framing

The lower sections should feel like part of one coherent dashboard system instead of a stack of loosely related cards.

## Visual System

### Background Treatment

1. Use the provided `mars.png` as a subtle atmospheric background layer behind the main panels.
2. The Mars image should be partially obscured by dark gradients and surface overlays so it does not compete with foreground content.
3. The page background should still primarily read as a dark space-toned dashboard surface.

### Surface Styling

1. Use the Terraforming Mars palette already established in the repo:
   - rust and copper borders
   - dark space backgrounds
   - warm display accents
   - cooler contrast for select charts and secondary highlights
2. Preserve the existing board-game-inspired styling direction, but tighten it into a cleaner console look.
3. Favor strong contrast and readable typography over ornamental texture.

### Typography And Hierarchy

1. The group name and `Command Board` title should read as the primary hero content.
2. Eyebrows and button labels should stay uppercase and structured.
3. The compact stat row should emphasize numeric values first and labels second.
4. Lower-section headlines should remain prominent, but they should not visually overpower the top command card.

## Interaction Behavior

1. The banner remains a branding surface only; it does not become a button or carousel.
2. The three mode buttons should look intentionally interactive and should visually communicate the currently emphasized destination.
3. The stat hero should not require additional user interaction to reveal the first important numbers.
4. The rest of the dashboard should continue scrolling naturally, with the refreshed hero helping users orient faster at the top of the page.

## Code Boundary

The primary code surface for this work should be:

1. `src/features/native/native-dashboard-screen.tsx`

Supporting verification should stay in:

1. `src/features/native/ready-route.test.tsx`

The design should not require changes to:

1. `src/features/native/load-native-dashboard.ts`
2. the dashboard data types
3. analytics shaping logic
4. fallback section builders beyond selecting which existing metrics appear in the command card

## Asset Integration

1. Reuse the local native asset-loading pattern already used by the native auth screen.
2. Use the provided banner art as the framed header asset.
3. Use the provided Mars artwork as the subtle page background layer.
4. Do not introduce a new remote image dependency for this redesign.

## Fallback And Empty-State Behavior

1. The current fallback sections for missing personal, comparative, or global data should remain intact.
2. The command card should still render cleanly even when global data is unavailable.
3. The global placeholder state should remain visible when opted-in global data is empty.
4. Empty sections should still communicate what data is missing and what future finalized games will unlock.

## Verification Strategy

### Structural Verification

Update `src/features/native/ready-route.test.tsx` to keep proving that:

1. the native dashboard renders the three main dashboard destinations
2. profile, comparative, and global sections still appear
3. score mix and trend content remain visible when provided
4. global placeholder behavior still works when global analytics are unavailable

### Hero Verification

Add or update assertions that verify:

1. the command board hero renders
2. the three dashboard buttons are present as separate controls
3. the compact headline-stat structure is present

### Style Verification Philosophy

1. Do not rely on brittle full-screen snapshots.
2. Prefer structural assertions that survive legitimate spacing and styling refinement.
3. Verify behavior and section presence, not pixel-perfect style literals.

## Out Of Scope

1. changing the dashboard analytics schema
2. changing the meaning or calculation of the stats
3. redesigning unrelated native app screens beyond what is necessary to keep this dashboard visually coherent
4. replacing the separate dashboard buttons with segmented chips or merged controls
5. turning the Mars background into a dominant illustration layer
6. broad refactors of native navigation, loading, or auth behavior

## Success Criteria

The redesign is successful when:

1. the native dashboard reads as a cohesive command-console surface instead of a stack of generic cards
2. the banner and Mars artwork are integrated in a restrained, readable way
3. the top of the page surfaces the three headline stats quickly
4. the three dashboard buttons look aligned, deliberate, and consistently sized
5. the lower cards feel more unified without losing any existing data surfaces
6. the native dashboard tests still prove the major dashboard states and fallback behavior
