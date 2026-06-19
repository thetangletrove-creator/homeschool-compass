import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { states, bills } from "@/lib/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/app/states/[code]
 *
 * Returns full state detail for the iPad app:
 *   - Regulation score, grade, subscores
 *   - ESA programs (structured JSONB)
 *   - Non-ESA programs (structured JSONB)
 *   - Compliance forms (notification, assessment, immunization)
 *   - Current bills (tracked, latest first)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const code = (await params).code.toUpperCase()

    if (code.length !== 2) {
      return NextResponse.json(
        { error: "State code must be exactly 2 letters" },
        { status: 400 },
      )
    }

    const [state] = await db
      .select()
      .from(states)
      .where(eq(states.code, code))
      .limit(1)

    if (!state) {
      return NextResponse.json(
        { error: `State '${code}' not found` },
        { status: 404 },
      )
    }

    // Fetch recent bills for this state
    const stateBills = await db
      .select({
        id: bills.id,
        number: bills.number,
        title: bills.title,
        date: bills.date,
        statusStep: bills.statusStep,
        impact: bills.impact,
        impactSummary: bills.impactSummary,
        esaRelated: bills.esaRelated,
        effectiveDate: bills.effectiveDate,
        targetAudience: bills.targetAudience,
      })
      .from(bills)
      .where(eq(bills.stateCode, code))
      .orderBy(desc(bills.date))
      .limit(20)

    return NextResponse.json({
      code: state.code,
      name: state.name,
      score: state.score,
      subscores: state.subscores,
      level: state.level,
      esaActive: state.esaActive,
      esaPrograms: state.esaPrograms ?? [],
      nonEsaPrograms: state.nonEsaPrograms ?? [],
      complianceForms: state.complianceForms,
      bills: stateBills,
      updatedAt: state.updatedAt,
    })
  } catch (error) {
    console.error("[APP API] GET /api/app/states/[code] failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch state details" },
      { status: 500 },
    )
  }
}
