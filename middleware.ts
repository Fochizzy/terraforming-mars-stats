import { type NextRequest, NextResponse } from 'next/server';
import { isProtectedPath } from '@/features/auth/route-guards';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return response;
  }

  if (user) {
    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
