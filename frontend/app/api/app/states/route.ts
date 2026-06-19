import { db } from "@/lib/db/index"
import { states } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

/** Public endpoint — no auth, no session, no user data. */
export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 3600 // CDN cache: 1 hour

/**
 * GET /api/app/states
 *
 * Returns all 52 states with summary data. No authentication required.
 * This is public data — no user information leaves the device.
 */
export async function GET() {
  const rows = await db
    .select({
      code: states.code,
      name: states.name,
      grade: states.level,
      score: states.score,
      esaActive: states.esaActive,
      esaName: states.esaName,
      hasNonEsa: sql<boolean>`non_esa_programs IS NOT NULL AND non_esa_programs != '[]'::jsonb`,
      nonEsaPrograms: states.nonEsaPrograms,
      nonEsaVerifiedAt: states.nonEsaVerifiedAt,
    })
    .from(states)
    .orderBy(states.code)

  const result = rows.map((r) => ({
    code: r.code,
    name: r.name,
    grade: r.grade,
    score: r.score,
    esaStatus: r.esaActive ? "active" : "none",
    esaName: r.esaName,
    hasEsa: r.esaActive,
    hasNonEsa: r.hasNonEsa,
    nonEsaPrograms: r.nonEsaPrograms ?? [],
    nonEsaVerifiedAt: r.nonEsaVerifiedAt?.toISOString() ?? null,
  }))

  return Response.json(result, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
