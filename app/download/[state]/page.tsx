import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db/index"
import { states, bills } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import Stripe from "stripe"
import { KitDownloadClient } from "@/components/site/kit-download-client"

export const metadata: Metadata = {
  title: "Download Your Compliance Kit — Homeschool Compass",
  description: "Your annual homeschool compliance kit is ready.",
}

// Lazy Stripe init (only when this page is hit)
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(key, { apiVersion: "2025-06-16.acacia" } as any)
}

const STATUS_LABELS: Record<number, string> = {
  0: "Introduced", 1: "Engrossed", 2: "Enrolled", 3: "Passed",
  4: "Failed", 5: "Vetoed", 6: "Chaptered", 7: "Signed",
  8: "Carryover", 9: "Died",
}

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { state: rawCode } = await params
  const code = rawCode.toUpperCase()
  const { session_id } = await searchParams

  // Validate session
  if (!session_id) {
    redirect("/compliance-kit?error=no_session")
  }

  const stripe = getStripe()
  if (!stripe) {
    return <div className="p-8 text-center text-red-500">Payment verification unavailable. Try again later.</div>
  }

  // Verify payment
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-navy">Verification Error</h1>
        <p className="mt-2 text-muted-foreground">Could not verify your payment. Contact support if you were charged.</p>
      </div>
    )
  }

  if (session.payment_status !== "paid") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-navy">Payment Incomplete</h1>
        <p className="mt-2 text-muted-foreground">Your payment has not been completed yet. Please complete the checkout process.</p>
      </div>
    )
  }

  // Fetch state data
  const state = await db.select().from(states).where(eq(states.code, code)).limit(1).then((r) => r[0])
  if (!state) notFound()

  // Fetch bills for this state
  const allBills = await db
    .select()
    .from(bills)
    .where(eq(bills.stateCode, code))
    .orderBy(sql`CASE 
      WHEN ${bills.statusStep} >= 6 THEN 0
      WHEN ${bills.statusStep} >= 3 THEN 1
      ELSE 2
    END, ${bills.impactConfidence} DESC NULLS LAST`)
    .limit(30)

  // Compute stats
  const totalBills = allBills.length
  const enactedBills = allBills.filter((b) => b.statusStep >= 6).length
  const esaBills = allBills.filter((b) => b.esaRelated).length
  const increaseBills = allBills.filter((b) => b.impact === "increase").length
  const decreaseBills = allBills.filter((b) => b.impact === "decrease").length

  // Grade
  const score = state.score
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"

  // Confidence averages (from bills)
  const confs = allBills.filter((b) => b.impactConfidence != null)
  const avgConf = confs.length > 0
    ? confs.reduce((s, b) => s + (b.impactConfidence as number), 0) / confs.length
    : 0.83

  return (
    <KitDownloadClient
      state={state}
      code={code}
      grade={grade}
      avgConf={avgConf}
      bills={allBills}
      totalBills={totalBills}
      enactedBills={enactedBills}
      esaBills={esaBills}
      increaseBills={increaseBills}
      decreaseBills={decreaseBills}
      statusLabels={STATUS_LABELS}
    />
  )
}
