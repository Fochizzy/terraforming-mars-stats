import { NextResponse } from 'next/server';
import {
  normalizeNextPath,
} from '@/features/auth/build-auth-callback-url';
import { completeAuthSession } from '@/features/auth/complete-auth-session';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));
  const result = await completeAuthSession({ nextPath });

  return NextResponse.redirect(new URL(result.redirectPath, requestUrl.origin));
}
