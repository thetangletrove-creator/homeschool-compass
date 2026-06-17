import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from "lucide-react"
import { getSession } from "@/lib/auth"
import { getWatchlist } from "@/lib/actions/watchlist"
import { getAlertPreferences } from "@/lib/actions/alerts"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { BillCard } from "@/components/site/bill-card"
import { ActionChecklist, type ChecklistItem } from "@/components/site/action-checklist"
import type { Bill } from "@/lib/data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Dashboard — Homeschool Compass",
  description: "Your personalized bill watchlist and alert preferences.",
}

function formatDate(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().split("T")[0]
  return d
}

function toBillShape(entry: {
  bill: {
    id: string
    stateCode: string
    number: string
    title: string
    date: Date | string
    statusStep: number
    impact: string
    impactSummary: string | null
    delta: string | null
    actionRequired: string | null
    esaRelated: boolean | null
    analysis?: unknown
    impactConfidence?: number | null
  }
  watchedAt: Date
}): Bill {
  const analysisRaw = entry.bill.analysis
  let analysisPoints: string[] = []
  if (analysisRaw && typeof analysisRaw === "object") {
    const obj = analysisRaw as Record<string, unknown>
    if (Array.isArray(obj.analysis_points)) {
      analysisPoints = obj.analysis_points as string[]
    }
  }

  return {
    id: entry.bill.id,
    stateCode: entry.bill.stateCode,
    number: entry.bill.number,
    title: entry.bill.title,
    date: formatDate(entry.bill.date),
    statusStep: entry.bill.statusStep,
    impact: entry.bill.impact as Bill["impact"],
    impactSummary: entry.bill.impactSummary ?? "",
    delta: entry.bill.delta ?? "",
    actionRequired: entry.bill.actionRequired ?? "",
    esaRelated: entry.bill.esaRelated ?? false,
    fullText: "",
    analysis: analysisPoints,
    impactConfidence: entry.bill.impactConfidence ?? undefined,
  }
}

type WatchlistEntry = {
  bill: {
    id: string
    stateCode: string
    number: string
    title: string
    date: Date | string
    statusStep: number
    impact: string
    impactSummary: string | null
    delta: string | null
    actionRequired: string | null
    esaRelated: boolean | null
    analysis?: unknown
    impactConfidence?: number | null
  }
  watchedAt: Date
}

function uniqueStates(watchlist: { bill: { stateCode: string } }[]): string[] {
  return [...new Set(watchlist.map((w) => w.bill.stateCode))]
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const [watchlist, prefs] = await Promise.all([
    getWatchlist(),
    getAlertPreferences(),
  ])

  const stateCount = uniqueStates(watchlist).length
  const watchingCount = watchlist.length

  // Derive impact stats from watchlist
  const increaseCount = watchlist.filter((w) => w.bill.impact === "increase").length
  const decreaseCount = watchlist.filter((w) => w.bill.impact === "decrease").length
  const esaCount = watchlist.filter((w) => w.bill.esaRelated).length

  // Build action checklist from watchlist bills with action_required
  const checklistItems: ChecklistItem[] = watchlist
    .filter((w) => w.bill.actionRequired && w.bill.actionRequired.length > 0)
    .filter((w) => w.bill.impact === "increase")
    .map((w) => ({
      id: w.bill.id,
      billTitle: w.bill.title,
      action: w.bill.actionRequired ?? "",
      deadline: null, // TODO: pull effective_date when added to watchlist query
      stateCode: w.bill.stateCode,
      billNumber: w.bill.number,
      impact: w.bill.impact as "increase" | "decrease" | "neutral",
      esaRelated: w.bill.esaRelated ?? false,
    }))

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Hero header */}
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-navy md:text-3xl">
              My Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Welcome back, {session.user.name ?? session.user.email}. Here&apos;s
              what&apos;s happening with the bills you&apos;re tracking.
            </p>
          </div>
        </section>

        {/* Quick summary + impact stats */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-6">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy">
                  {watchingCount}
                </span>
                <span className="text-muted-foreground">
                  {watchingCount === 1 ? "bill" : "bills"} watched
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy">{stateCount}</span>
                <span className="text-muted-foreground">
                  {stateCount === 1 ? "state" : "states"}
                </span>
              </div>

              {/* Impact stats chips */}
              {increaseCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-reg-up/20 bg-reg-up/5 px-2.5 py-1 text-xs font-medium text-reg-up">
                  <TrendingUp className="h-3 w-3" />
                  {increaseCount} increasing
                </span>
              )}
              {decreaseCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-safe/20 bg-safe/5 px-2.5 py-1 text-xs font-medium text-safe">
                  <TrendingDown className="h-3 w-3" />
                  {decreaseCount} decreasing
                </span>
              )}
              {esaCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy">
                  <ShieldCheck className="h-3 w-3" />
                  {esaCount} ESA
                </span>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-4">
                <Link
                  href="/settings"
                  className="text-sm font-medium text-action underline-offset-2 hover:underline"
                >
                  Configure alerts
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm font-medium text-action underline-offset-2 hover:underline"
                >
                  Upgrade plan
                </Link>
              </div>
            </div>

            {/* Alert preference summary */}
            {prefs.states.length > 0 || prefs.impactTypes.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {prefs.states.length > 0 && (
                  <span>
                    Alerting on {prefs.states.length}{" "}
                    {prefs.states.length === 1 ? "state" : "states"}
                  </span>
                )}
                {prefs.impactTypes.length > 0 && (
                  <span>
                    Impact: {prefs.impactTypes.join(", ")}
                  </span>
                )}
                {prefs.esaOnly && <span>ESA-related only</span>}
                {prefs.weeklyDigest && <span>Weekly digest on</span>}
              </div>
            ) : null}
          </div>
        </section>

        {/* Action checklist + Watchlist */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            {/* Two-column layout: checklist + watchlist */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Checklist sidebar */}
              <div className="lg:col-span-1">
                <ActionChecklist
                  items={checklistItems}
                  maxItems={8}
                  emptyMessage="No action items yet. Add bills to your watchlist to track deadlines and required actions."
                />
              </div>

              {/* Watchlist */}
              <div className="lg:col-span-2">
                <h2 className="font-heading text-xl font-bold tracking-tight text-navy">
                  My Watchlist
                </h2>
                {watchingCount === 0 ? (
                  <div className="mt-6 rounded-lg border border-dashed border-border bg-cream p-12 text-center">
                    <p className="text-base text-muted-foreground">
                      You aren&apos;t tracking any bills yet.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Browse the{" "}
                      <Link
                        href="/scorecard"
                        className="font-medium text-action hover:underline"
                      >
                        state scorecard
                      </Link>{" "}
                      to find bills that matter to you and add them to your
                      watchlist.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    {watchlist.map((entry: WatchlistEntry) => (
                      <BillCard
                        key={entry.bill.id}
                        bill={toBillShape(entry)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
