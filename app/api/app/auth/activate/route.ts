import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { appMagicLinks } from "@/lib/db/schema"
import { and, eq, gt } from "drizzle-orm"

export const runtime = "nodejs"

/**
 * POST /api/app/auth/activate
 *
 * Validates a magic link token and activates it.
 * Returns a session token the app stores securely.
 *
 * Body: { token: string }
 * Returns: { activated: true, email, stateCode, purchaseType, sessionToken }
 */
export async function POST(request: Request) {
  let body: { token: string; userId?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.token || typeof body.token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }

  // Find valid token
  const [link] = await db
    .select()
    .from(appMagicLinks)
    .where(
      and(
        eq(appMagicLinks.token, body.token),
        eq(appMagicLinks.used, false),
        gt(appMagicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!link) {
    return NextResponse.json(
      { error: "Magic link not found, already used, or expired." },
      { status: 404 },
    )
  }

  // Mark as used
  await db
    .update(appMagicLinks)
    .set({
      used: true,
      usedAt: new Date(),
      userId: body.userId ?? null,
    })
    .where(eq(appMagicLinks.id, link.id))

  // The token itself becomes the session token — the app stores it in Keychain
  // and sends it as Authorization: Bearer <token> on subsequent requests.
  return NextResponse.json({
    activated: true,
    email: link.email,
    stateCode: link.stateCode,
    purchaseType: link.purchaseType,
    sessionToken: link.token,
  })
}
