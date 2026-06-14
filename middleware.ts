import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Routes that require an authenticated session. Anything matched by the config
 * below is guarded; unauthenticated visitors are bounced to /login with a
 * `redirect` param so they land back where they intended after signing in.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('redirect', pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/book/:path*', '/booking-success/:path*'],
};
