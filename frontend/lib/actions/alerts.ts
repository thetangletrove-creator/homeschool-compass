"use server"

import { eq, sql } from "drizzle-orm"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { alertPreferences } from "@/lib/db/schema"

/**
 * Server actions for alert preference configuration.
 *
 * Every action enforces user scoping via getUserId().
 * Preferences use a UPSERT pattern — first call creates defaults,
 * subsequent calls update in place.
 */

const DEFAULTS = {
  states: [] as string[],
  impactTypes: ["increase"] as string[],
  esaOnly: false,
  channelEmail: true,
  channelSms: false,
  weeklyDigest: true,
}

export type AlertPreferencesInput = Partial<{
  states: string[]
  impactTypes: string[]
  esaOnly: boolean
  channelEmail: boolean
  channelSms: boolean
  weeklyDigest: boolean
}>

export async function getAlertPreferences(): Promise<typeof DEFAULTS & { userId: string }> {
  const userId = await getUserId()
  const row = await db
    .select()
    .from(alertPreferences)
    .where(eq(alertPreferences.userId, userId))
    .limit(1)

  if (row.length === 0) {
    // First visit: insert defaults and return them
    await db.insert(alertPreferences).values({ userId, ...DEFAULTS })
    return { userId, ...DEFAULTS }
  }

  const prefs = row[0]
  return {
    userId: prefs.userId,
    states: prefs.states as string[],
    impactTypes: prefs.impactTypes as string[],
    esaOnly: prefs.esaOnly,
    channelEmail: prefs.channelEmail,
    channelSms: prefs.channelSms,
    weeklyDigest: prefs.weeklyDigest,
  }
}

export async function updateAlertPreferences(input: AlertPreferencesInput): Promise<void> {
  const userId = await getUserId()

  // Build the update payload — only set fields that were provided
  const updates: Record<string, unknown> = {
    updatedAt: sql`NOW()`,
  }

  if (input.states !== undefined) updates.states = input.states
  if (input.impactTypes !== undefined) updates.impactTypes = input.impactTypes
  if (input.esaOnly !== undefined) updates.esaOnly = input.esaOnly
  if (input.channelEmail !== undefined) updates.channelEmail = input.channelEmail
  if (input.channelSms !== undefined) updates.channelSms = input.channelSms
  if (input.weeklyDigest !== undefined) updates.weeklyDigest = input.weeklyDigest

  await db
    .insert(alertPreferences)
    .values({ userId, ...updates } as typeof alertPreferences.$inferInsert)
    .onConflictDoUpdate({
      target: alertPreferences.userId,
      set: updates as Record<string, unknown>,
    })
}
