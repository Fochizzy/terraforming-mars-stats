import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockState = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mockState.getUser },
  }),
}));

describe('GET /api/deploy-info', () => {
  beforeEach(() => {
    mockState.getUser.mockReset();
    delete process.env.TM_STATS_SOURCE_COMMIT;
    delete process.env.TM_STATS_SOURCE_BRANCH;
    delete process.env.TM_STATS_SOURCE_REPOSITORY;
    delete process.env.TM_STATS_BUILD_TIMESTAMP;
    delete process.env.TM_STATS_DEPLOY_ENVIRONMENT;
    delete process.env.TM_STATS_APP_VERSION;
  });

  it('requires an authenticated user', async () => {
    mockState.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication required.',
    });
  });

  it('returns the baked stamp fields to an authenticated operator', async () => {
    mockState.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    process.env.TM_STATS_SOURCE_COMMIT = 'd'.repeat(40);
    process.env.TM_STATS_SOURCE_BRANCH = 'fix/live-42501-on-capture-v2';
    process.env.TM_STATS_SOURCE_REPOSITORY =
      'github.com/Fochizzy/terraforming-mars-stats';
    process.env.TM_STATS_BUILD_TIMESTAMP = '2026-07-20T18:00:00.000Z';
    process.env.TM_STATS_DEPLOY_ENVIRONMENT = 'production';
    process.env.TM_STATS_APP_VERSION = '0.1.0';

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      appVersion: '0.1.0',
      buildTimestamp: '2026-07-20T18:00:00.000Z',
      environment: 'production',
      sourceBranch: 'fix/live-42501-on-capture-v2',
      sourceCommit: 'd'.repeat(40),
      sourceRepository: 'github.com/Fochizzy/terraforming-mars-stats',
    });
  });

  it('reports unknown fields instead of fabricating provenance', async () => {
    mockState.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const response = await GET();
    const body = (await response.json()) as Record<string, string>;

    expect(response.status).toBe(200);
    expect(body.sourceCommit).toBe('unknown');
    expect(body.sourceBranch).toBe('unknown');
    expect(body.environment).toBe('unknown');
  });

  it('never includes secret env values in the payload', async () => {
    mockState.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sentinel-secret-value';

    try {
      const response = await GET();
      const serialized = JSON.stringify(await response.json());

      expect(serialized).not.toContain('sentinel-secret-value');
      expect(Object.keys(JSON.parse(serialized)).sort()).toEqual([
        'appVersion',
        'buildTimestamp',
        'environment',
        'sourceBranch',
        'sourceCommit',
        'sourceRepository',
      ]);
    } finally {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });
});
