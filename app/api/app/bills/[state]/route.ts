import { db } from "@/lib/db/index"
import { bills } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"

/** Public endpoint — no auth, no session, no user data. */
export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 3600

/**
 * GET /api/app/bills/[state]
 *
 * Returns all bills for a given state, paginated. No authentication required.
 * Query params: ?cursor=<bill_id>&limit=50
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params
  const stateCode = state.toUpperCase()

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100)
  const cursor = url.searchParams.get("cursor")

  const query = db
    .select({
      id: bills.id,
      number: bills.number,
      title: bills.title,
      status: bills.statusStep,
      date: bills.date,
      impact: bills.impact,
      impactSummary: bills.impactSummary,
      delta: bills.delta,
      actionRequired: bills.actionRequired,
      esaRelated: bills.esaRelated,
      esaRelatedConfidence: bills.esaRelatedConfidence,
      impactConfidence: bills.impactConfidence,
      effectiveDate: bills.effectiveDate,
      url: bills.analysis,
      summary: bills.impactSummary,
    })
    .from(bills)
    .where(eq(bills.stateCode, stateCode))
    .orderBy(desc(bills.date))
    .limit(limit)

  const rows = await query

  // Get total count for this state
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bills)
    .where(eq(bills.stateCode, stateCode))

  return Response.json(
    {
      state: stateCode,
      total: count,
      bills: rows.map((r) => ({
        id: r.id,
        number: r.number,
        title: r.title,
        status: r.status,
        date: r.date?.toISOString() ?? null,
        impact: r.impact,
        impactSummary: r.impactSummary,
        delta: r.delta,
        actionRequired: r.actionRequired,
        esaRelated: r.esaRelated,
        esaRelatedConfidence: r.esaRelatedConfidence,
        impactConfidence: r.impactConfidence,
        effectiveDate: r.effectiveDate,
      })),
      pagination: {
        limit,
        hasMore: rows.length === limit,
        nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    }
  )
}
