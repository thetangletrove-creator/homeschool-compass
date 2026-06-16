import "server-only"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive"
export type PlanTier = "tracker" | "esa" | null

export type SubscriptionInfo = {
  plan: PlanTier
  status: SubscriptionStatus
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"]

/**
 * Queries the subscriptions table for the current user.
 *
 * Returns the user's plan and status when they have an active or trialing
 * subscription. Returns null if the user has no subscription row, or if
 * their status is past_due, canceled, or inactive.
 */
export async function requireSubscription(): Promise<SubscriptionInfo | null> {
  const userId = await getUserId()

  const [sub] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  if (!sub) return null

  const plan = sub.plan as PlanTier
  const status = sub.status as SubscriptionStatus

  if (!ACTIVE_STATUSES.includes(status)) return null

  return { plan, status }
}

/**
 * Checks whether the current user can access a feature gated behind
 * `requiredPlan`.
 *
 * - "scorecard" → always allowed (free tier)
 * - "tracker"  → requires an active/trialing "tracker" or "esa" plan
 * - "esa"      → requires an active/trialing "esa" plan
 *
 * Returns true if the user has access, false otherwise.
 * Throws if the user is not authenticated.
 */
export async function canAccess(requiredPlan: "scorecard" | "tracker" | "esa"): Promise<boolean> {
  if (requiredPlan === "scorecard") return true

  const sub = await requireSubscription()
  if (!sub) return false

  if (requiredPlan === "tracker") {
    return sub.plan === "tracker" || sub.plan === "esa"
  }

  // requiredPlan === "esa"
  return sub.plan === "esa"
}
