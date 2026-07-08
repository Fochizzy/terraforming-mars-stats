# Terraforming Mars Supabase Email Templates Design

Date: 2026-07-08

## Overview

This change themes every repo-managed Supabase email template to feel stylistically aligned with Terraforming Mars while staying clear, accessible, and safe for real account actions. The implementation lives entirely in `supabase/config.toml` and a new `supabase/templates/` folder so the templates can run locally without a build step and can later be copied into the Supabase Dashboard if needed.

The user approved the shared-shell direction rather than a separate bespoke visual treatment for each email. Every template should therefore feel like part of one coherent "Mission Control" system, with per-email titles, support copy, and action treatment layered on top.

## Goals

1. Theme all supported Supabase auth and notification emails in the repo.
2. Use the provided `assets/text_icon.png` as the visual basis for the email header icon.
3. Embed the icon inline so the emails do not depend on remote image hosting.
4. Preserve clear account-action copy even when the surrounding tone is more game-like.
5. Keep the templates compatible with common email clients.

## Non-Goals

1. Changing application auth flows, routes, or Supabase behavior.
2. Adding a template build pipeline, templating engine, or email rendering framework.
3. Creating separate visual systems per template type.
4. Optimizing for advanced web layout features that are fragile in email clients.
5. Updating hosted Supabase Dashboard templates in this change.

## Supported Email Coverage

The repo should define templates for every supported Supabase email slot used by `config.toml`.

### Authentication email templates

1. `invite`
2. `confirmation`
3. `recovery`
4. `magic_link`
5. `email_change`
6. `reauthentication`

### Security notification email templates

1. `password_changed`
2. `email_changed`
3. `phone_changed`
4. `mfa_factor_enrolled`
5. `mfa_factor_unenrolled`
6. `identity_linked`
7. `identity_unlinked`

## Product Decisions

### Shared Mission Control Shell

All templates should use the same repeated email-safe shell:

1. a dark space-toned outer background
2. a central panel styled like a Terraforming Mars control card
3. the inline icon at the top
4. a small mission label above the main title
5. a prominent headline explaining the current account event
6. short body copy with themed supporting language
7. a consistent footer with safety context

This shell should be copied into each HTML file rather than generated from a partial system. The duplication is acceptable here because Supabase reads static HTML files directly and the maintenance cost is still modest at this size.

### Copy Tone

The copy should be "clear first, thematic second."

Rules:

1. the first line must always explain the real account action in plain language
2. supporting copy may use Terraforming Mars framing like "mission control", "transmission", or "colony records"
3. warnings, safety guidance, and fallback text should remain plain and literal
4. no email should make the user guess whether they need to click a link, enter a code, or ignore the message

### Icon Handling

The source icon file is too large to embed raw in every template. The implementation should derive a smaller email-safe version from `assets/text_icon.png`, then inline that derived image as base64 in each template.

Requirements:

1. no remote image URLs
2. no dependency on CID attachments
3. visually crisp at email-header size
4. materially smaller than the original source asset

### Email Client Constraints

The HTML should optimize for email reliability rather than web expressiveness.

Rules:

1. use table-based layout for the main structure
2. use simple CSS compatible with common desktop and mobile email clients
3. avoid external fonts
4. avoid background images
5. avoid modern layout dependencies such as grid and flex as core structure
6. keep CTA buttons implemented as robust linked blocks or button-like anchors

## Template Behavior Patterns

The templates split into two presentation patterns.

### Action Emails

These emails contain a primary user action and should include a strong CTA area.

Templates:

1. `invite`
2. `confirmation`
3. `recovery`
4. `magic_link`
5. `email_change`
6. `reauthentication`

Action treatment:

1. button-first when a confirmation URL is the main action
2. OTP-first when a code is the main action
3. include a plain-text fallback link or explanatory note when appropriate

### Notification Emails

These emails communicate account state changes without requiring a primary CTA.

Templates:

1. `password_changed`
2. `email_changed`
3. `phone_changed`
4. `mfa_factor_enrolled`
5. `mfa_factor_unenrolled`
6. `identity_linked`
7. `identity_unlinked`

Notification treatment:

1. headline plus status summary
2. no oversized action button
3. concise safety text advising the user what to do if the event was unexpected

## Supabase Variable Usage

Each template should only use the variables appropriate to its email type.

Common variables likely to appear:

1. `{{ .ConfirmationURL }}`
2. `{{ .Token }}`
3. `{{ .TokenHash }}`
4. `{{ .Email }}`
5. `{{ .NewEmail }}`
6. `{{ .OldEmail }}`
7. `{{ .Phone }}`
8. `{{ .OldPhone }}`
9. `{{ .Provider }}`
10. `{{ .FactorType }}`

Implementation rule:

1. add a short top-of-file comment in each template noting which Supabase variables the file expects
2. do not reference variables that are unavailable for that template type

## File Plan

### Modify

1. `supabase/config.toml`

Purpose:

1. wire every supported auth template to `./supabase/templates/...`
2. wire every supported notification template to `./supabase/templates/...`
3. leave unrelated auth configuration untouched

### Create

1. `supabase/templates/invite.html`
2. `supabase/templates/confirmation.html`
3. `supabase/templates/recovery.html`
4. `supabase/templates/magic_link.html`
5. `supabase/templates/email_change.html`
6. `supabase/templates/reauthentication.html`
7. `supabase/templates/password_changed.html`
8. `supabase/templates/email_changed.html`
9. `supabase/templates/phone_changed.html`
10. `supabase/templates/mfa_factor_enrolled.html`
11. `supabase/templates/mfa_factor_unenrolled.html`
12. `supabase/templates/identity_linked.html`
13. `supabase/templates/identity_unlinked.html`

## Content Design

### Visual Direction

The shell should feel like a premium project card from a Terraforming Mars-inspired mission console:

1. deep charcoal or space-black background
2. rust, copper, amber, and pale cream accents
3. subtle panel framing with borders instead of image-heavy decoration
4. uppercase mission labels for hierarchy
5. clear CTA contrast for links and codes

### Body Structure

Each email should follow the same high-level order:

1. preheader or opening summary text
2. branded header with inline icon
3. mission label
4. action or status headline
5. explanatory body copy
6. button or code panel if required
7. fallback or safety note
8. footer

### Footer Style

The footer should stay brief and practical:

1. identify the app as the source of the message
2. explain what to do if the action was unexpected
3. avoid playful language that weakens trust in security-sensitive messages

## Verification Plan

This change should be verified as a template/config integration rather than a feature-code behavior change.

Verification goals:

1. every configured template path exists
2. every template is valid standalone HTML
3. every template embeds the icon inline
4. `supabase/config.toml` points each slot to the intended file
5. variable usage matches the purpose of the template
6. no obvious email-client-hostile constructs are introduced

Reasonable verification methods:

1. inspect the rendered config section after editing
2. inspect the created template files
3. run a focused script or checks that confirm file presence and inline image usage if useful

## Rollout Notes

This work is intentionally repo-local first. The resulting files should support local Supabase email customization immediately. If hosted Supabase templates need to match later, the HTML can be copied into the Dashboard with only minimal adaptation if required by the hosted editor.

The design should favor maintainability over maximal flourish. The user wants the emails to feel stylistically like Terraforming Mars, but the account actions must remain trustworthy, obvious, and easy to complete.
