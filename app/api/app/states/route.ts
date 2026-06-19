import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { states } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/app/states
 *
 * Returns a lightweight list of all states with their regulation scores,
 * grades, and whether they have active ESA/non-ESA programs.
 * Designed for the iPad app's state browser view.
 */
export async function GET() {
  try {
    const allStates = await db
      .select({
        code: states.code,
        name: states.name,
        score: states.score,
        subscores: states.subscores,
        level: states.level,
        esaActive: states.esaActive,
        esaName: states.esaName,
        esaMaxAward: states.esaMaxAward,
        hasEsaPrograms: states.esaPrograms,
        hasNonEsaPrograms: states.nonEsaPrograms,
        updatedAt: states.updatedAt,
      })
      .from(states)
      .orderBy(states.name)

    const result = allStates.map((s) => ({
      code: s.code,
      name: s.name,
      score: s.score,
      subscores: s.subscores,
      level: s.level,
      esaActive: s.esaActive,
      esaName: s.esaName,
      esaMaxAward: s.esaMaxAward,
      esaProgramCount: Array.isArray(s.hasEsaPrograms) ? s.hasEsaPrograms.length : 0,
      nonEsaProgramCount: Array.isArray(s.hasNonEsaPrograms) ? s.hasNonEsaPrograms.length : 0,
    }))

    return NextResponse.json({
      count: result.length,
      states: result,
    })
  } catch (error) {
    console.error("[APP API] GET /api/app/states failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 },
    )
  }
}
