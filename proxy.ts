import { getAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Neon Auth proxy (replaces middleware in Next.js 16).
 *
 * Handles two things:
 * 1. Session refresh — extends cookie lifetime on every request
 * 2. Route protection — redirects unauthenticated users away from
 *    /dashboard and /account (configurable via loginUrl)
 *
 * When auth is unconfigured (missing env vars), the proxy is a
 * no-op — all routes are accessible as if no auth exists.
 */
export async function proxy(request: NextRequest) {
  // Skip auth routes themselves — the API handler manages auth state
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Skip sign-in and sign-up pages (the redirect target)
  if (
    request.nextUrl.pathname.startsWith('/sign-in') ||
    request.nextUrl.pathname.startsWith('/sign-up')
  ) {
    return NextResponse.next()
  }

  // Skip static assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon') ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/about')
  ) {
    return NextResponse.next()
  }

  const auth = getAuth()
  if (!auth) {
    // Auth not configured — allow all access
    return NextResponse.next()
  }

  // Use the built-in middleware handler for route protection + session refresh
  return auth.middleware({ loginUrl: '/sign-in' })(request)
}

/**
 * Match paths that need auth protection.
 * Only /dashboard and /account require authentication.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known (security verification)
     * - images, manifest, icons
     */
    '/((?!_next/static|_next/image|favicon\\.ico|\\.well-known|images|manifest\\.webmanifest|icon|apple-icon).*)',
  ],
}
