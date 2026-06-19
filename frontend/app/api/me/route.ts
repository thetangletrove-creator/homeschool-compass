import { getSession } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { watchlist, subscriptions } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

/**
 * GET /api/me
 *
 * Returns the authenticated user's profile, watchlist count, and
 * subscription in a single request. Returns 401 when not authenticated.
 *
 * This endpoint exists so clients can hydrate user state without
 * waterfalling through /api/auth/session → separate watchlist/subscription
 * queries.
 */
export const runtime = "nodejs"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(watchlist)
    .where(eq(watchlist.userId, userId))

  const [sub] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  return Response.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    watchlistCount: count,
    subscription: sub?.plan && sub?.status ? { plan: sub.plan, status: sub.status } : null,
  })
}
