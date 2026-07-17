import { describe, expect, it } from 'vitest';
import {
  createCorporationLogoRegistry,
  findSharedCorporationLogoPaths,
  resolveCorporationLogoRegistryEntry,
  validateCorporationLogoRemaps,
  type CorporationLogoRegistryEntry,
} from './corporation-logo-registry';

const rows = [
  {
    corporationCode: 'ares:athena',
    corporationId: 'corp-athena-ares',
    displayName: 'Athena',
    expansionCode: 'ares',
    logoPath: 'Athena.png',
  },
  {
    corporationCode: 'community:athena',
    corporationId: 'corp-athena-community',
    displayName: 'Athena',
    expansionCode: 'community',
    logoPath: 'Athena.png',
  },
  {
    corporationCode: 'base:credicor',
    corporationId: 'corp-credicor',
    displayName: 'CrediCor',
    expansionCode: 'base',
    logoPath: 'Creditcor.png',
  },
  {
    corporationCode: 'community:marabout-shiritori',
    corporationId: 'corp-marabout',
    displayName: 'Marabout Shiritori',
    expansionCode: 'community',
    logoPath: 'Marabout_Shiritori.png',
  },
] satisfies readonly CorporationLogoRegistryEntry[];

describe('corporation logo registry identity', () => {
  it('resolves by canonical corporation ID and preserves the exact logo_path', () => {
    const registry = createCorporationLogoRegistry(rows);

    expect(
      resolveCorporationLogoRegistryEntry(registry, {
        corporationId: 'corp-credicor',
      }),
    ).toEqual({
      entry: expect.objectContaining({
        corporationCode: 'base:credicor',
        logoPath: 'Creditcor.png',
      }),
      status: 'matched',
    });
  });

  it('resolves by canonical corporation code deterministically', () => {
    const registry = createCorporationLogoRegistry([...rows].reverse());

    expect(registry.entries.map((entry) => entry.corporationCode)).toEqual([
      'ares:athena',
      'base:credicor',
      'community:athena',
      'community:marabout-shiritori',
    ]);
    expect(
      resolveCorporationLogoRegistryEntry(registry, {
        corporationCode: 'base:credicor',
      }),
    ).toMatchObject({
      entry: { corporationId: 'corp-credicor' },
      status: 'matched',
    });
  });

  it('rejects unknown and conflicting identities instead of guessing', () => {
    const registry = createCorporationLogoRegistry(rows);

    expect(
      resolveCorporationLogoRegistryEntry(registry, {
        corporationId: 'unknown-id',
      }),
    ).toEqual({ reason: 'unknown-id', status: 'unmatched' });
    expect(
      resolveCorporationLogoRegistryEntry(registry, {
        corporationCode: 'base:credicor',
        corporationId: 'corp-marabout',
      }),
    ).toEqual({ reason: 'id-code-conflict', status: 'ambiguous' });
  });

  it.each([
    { displayName: 'CrediCor' },
    { fileName: 'Creditcor.png' },
    { logoPath: 'Creditcor.png' },
    {
      storageUrl:
        'https://example.supabase.co/storage/v1/object/public/tm-corporation-logos/Creditcor.png',
    },
  ])('does not accept display, filename, path, or URL identity: %j', (identity) => {
    const registry = createCorporationLogoRegistry(rows);

    expect(
      resolveCorporationLogoRegistryEntry(
        registry,
        identity as unknown as { corporationId?: string; corporationCode?: string },
      ),
    ).toEqual({
      reason: 'missing-stable-identity',
      status: 'invalid-identity',
    });
  });
});

describe('corporation logo registry integrity', () => {
  it('reports duplicate IDs and codes without allowing ambiguous lookup', () => {
    const registry = createCorporationLogoRegistry([
      ...rows,
      {
        ...rows[2],
        corporationId: 'corp-credicor-duplicate',
      },
      {
        ...rows[3],
        corporationCode: 'community:other-code',
      },
    ]);

    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'duplicate-code' }),
        expect.objectContaining({ kind: 'duplicate-id' }),
      ]),
    );
    expect(
      resolveCorporationLogoRegistryEntry(registry, {
        corporationCode: 'base:credicor',
      }),
    ).toEqual({ reason: 'registry-duplicate', status: 'ambiguous' });
  });

  it('reports intentional shared paths while keeping each stable identity distinct', () => {
    const registry = createCorporationLogoRegistry(rows);

    expect(findSharedCorporationLogoPaths(registry)).toEqual([
      {
        corporations: [
          expect.objectContaining({ corporationCode: 'ares:athena' }),
          expect.objectContaining({ corporationCode: 'community:athena' }),
        ],
        logoPath: 'Athena.png',
      },
    ]);
  });
});

describe('corporation logo remap validation', () => {
  const exactProposal = {
    classification: 'exact verified match' as const,
    corporationCode: 'base:credicor',
    corporationId: 'corp-credicor',
    proposedLogoPath: 'corporation-logo-sha.png',
    sharedPathStatus: 'not-shared' as const,
    sourceSha256: 'SHA-CREDICOR',
  };

  it('accepts only independently matching ID/code proposals', () => {
    const result = validateCorporationLogoRemaps(
      createCorporationLogoRegistry(rows),
      [exactProposal],
    );

    expect(result).toEqual({ accepted: [exactProposal], issues: [] });
  });

  it('rejects ambiguous classifications and duplicate corporation targets', () => {
    const result = validateCorporationLogoRemaps(
      createCorporationLogoRegistry(rows),
      [
        exactProposal,
        { ...exactProposal, sourceSha256: 'SECOND-SOURCE' },
        {
          ...exactProposal,
          classification: 'ambiguous match',
          corporationId: 'corp-marabout',
          corporationCode: 'community:marabout-shiritori',
        },
      ],
    );

    expect(result.accepted).toEqual([]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'duplicate-corporation-target' }),
        expect.objectContaining({
          kind: 'ambiguous-or-unverified-classification',
        }),
      ]),
    );
  });

  it('rejects one replacement proposed for unrelated corporations', () => {
    const result = validateCorporationLogoRemaps(
      createCorporationLogoRegistry(rows),
      [
        exactProposal,
        {
          ...exactProposal,
          corporationCode: 'community:marabout-shiritori',
          corporationId: 'corp-marabout',
        },
      ],
    );

    expect(result.accepted).toEqual([]);
    expect(result.issues).toContainEqual({
      corporationIds: ['corp-credicor', 'corp-marabout'],
      kind: 'replacement-proposed-for-multiple-corporations',
      sourceSha256: 'SHA-CREDICOR',
    });
  });

  it('allows a verified shared edition path only when the current registry already shares it', () => {
    const result = validateCorporationLogoRemaps(
      createCorporationLogoRegistry(rows),
      [
        {
          classification: 'exact verified match',
          corporationCode: 'ares:athena',
          corporationId: 'corp-athena-ares',
          proposedLogoPath: 'corporation-logo-athena-sha.png',
          sharedPathStatus: 'verified-intentional',
          sourceSha256: 'SHA-ATHENA',
        },
        {
          classification: 'exact verified match',
          corporationCode: 'community:athena',
          corporationId: 'corp-athena-community',
          proposedLogoPath: 'corporation-logo-athena-sha.png',
          sharedPathStatus: 'verified-intentional',
          sourceSha256: 'SHA-ATHENA',
        },
      ],
    );

    expect(result.issues).toEqual([]);
    expect(result.accepted).toHaveLength(2);
  });
});
