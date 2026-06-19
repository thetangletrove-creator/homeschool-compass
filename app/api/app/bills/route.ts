import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { bills } from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/app/bills?state=CA&limit=10&esaOnly=true
 *
 * Returns bills, optionally filtered by state and ESA relevance.
 * Designed for the iPad app's bill tracking and watchlist views.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stateCode = searchParams.get("state")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)
    const esaOnly = searchParams.get("esaOnly") === "true"
    const impact = searchParams.get("impact") // increase | decrease | neutral

    // Build filters
    const filters: ReturnType<typeof eq>[] = []

    if (stateCode && stateCode.length === 2) {
      filters.push(eq(bills.stateCode, stateCode.toUpperCase()))
    }
    if (esaOnly) {
      filters.push(eq(bills.esaRelated, true))
    }

    const query = db
      .select({
        id: bills.id,
        stateCode: bills.stateCode,
        number: bills.number,
        title: bills.title,
        date: bills.date,
        statusStep: bills.statusStep,
        impact: bills.impact,
        impactSummary: bills.impactSummary,
        delta: bills.delta,
        actionRequired: bills.actionRequired,
        esaRelated: bills.esaRelated,
        impactConfidence: bills.impactConfidence,
        effectiveDate: bills.effectiveDate,
        targetAudience: bills.targetAudience,
      })
      .from(bills)
      .orderBy(desc(bills.date))
      .limit(limit)

    // Apply filters if any exist
    let result
    if (filters.length > 0) {
      result = await query.where(and(...filters))
    } else {
      result = await query
    }

    return NextResponse.json({
      count: result.length,
      bills: result,
    })
  } catch (error) {
    console.error("[APP API] GET /api/app/bills failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 },
    )
  }
}
