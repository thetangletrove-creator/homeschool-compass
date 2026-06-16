import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db/index"
import { alertPreferences } from "@/lib/db/schema"

/**
 * BFF endpoint for the Python sync pipeline to query and acknowledge
 * user alert preferences.
 *
 * GET  /api/bff/alerts  — returns all users with active alert preferences
 * POST /api/bff/alerts  — acknowledges delivery of a batch of alerts
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

// ── Handlers ────────────────────────────────────────────────────────────

export const runtime = "nodejs"

/**
 * GET /api/bff/alerts
 *
 * Returns all users with alert preferences for the Python sync pipeline.
 * Each entry includes userId, monitored states, impact types, ESA filter,
 * and channel preferences.
 */
export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db
    .select({
      userId: alertPreferences.userId,
      states: alertPreferences.states,
      impactTypes: alertPreferences.impactTypes,
      esaOnly: alertPreferences.esaOnly,
      channelEmail: alertPreferences.channelEmail,
      channelSms: alertPreferences.channelSms,
      weeklyDigest: alertPreferences.weeklyDigest,
    })
    .from(alertPreferences)

  return Response.json(rows)
}

/**
 * POST /api/bff/alerts
 *
 * Called by the Python pipeline after sending a batch of alerts.
 * Accepts { userIds: string[] } to acknowledge delivery.
 * Currently a no-op placeholder — always returns { acknowledged: true }.
 */
export async function POST(request: Request) {
  if (!verifyAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse body (acknowledged regardless of content for now)
  try {
    await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  return Response.json({ acknowledged: true })
}
