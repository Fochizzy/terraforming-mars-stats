import { NextResponse } from 'next/server';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
