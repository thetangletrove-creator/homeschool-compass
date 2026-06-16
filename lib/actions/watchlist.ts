"use server"

import { and, eq, sql } from "drizzle-orm"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { watchlist, bills } from "@/lib/db/schema"

/**
 * Server actions for the user's bill watchlist.
 *
 * Every action enforces user scoping via getUserId(). The watchlist
 * table has a unique constraint on (userId, billId) — duplicate adds
 * are silently ignored rather than throwing.
 */

export async function addToWatchlist(billId: string): Promise<void> {
  const userId = await getUserId()
  await db
    .insert(watchlist)
    .values({ userId, billId })
    .onConflictDoNothing()
}

export async function removeFromWatchlist(billId: string): Promise<void> {
  const userId = await getUserId()
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.billId, billId)))
}

/**
 * Returns all bills the user is tracking, with full bill data joined in.
 * Ordered by most recently added to watchlist.
 */
export async function getWatchlist() {
  const userId = await getUserId()
  const rows = await db
    .select({
      bill: {
        id: bills.id,
        stateCode: bills.stateCode,
        number: bills.number,
        title: bills.title,
        date: bills.date,
        statusStep: bills.statusStep,
        impact: bills.impact,
        impactSummary: bills.impactSummary,
        delta: bills.delta,
        actionRequired: bills.actionRequired,
        esaRelated: bills.esaRelated,
      },
      watchedAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(bills, eq(watchlist.billId, bills.id))
    .where(eq(watchlist.userId, userId))
    .orderBy(sql`${watchlist.createdAt} DESC`)

  return rows
}

/**
 * Quick check: is this bill on the user's watchlist?
 * Used by bill-card to show filled/empty star without fetching the full list.
 */
export async function isWatched(billId: string): Promise<boolean> {
  const userId = await getUserId()
  const row = await db
    .select({ id: watchlist.id })
    .from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.billId, billId)))
    .limit(1)

  return row.length > 0
}

/**
 * Returns just the count and bill IDs (no JOIN) for lightweight
 * badge display in the nav.
 */
export async function getWatchlistCount(): Promise<{ count: number; billIds: string[] }> {
  const userId = await getUserId()
  const rows = await db
    .select({ billId: watchlist.billId })
    .from(watchlist)
    .where(eq(watchlist.userId, userId))

  return {
    count: rows.length,
    billIds: rows.map((r: { billId: any }) => r.billId),
  }
}
