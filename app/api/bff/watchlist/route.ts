import { timingSafeEqual } from "crypto"
import { sql, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { watchlist } from "@/lib/db/schema"

/**
 * BFF endpoint for the Python sync pipeline to query watchlist entries.
 *
 * GET /api/bff/watchlist       — returns all watchlist entries grouped by user
 * GET /api/bff/watchlist?userId=xxx — returns one user's watchlist bill IDs
 *
 * Auth: Bearer token matching REVALIDATION_SECRET (same as /api/revalidate).
 */

// ── Timing-safe comparison ──────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// ── Auth guard ──────────────────────────────────────────────────────────

function verifyAuth(request: Request): boolean {
  const authHeader = request.headers
    .get("authorization")
    ?.replace("Bearer ", "")
  const secret = process.env.REVALIDATION_SECRET
  if (!secret || !authHeader) return false
  return safeCompare(authHeader, secret)
}

// ── Handler ────────────────────────────────────────────────────────────

export const runtime = "nodejs"

export async function GET(request: Request) {
  // 1. Auth
  if (!verifyAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse query params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  // 3. Query — grouped by user or filtered by specific user
  if (userId) {
    // Single user: return array of bill IDs
    const rows: { billId: string }[] = await db
      .select({ billId: watchlist.billId })
      .from(watchlist)
      .where(eq(watchlist.userId, userId))

    const bills = rows.map((r) => r.billId)
    return Response.json({ userId, bills })
  }

  // All users: grouped query using json_agg
  const rows = await db
    .select({
      userId: watchlist.userId,
      bills: sql<string[]>`json_agg(${watchlist.billId})`,
    })
    .from(watchlist)
    .groupBy(watchlist.userId)

  return Response.json(rows)
}
