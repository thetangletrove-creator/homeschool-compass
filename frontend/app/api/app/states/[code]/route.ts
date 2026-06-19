import { db } from "@/lib/db/index"
import { states, bills } from "@/lib/db/schema"
import { eq, and, sql, desc } from "drizzle-orm"

/** Public endpoint — no auth, no session, no user data. */
export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 3600

/**
 * GET /api/app/states/[code]
 *
 * Returns the full state profile including grade, bills, ESA programs,
 * non-ESA programs, and compliance forms. No authentication required.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const stateCode = code.toUpperCase()

  // Validate state code exists
  const [stateRow] = await db
    .select()
    .from(states)
    .where(eq(states.code, stateCode))
    .limit(1)

  if (!stateRow) {
    return Response.json({ error: "State not found" }, { status: 404 })
  }

  // Fetch latest 50 bills for this state
  const stateBills = await db
    .select({
      number: bills.number,
      title: bills.title,
      status: bills.statusStep,
      impact: bills.impact,
      esaRelated: bills.esaRelated,
      effectiveDate: bills.effectiveDate,
      impactConfidence: bills.impactConfidence,
      analysis: bills.analysis,
    })
    .from(bills)
    .where(eq(bills.stateCode, stateCode))
    .orderBy(desc(bills.date))
    .limit(50)

  // Fetch bill counts by impact and ESA-related
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      enacted: sql<number>`count(*) filter (where ${bills.statusStep} >= 4)::int`,
      esaRelated: sql<number>`count(*) filter (where ${bills.esaRelated} = true)::int`,
    })
    .from(bills)
    .where(eq(bills.stateCode, stateCode))

  return Response.json(
    {
      code: stateRow.code,
      name: stateRow.name,
      grade: stateRow.level,
      score: stateRow.score,
      subscores: stateRow.subscores,
      esaStatus: stateRow.esaPrograms
        ? { active: true, name: stateRow.esaName }
        : { active: false },
      esaPrograms: stateRow.esaPrograms ?? [],
      nonEsaPrograms: stateRow.nonEsaPrograms ?? [],
      nonEsaVerifiedAt: stateRow.nonEsaVerifiedAt?.toISOString() ?? null,
      complianceForms: stateRow.complianceForms,
      bills: {
        total: counts?.total ?? 0,
        enacted: counts?.enacted ?? 0,
        esaRelated: counts?.esaRelated ?? 0,
        latest: stateBills,
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
