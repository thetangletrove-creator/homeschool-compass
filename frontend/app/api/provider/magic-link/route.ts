import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { invoiceMagicLinks } from "@/lib/db/schema"
import { eq, and, gt, sql } from "drizzle-orm"
import crypto from "crypto"

export const runtime = "nodejs"

/**
 * POST /api/provider/magic-link
 *
 * Generates a single-use magic link for a provider.
 * Called by the parent from their dashboard.
 *
 * Body: { studentName: string, stateCode: string, publicKey?: string }
 *   - publicKey: hex-encoded RSA-2048 SPKI public key, appended as a URL
 *     hash fragment (#). The fragment is never sent to the server in the
 *     HTTP request — the provider's browser reads it client-side via
 *     window.location.hash to encrypt their profile under the parent's key.
 *
 * Returns: { token, url, expiresAt }
 */
export async function POST(request: Request) {
  let parentId: string
  try {
    parentId = await getUserId()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { studentName?: string; stateCode?: string; publicKey?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { studentName, stateCode, publicKey } = body

  if (!studentName || typeof studentName !== "string") {
    return NextResponse.json({ error: "studentName is required" }, { status: 400 })
  }
  if (!stateCode || typeof stateCode !== "string" || stateCode.length !== 2) {
    return NextResponse.json({ error: "stateCode is required (2-letter code)" }, { status: 400 })
  }

  // Rate limit: max 5 unexpired tokens per parent
  const [countResult] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invoiceMagicLinks)
    .where(
      and(
        eq(invoiceMagicLinks.parentId, parentId),
        eq(invoiceMagicLinks.used, false),
        gt(invoiceMagicLinks.expiresAt, new Date()),
      ),
    )

  const existing = Number(countResult?.c ?? 0)

  if (existing >= 5) {
    return NextResponse.json(
      { error: "You have 5 active magic links. Use or delete old ones before creating more." },
      { status: 429 },
    )
  }

  // Generate token
  const token = crypto.randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(invoiceMagicLinks).values({
    token,
    parentId,
    studentName,
    stateCode,
    expiresAt,
  })

  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : request.headers.get("origin") || "http://localhost:3000"

  // Build URL — if a public key was provided, append it as a hash fragment.
  // The # fragment is never sent to the server — the provider's browser
  // reads it client-side via window.location.hash for ZK encryption.
  const baseUrl = `${domain}/provider/${token}`
  const url = publicKey ? `${baseUrl}#pubkey=${publicKey}` : baseUrl

  return NextResponse.json({
    token,
    url,
    expiresAt: expiresAt.toISOString(),
  })
}
