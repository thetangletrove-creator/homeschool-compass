import "server-only"
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server"

/**
 * Managed Neon Auth server instance.
 *
 * Neon Auth is provisioned on the connected database (the `neon_auth` schema).
 * Social providers (Google, Apple) and the email/magic-link provider are
 * configured in Neon's managed `project_config` — not here in app code. This
 * file only needs the base URL and the cookie-signing secret.
 *
 * `createNeonAuth` THROWS when the cookie secret is missing or shorter than 32
 * chars. To keep the app fully functional before secrets are added, we create
 * the instance lazily behind a guard. When unconfigured, the app simply behaves
 * as logged-out; once `NEON_AUTH_COOKIE_SECRET` is set, auth activates with no
 * code changes.
 */

const baseUrl = process.env.NEON_AUTH_BASE_URL
const secret = process.env.NEON_AUTH_COOKIE_SECRET

export function isAuthConfigured(): boolean {
  return Boolean(baseUrl && secret && secret.length >= 32)
}

let cached: NeonAuth | null = null

export function getAuth(): NeonAuth | null {
  if (!isAuthConfigured()) return null
  if (cached) return cached
  cached = createNeonAuth({
    baseUrl: baseUrl!,
    cookies: {
      secret: secret!,
      // The v0 preview renders the app inside a cross-site iframe. In dev we
      // need SameSite=None (Secure is applied automatically) or the browser
      // silently drops the session cookie.
      sameSite: process.env.NODE_ENV === "development" ? "none" : "lax",
    },
  })
  return cached
}

export type SessionUser = {
  id: string
  email: string
  name: string
  image?: string | null
  emailVerified: boolean
}

/**
 * Safe session read for Server Components / Server Actions.
 * Returns null when auth is unconfigured or the lookup fails — never throws,
 * so pages render normally in dormant mode.
 */
export async function getSession(): Promise<{ user: SessionUser } | null> {
  const auth = getAuth()
  if (!auth) return null
  try {
    const { data } = await auth.getSession()
    if (!data?.user) return null
    return { user: data.user as SessionUser }
  } catch (error) {
    console.log("[v0] Neon Auth getSession failed:", (error as Error).message)
    return null
  }
}

export async function getUserId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  return session.user.id
}
