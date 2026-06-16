import { revalidatePath } from "next/cache"
import { timingSafeEqual } from "crypto"
import { CONFIG } from "@/lib/config"

/**
 * Revalidation endpoint for the Python sync pipeline.
 *
 * Pipeline POSTs with Authorization: Bearer <REVALIDATION_SECRET> after
 * upserting new bill data. This endpoint revalidates the ISR cache for all
 * pages that display pipeline-fed data.
 *
 * Security:
 * - Timing-safe secret comparison (prevents timing side-channel)
 * - Rate-limited to REVALIDATE_RPM req/min (default 5)
 * - No query-param secrets (Only-Authorization-Header Invariant)
 */

// ── Rate limiter ──────────────────────────────────────────────────────
// In-memory, resets every 60s. Serverless: resets on cold start.
// Good enough for the 5 req/min limit. If you need cross-instance limits,
// swap this for Redis or a pipeline_metadata row.

const WINDOW_MS = 60_000
interface Counter {
  count: number
  resetAt: number
}
const store: Map<string, Counter> = new Map()

function rateLimit(key: string, max: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// ── Timing-safe comparison ────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  // length check prevents leaking length via timing
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// ── Handler ───────────────────────────────────────────────────────────

export const runtime = "nodejs"

export async function POST(request: Request) {
  // 1. Extract and verify the secret
  const authHeader = request.headers.get("authorization")?.replace("Bearer ", "")
  const secret = process.env.REVALIDATION_SECRET

  if (!secret || !authHeader || !safeCompare(authHeader, secret)) {
    // Deliberately identical error shape whether secret is missing or wrong
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Rate limit
  if (!rateLimit("revalidate", CONFIG.REVALIDATE_RPM)) {
    return Response.json(
      { error: `Rate limit exceeded (${CONFIG.REVALIDATE_RPM} req/min)` },
      { status: 429 },
    )
  }

  // 3. Revalidate ISR cache for all pipeline-fed pages
  const paths = [
    "/",
    "/scorecard",
    "/esa",
    "/dashboard",
    "/state/[code]",
    "/bill/[id]",
  ]

  const results: { path: string; ok: boolean; error?: string }[] = []

  for (const path of paths) {
    try {
      revalidatePath(path, "page")
      results.push({ path, ok: true })
    } catch (err) {
      results.push({ path, ok: false, error: (err as Error).message })
    }
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    return Response.json(
      {
        revalidated: results.filter((r) => r.ok).map((r) => r.path),
        failed,
        partial: true,
      },
      { status: 207 },
    )
  }

  // 4. Also revalidate the layout so data-freshness footer updates
  revalidatePath("/", "layout")

  return Response.json({
    revalidated: paths,
    ok: true,
  })
}
