import { NextResponse } from 'next/server';
import { getDeploymentStamp } from '@/lib/deploy/deployment-stamp';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Operator-facing deployment provenance. Returns the stamp baked into this
 * build so a person (or the migration gate) can verify exactly which commit is
 * serving traffic before applying a contract-phase change against it.
 *
 * Authenticated-only: the stamp is not secret, but there is no reason to offer
 * fingerprinting data to signed-out visitors. The payload is built exclusively
 * from the six stamp fields — no env passthrough, no secrets.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { headers: { 'cache-control': 'no-store' }, status: 401 },
    );
  }

  return NextResponse.json(getDeploymentStamp(), {
    headers: { 'cache-control': 'no-store' },
  });
}
