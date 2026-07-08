import { type NextRequest, NextResponse } from 'next/server';
import { isProtectedPath } from '@/features/auth/route-guards';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/log-game/import') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/log-game/import-single';
    return NextResponse.redirect(redirectUrl);
  }

  const response = await updateSupabaseSession(request);

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return response;
  }

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'));

  if (!hasSupabaseAuthCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
