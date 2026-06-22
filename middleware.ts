import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth gate for protected areas. Runs on the Edge runtime, which can't load
 * firebase-admin to verify the session cookie — so middleware only checks that a
 * session cookie is PRESENT (fast bounce for logged-out visitors). Full
 * verification + role-based access control happen server-side in the pages/route
 * handlers:
 *   - /admin/*    → requireAdmin() (re-reads role from Postgres)
 *   - /provider/* → provider-profile check in the page
 *   - getSession() returns null for an invalid/expired cookie, so the page then
 *     redirects to /login anyway.
 */
const SESSION_COOKIE = 'session';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/provider/:path*',
    '/admin/:path*',
    '/book/:path*',
    '/onboarding/:path*',
  ],
};
