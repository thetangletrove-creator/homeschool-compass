import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { appMagicLinks } from "@/lib/db/schema"
import { and, eq, gt } from "drizzle-orm"
import crypto from "crypto"
import { CONFIG } from "@/lib/config"

export const runtime = "nodejs"

/**
 * POST /api/app/auth/magic-link
 *
 * Generates a magic link for iPad app activation.
 * Called from the web after a user purchases a product ($29 kit, $99 Binder Plus, annual).
 *
 * Body: { email: string, stateCode?: string, purchaseType: string, stripeSessionId?: string, stripeCustomerId?: string }
 *
 * Returns: { token, url, expiresAt, email }
 */
export async function POST(request: Request) {
  let body: {
    email: string
    stateCode?: string
    purchaseType: string
    stripeSessionId?: string
    stripeCustomerId?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }
  if (!body.purchaseType || typeof body.purchaseType !== "string") {
    return NextResponse.json({ error: "purchaseType is required" }, { status: 400 })
  }

  const validTypes = ["compliance_kit", "binder_plus", "annual", "lifetime"]
  if (!validTypes.includes(body.purchaseType)) {
    return NextResponse.json(
      { error: `purchaseType must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    )
  }

  // Clean state code
  const stateCode = body.stateCode?.toUpperCase()
  if (stateCode && stateCode.length !== 2) {
    return NextResponse.json({ error: "stateCode must be a 2-letter code" }, { status: 400 })
  }

  // Generate token — 32 bytes hex = 64-char URL-safe token
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

  await db.insert(appMagicLinks).values({
    token,
    email: body.email.toLowerCase(),
    stateCode: stateCode ?? "*",
    purchaseType: body.purchaseType,
    stripeSessionId: body.stripeSessionId ?? null,
    stripeCustomerId: body.stripeCustomerId ?? null,
    expiresAt,
  })

  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : request.headers.get("origin") || "http://localhost:3000"

  // The app registers a custom URL scheme (e.g. homeschoolcompass://auth/activate)
  // that handles this deep link. The web fallback shows a confirmation page.
  const appUrl = `homeschoolcompass://auth/activate/${token}`
  const webUrl = `${domain}/app/activate/${token}`

  return NextResponse.json({
    token,
    appUrl,
    webUrl,
    expiresAt: expiresAt.toISOString(),
    email: body.email.toLowerCase(),
  })
}
