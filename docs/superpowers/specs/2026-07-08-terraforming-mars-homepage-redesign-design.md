# Terraforming Mars Homepage Redesign Design

Date: 2026-07-08

## Overview

This change redesigns the public homepage to match the approved Terraforming Mars Statistics mockup more closely while staying inside the existing Next.js landing-page surface. The redesign keeps the page focused on one core job: make the app feel polished and thematic before sign-in, explain what it does quickly, and give visitors a clear path into `/login`.

The user approved a hero-first landing page built around `assets/banner.png`, a slim attached navigation strip that links to real sections on the homepage itself, and a lightweight set of anchored preview sections rather than full dashboard content on the landing page.

## Goals

1. Make the homepage visually resemble the provided mockup.
2. Use `assets/banner.png` as the hero artwork source.
3. Keep the page public and simple, with the main CTA still pointing to `/login`.
4. Turn the lower tab strip into real in-page navigation instead of decorative text.
5. Preserve strong mobile behavior while improving desktop presentation.
6. Keep implementation narrow and isolated to the landing page.

## Non-Goals

1. Redesigning signed-in app screens.
2. Adding new authenticated routes or changing route guards.
3. Replacing the existing app information architecture.
4. Turning the homepage into a full analytics dashboard.
5. Introducing browser-only animation dependencies or heavy client-side state.

## User-Approved Product Decisions

### Hero Artwork

The hero should use `assets/banner.png` rather than the current public banner asset.

### Lower Navigation Strip

The small nav strip beneath the hero should be real navigation, not decorative text.

### Navigation Behavior

Those nav items should jump to sections on the homepage itself rather than sending visitors into app routes.

### Overall Direction

The page should stay text-only in the design process and should closely match the approved visual mood:

1. dark Mars-to-space background
2. large centered cinematic hero module
3. attached copper-toned lower navigation strip
4. concise supporting copy
5. wide rounded call-to-action button

## Experience Summary

The homepage should read as one composed landing experience:

1. a full-height atmospheric shell
2. a centered hero block with banner artwork
3. an attached navigation strip for quick jumps
4. a short value statement and sign-in CTA
5. lightweight anchored preview sections below

This keeps the first screen close to the mockup while making the nav strip meaningful and giving the page enough structure to reward scrolling.

## Information Architecture

### Top Fold

The first screen contains:

1. a screen-reader heading for `Terraforming Mars Stats`
2. the hero artwork card using `assets/banner.png`
3. an attached tab strip with homepage anchors
4. the short descriptive paragraph
5. the primary `Sign in to your group` CTA

### Homepage Sections

The tab strip should point to anchored sections in this order:

1. `Overview`
2. `Corporations`
3. `Cards`
4. `Projects`
5. `Milestones`
6. `Stats`
7. `Tools`

Each section should have:

1. a stable anchor id
2. a heading
3. one or two lines of concise descriptive copy
4. a small preview surface or chips that hint at the deeper product area

These sections should feel like landing-page previews, not production feature panels.

## Visual Design

### Background and Page Atmosphere

The page background should continue the repo's Terraforming Mars look but push it closer to the mockup:

1. warmer Mars glow near the top
2. deeper space-black lower portion
3. restrained gradient treatment rather than flat color
4. enough contrast that the hero module stands out clearly

### Hero Module

The hero should feel like a single framed unit:

1. large rounded banner card
2. strong shadow and dark framing
3. attached lower strip rather than a separate floating nav
4. controlled width with generous outer breathing room

The artwork itself should not be cropped in a way that damages the title treatment or chart imagery in the supplied banner.

### Typography

The homepage should keep the existing Terraforming Mars-inspired font system already defined in `globals.css`.

Usage guidance:

1. display font for section labels, tabs, and CTA
2. body font for descriptive copy
3. uppercase labeling where it reinforces the mockup
4. tighter, cleaner copy blocks than the current landing page

### Navigation Strip Styling

The attached strip should visually echo the mockup:

1. dark base with subtle copper separators
2. compact uppercase labels
3. horizontal scrolling on small screens
4. hover and focus states that brighten labels without changing the overall palette

The strip may include small accent icons or markers only if they remain visually restrained and do not distract from the tab labels.

### CTA Styling

The sign-in CTA should become a broader, more mockup-like call-to-action:

1. pill shape
2. copper-to-amber gradient
3. centered dark label text
4. stronger width and presence than the current button
5. hover state that feels responsive without becoming glossy or cartoonish

