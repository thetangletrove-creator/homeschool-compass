"use client"

import { createAuthClient } from "@neondatabase/auth/next"

/**
 * Managed Neon Auth browser client.
 *
 * Exposes the Better Auth client surface:
 *  - useSession()
 *  - signIn.email / signIn.social / signIn.magicLink
 *  - signUp.email
 *  - signOut
 *
 * The client talks to our /api/auth/[...all] route, which proxies to the
 * managed Neon Auth instance.
 */
export const authClient = createAuthClient()

export const { useSession, signIn, signUp, signOut } = authClient
