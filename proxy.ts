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
/** Public routes that don't require authentication. */
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/pricing',
  '/scorecard',
  '/esa',
  '/sign-in',
  '/sign-up',
  '/api/auth/',
  '/api/webhooks/',
  '/api/revalidate',
  '/api/bff/',
]

/** Dynamic route prefixes that are public. */
const PUBLIC_PREFIXES = ['/bill/', '/state/']

/**
 * Returns true when the path is public and should skip auth middleware.
 */
function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r)) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes pass through
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const auth = getAuth()
  if (!auth) {
    // Auth not configured — allow all access
    return NextResponse.next()
  }

  // Everything else (dashboard, account, api/me, api/checkout, api/portal) requires auth
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