## Content Design

### Hero Copy

The current paragraph is already directionally correct and should remain short. It can be tightened for spacing if needed, but the message should still communicate:

1. log finished games
2. compare corporations and preludes
3. track how the group meta changes over time

### Section Preview Copy

Each anchored section should stay brief and concrete.

Examples of intent:

1. `Overview`: what the app tracks overall
2. `Corporations`: compare win rates, favorites, and trends
3. `Cards`: explore imported card evidence and card-driven patterns
4. `Projects`: highlight logging flow and saved game management
5. `Milestones`: emphasize map-aware milestone and award analysis
6. `Stats`: show trend, leaderboard, and meta summaries
7. `Tools`: point to imports, roster workflows, and group management

The copy should support the landing page instead of repeating the full signed-in product spec.

## Component Plan

### `src/app/page.tsx`

This file should remain the main landing-page composition point.

Responsibilities:

1. define the hero structure
2. define the homepage anchor items
3. render the anchored preview sections
4. keep CTA links and anchor links semantic and accessible

The page can use a small in-file data structure for the section definitions to avoid repetitive markup while keeping the implementation local to the homepage.

### `src/app/globals.css`

This file should receive the homepage-specific styling additions.

New style responsibilities:

1. hero wrapper and width control
2. attached nav strip styling
3. landing-page section spacing
4. mockup-style CTA sizing
5. responsive anchor-strip overflow behavior
6. preview card or chip styling for the anchored sections

These additions should extend the existing theme system rather than fight it.

### `src/app/page.test.tsx`

The landing-page test should expand to assert the redesign structure.

Coverage goals:

1. hero heading remains accessible
2. CTA still links to `/login`
3. homepage nav strip renders the approved labels
4. each nav item points to a matching section anchor
5. anchored sections render expected headings

## Accessibility and Interaction

### Navigation Semantics

The lower strip should be a semantic `nav` with ordinary anchor links.

Requirements:

1. keyboard reachable
2. visible focus treatment
3. readable label text
4. clear section targets

### Scrolling Behavior

In-page navigation should work without JavaScript-heavy behavior.

Requirements:

1. ordinary anchor navigation first
2. smooth scrolling through CSS if appropriate
3. safe fallback when smooth scrolling is unavailable
4. section spacing that prevents headings from feeling cramped after a jump

### Responsive Behavior

The page should remain strong on both desktop and mobile.

Requirements:

1. controlled max width on desktop
2. comfortable side padding on mobile
3. horizontally scrollable lower strip on narrow screens
4. section previews that collapse cleanly into one column
5. no text or nav labels forced into unreadable compression

## Testing and Verification

### Automated Verification

Update the landing-page test so it confirms:

1. the accessible heading remains present
2. the `/login` CTA remains present
3. all approved nav labels render
4. all approved section headings render
5. anchor hrefs match the rendered section ids

### Manual Verification Targets

When implementation begins, verification should include:

1. desktop visual check of the top fold
2. mobile visual check of banner, nav strip, and CTA spacing
3. keyboard tab-through of the lower strip and CTA
4. anchor-jump sanity check for each section

## File Plan

### Modify

1. `src/app/page.tsx`
2. `src/app/page.test.tsx`
3. `src/app/globals.css`

### Reuse

1. `assets/banner.png`

No other route files or signed-in components should be required for this redesign.

## Risks and Guardrails

### Risk: The landing page drifts into full dashboard complexity

Guardrail:

1. keep sections preview-sized and copy-led
2. do not import signed-in dashboard components into the public homepage

### Risk: The lower strip becomes cramped on mobile

Guardrail:

1. allow horizontal scrolling
2. avoid forcing all labels into one fixed-width row

### Risk: The hero feels disconnected from the strip

Guardrail:

1. treat the banner and strip as one visual module
2. minimize spacing between them

### Risk: The redesign leaks into unrelated app screens

Guardrail:

1. scope code and styles to the landing page
2. avoid changing shared shell behavior

## Final Design Decisions

1. Use `assets/banner.png` as the homepage hero image.
2. Keep the first screen visually close to the approved mockup.
3. Make the lower strip real homepage navigation.
4. Use anchor links to jump to sections on the landing page itself.
5. Keep the CTA pointed at `/login`.
6. Add lightweight preview sections rather than full signed-in dashboard content.
7. Limit the implementation to the landing-page file, its test, and global landing-page styles.
