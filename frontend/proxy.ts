import { getAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Neon Auth proxy + CSP nonce (replaces middleware in Next.js 16).
 *
 * Handles three things:
 * 1. Session refresh — extends cookie lifetime on every request
 * 2. Route protection — redirects unauthenticated users away from
 *    /dashboard and /account
 * 3. CSP nonce generation — per-request nonce for inline script security
 *
 * When auth is unconfigured (missing env vars), the proxy is a
 * no-op for auth — all routes are accessible as if no auth exists.
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

  // ── CSP nonce ──────────────────────────────────────────────────────────
  // Generate a per-request nonce for Content Security Policy.
  // Must run before any HTML response is generated so the nonce is available
  // for inline scripts.
  const nonce = crypto.randomUUID().replace(/-/g, "")

  const csp = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com 'self'`,
    `style-src 'self' 'unsafe-inline'`,           // Tailwind injects inline styles
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.stripe.com`,
    `frame-src https://hooks.stripe.com https://js.stripe.com`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ")

  // ── Auth ───────────────────────────────────────────────────────────────
  // Public routes pass through
  if (isPublicPath(pathname)) {
    const response = NextResponse.next()
    response.headers.set("Content-Security-Policy", csp)
    response.headers.set("x-nonce", nonce)
    return response
  }

  // Protected routes need Neon Auth middleware
  const auth = getAuth()
  if (!auth) {
    // Auth not configured — allow all access with CSP
    const response = NextResponse.next()
    response.headers.set("Content-Security-Policy", csp)
    response.headers.set("x-nonce", nonce)
    return response
  }

  // Run the Neon Auth middleware, then augment with CSP header
  const authResponse = await auth.middleware({ loginUrl: '/sign-in' })(request)

  // If auth middleware returned a redirect (e.g., to sign-in), don't add CSP —
  // the redirect won't carry it, and that's fine.
  if (authResponse.status >= 300 && authResponse.status < 400) {
    return authResponse
  }

  authResponse.headers.set("Content-Security-Policy", csp)
  authResponse.headers.set("x-nonce", nonce)
  return authResponse
}

/**
 * Match paths that need auth + CSP protection.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|\\.well-known|images|manifest\\.webmanifest|icon|apple-icon).*)',
  ],
}
