import { getAuth } from "@/lib/auth"

/**
 * Mounts the managed Neon Auth HTTP handler. The client (createAuthClient)
 * routes to /api/auth/<endpoint>, so the catch-all segment MUST be [...all].
 *
 * We resolve the handler per-request behind getAuth() so the route does not
 * throw at module load when NEON_AUTH_COOKIE_SECRET is not yet set. When auth
 * is unconfigured, every auth request returns 503.
 */

type RouteContext = { params: Promise<{ all: string[] }> }

function notConfigured() {
  return Response.json(
    {
      error: "Auth not configured",
      message:
        "Set NEON_AUTH_COOKIE_SECRET (and NEON_AUTH_BASE_URL) to enable authentication.",
    },
    { status: 503 },
  )
}

async function handle(
  method: "GET" | "POST",
  request: Request,
  context: RouteContext,
) {
  const auth = getAuth()
  if (!auth) return notConfigured()
  const handler = auth.handler()
  // Neon Auth's handler expects { params: Promise<{ path: string[] }> }.
  const { all } = await context.params
  return handler[method](request, { params: Promise.resolve({ path: all }) })
}

export function GET(request: Request, context: RouteContext) {
  return handle("GET", request, context)
}

export function POST(request: Request, context: RouteContext) {
  return handle("POST", request, context)
}
