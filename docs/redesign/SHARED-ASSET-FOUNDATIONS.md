# TM Stats Shared Asset Foundations

Phase 1, Step 1.2 establishes a typed, page-agnostic asset contract. It does not
integrate images into production pages, change routes, query new database fields,
or mutate Supabase Storage.

## Request assets by stable identity

Import resolvers from `@/lib/assets` and the renderer from
`@/components/assets`.

Every resolver requires a canonical ID, code, or slug. Display names are used
only for alternative text and fallbacks. They are never converted into Storage
filenames when a stable identifier or stored path exists.

```tsx
const logo = resolveCorporationLogoAsset({
  corporationId: corporation.id,
  logoPath: corporation.logoPath,
  name: corporation.name,
});

<AssetImage asset={logo} height={48} width={48} />;
```

Resolvers return a `ResolvedAsset` discriminated union:

- `status: 'available'` includes the URL, canonical key, family, alt intent,
  optional intrinsic dimensions/aspect ratio, source/access metadata, and
  deterministic fallback metadata.
- `status: 'unavailable'` includes the same identity and presentation metadata,
  `url: null`, and an explicit reason such as `missing-path`,
  `missing-configuration`, `malformed-path`, or `source-unavailable`.

Callers should pass either result directly to `AssetImage`; they should not
invent a substitute URL.

## Family support

| Family | Step 1.2 behavior | Canonical input |
| --- | --- | --- |
| Corporation logos | Public `tm-corporation-logos` object path supplied by repository metadata | corporation ID/code plus stored `logo_path` |
| Score-source icons | Explicit standard/axis registry for the ten confirmed score-source keys | typed score-source key |
| Tag icons | Explicit mapping for the 15 confirmed database tag codes | database tag code |
| Card images | Public full/thumb object path or an approved external HTTPS source | `source_card_id` plus stored path/URL and variant |
| Map graphics | Public object only when the caller supplies an explicit verified path | `maps.code` plus explicit path |
| Prelude graphics | Deterministic text fallback; no authoritative art exists | Prelude ID/code |
| Milestone graphics | Deterministic text fallback; no per-milestone art exists | milestone ID/code |
| Award graphics | Deterministic text fallback; no per-award art exists | award ID/code |
| Brand/background | Bundled banner and public-static Mars background metadata with confirmed dimensions | typed static registry key |
| Import evidence | Accepts an already-authorized, unexpired signed URL; never signs or exposes the bucket publicly | game/evidence identity plus persisted object path |

Known identity gaps remain unresolved by design:

- `clone` and `crime` tags return `source-unavailable`; the six extra bucket
  concepts are not treated as database tag aliases.
- the Marabout Shiritori path is not remapped to `Marabout.png`.
- the legacy UUID Cities score icon is not made canonical; the shared standard
  and axis registries use the confirmed named variants and are not integrated
  into the current score profile in this step.
- the Terra Cimmeria Nova, Pathfinders, and Wildlife Sponsors issues are not
  repaired or hidden here.
- Prelude, milestone, and award names remain the source of meaning until
  authoritative, licensed per-entity art is approved.

## URL and access rules

- Public Storage paths are decoded once, validated, and encoded one segment at
  a time. Traversal, root-relative paths, empty segments, backslashes,
  query/hash fragments, control characters, and malformed percent encoding are
  rejected.
- Public URLs use `NEXT_PUBLIC_SUPABASE_URL` through the existing validated
  environment configuration. Missing configuration returns an unavailable
  result. No publishable key is placed in an asset URL, and service-role
  credentials are never read by this foundation.
- Card source URLs must be HTTPS (or local HTTP during development), may not
  contain credentials, and may not masquerade as signed Storage URLs.
- Private evidence URLs must already be signed by an authorized server flow,
  use the private bucket, carry a token, and have a future expiry. The resolver
  does not authorize a game, issue a signature, refresh a URL, or persist the
  signed URL. Those behaviors remain in their owning Phase 4/5 task.

## Rendering contract

`AssetImage` is noninteractive. Do not add a tab stop unless an owning component
wraps it in a real link or control with its own accessible action name.

- Informative assets expose concise resolver-provided alt text.
- Decorative assets use `alt=""`, hide loading/fallback treatment from
  assistive technology, and rely on adjacent visible text.
- Display `width`, `height`, or `aspectRatio` can be supplied by the caller.
  Otherwise confirmed descriptor ratios/dimensions reserve responsive space;
  unknown metadata receives a stable neutral container rather than fabricated
  intrinsic dimensions.
- Images load lazily by default. The component shows a reserved loading
  treatment and swaps once to the family fallback after a network/decode error.
  The failed image is removed, so a browser broken-image icon is never exposed.
- Fallbacks keep a full entity label/status for assistive technology and a
  stable compact label for constrained layouts. A visible `!` marker means the
  missing status is not communicated through color alone.
- Theme colors come from the existing `--tm-*` tokens. Long names stay in the
  fallback metadata and accessible label even when the visible compact label is
  two characters.

## Future integration checklist

When an owning phase adopts the foundation:

1. Return canonical identity and stored asset metadata from its repository/read
   model; do not look up Storage once per rendered row.
2. Choose informative versus decorative intent from the surrounding visible
   content.
3. Provide verified dimensions/aspect ratio and responsive `sizes` when known.
4. Render the resolver result without converting unavailable to a guessed URL.
5. Add family coverage fixtures and page-level loading/error/accessibility tests.
6. Preserve the current page until its replacement meets the migration-matrix
   retirement gate.
