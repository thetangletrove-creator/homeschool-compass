import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { appMagicLinks } from "@/lib/db/schema"
import { and, eq, gt } from "drizzle-orm"

export const runtime = "nodejs"

/**
 * Helper: Extract the Bearer token from the Authorization header
 * and validate it against the app_magic_links table.
 *
 * Returns the link record if valid, null if invalid/expired/not found.
 */
async function validateSession(request: Request) {
  const auth = request.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null

  const token = auth.slice(7)

  const [link] = await db
    .select()
    .from(appMagicLinks)
    .where(
      and(
        eq(appMagicLinks.token, token),
        eq(appMagicLinks.used, true),
        gt(appMagicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return link ?? null
}

/**
 * GET /api/app/auth/me
 *
 * Returns the current user's session info based on their Bearer token.
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { authenticated, email, stateCode, purchaseType }
 */
export async function GET(request: Request) {
  const session = await validateSession(request)

  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: "Invalid or expired session" },
      { status: 401 },
    )
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    stateCode: session.stateCode,
    purchaseType: session.purchaseType,
    activatedAt: session.usedAt?.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  })
}
