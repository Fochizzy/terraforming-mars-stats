import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseMocks.createClient,
}));

describe('createSupabaseAdminClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  });

  it('removes hidden whitespace from the service-role key', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '\uFEFFservice-role-key\n');

    const { createSupabaseAdminClient } = await import('./admin');

    createSupabaseAdminClient();

    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  });
});
