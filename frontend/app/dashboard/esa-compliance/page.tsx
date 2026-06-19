import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { getSession } from "@/lib/auth"
import { getWatchlist } from "@/lib/actions/watchlist"
import { getAlertPreferences } from "@/lib/actions/alerts"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { getState } from "@/lib/data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "ESA Compliance — Homeschool Compass",
  description:
    "Your personal Education Savings Account compliance dashboard: deadlines, eligibility, and tracking.",
}

type WatchlistBill = {
  id: string
  stateCode: string
  billNumber: string
  title: string
  impact: string
  esaRelated: boolean | null
  actionRequired: string | null
}

function groupByState(bills: WatchlistBill[]): Record<string, WatchlistBill[]> {
  const groups: Record<string, WatchlistBill[]> = {}
  for (const b of bills) {
    if (!groups[b.stateCode]) groups[b.stateCode] = []
    groups[b.stateCode].push(b)
  }
  return groups
}

function daysUntil(deadline: string): number | null {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function EsaCompliancePage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const [watchlist, prefs] = await Promise.all([getWatchlist(), getAlertPreferences()])

  // Filter to ESA-related bills from watchlist
  const watchlistRows = watchlist as unknown as Array<{
    bill: {
      id: string
      stateCode: string
      number: string
      title: string
      impact: string
      esaRelated: boolean | null
      actionRequired: string | null
    }
  }>

  const esaBills = watchlistRows
    .filter((w) => w.bill.esaRelated)
    .map((w) => ({
      id: w.bill.id,
      stateCode: w.bill.stateCode,
      billNumber: w.bill.number,
      title: w.bill.title,
      impact: w.bill.impact,
      esaRelated: w.bill.esaRelated,
      actionRequired: w.bill.actionRequired,
    }))

  // Tracked states with ESA programs from alert preferences
  const trackedStates = prefs.states
    .map((code: string) => {
      const state = getState(code.toUpperCase())
      return state && state.esa.active
        ? { code: state.code, name: state.name, esa: state.esa }
        : null
    })
    .filter(Boolean) as Array<{
    code: string
    name: string
    esa: { name?: string; maxAward?: string; deadline?: string; eligibility?: string; documentation?: string[] }
  }>

  const byState = groupByState(esaBills)

  // Collect urgent deadlines
  const allDeadlines: Array<{ state: string; date: string; label: string }> = []
  for (const s of trackedStates) {
    if (s.esa.deadline && s.esa.deadline !== "Rolling") {
      allDeadlines.push({ state: s.code, date: s.esa.deadline, label: `${s.name} ${s.esa.name}` })
    }
  }
  allDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Count active ESA changes
  const increaseCount = esaBills.filter((b) => b.impact === "increase").length
  const decreaseCount = esaBills.filter((b) => b.impact === "decrease").length

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-meta">
              <ShieldCheck className="h-3.5 w-3.5" />
              ESA Compliance Dashboard
              <span className="rounded-full bg-safe/10 px-2 py-0.5 text-[10px] text-safe">
                $99/yr Feature
              </span>
            </div>
            <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-navy md:text-3xl">
              Your ESA Compliance Status
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Track Education Savings Account programs across your monitored
              states. Stay on top of deadlines, eligibility changes, and
              legislative activity.
            </p>
          </div>
        </section>

        {/* Summary stat cards */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  Tracked ESA states
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-navy">
                  {trackedStates.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  ESA bills tracked
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-navy">
                  {esaBills.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  Upcoming deadlines
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-amber">
                  {allDeadlines.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  ESA bills changing
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-reg-up">
                  {increaseCount + decreaseCount}
                </p>
              </div>
            </div>

            {/* Impact chips */}
            {(increaseCount > 0 || decreaseCount > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {increaseCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-reg-up/20 bg-reg-up/5 px-3 py-1 text-xs font-medium text-reg-up">
                    <ArrowUpRight className="h-3 w-3" />
                    {increaseCount} increasing regulation
                  </span>
                )}
                {decreaseCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-safe/20 bg-safe/5 px-3 py-1 text-xs font-medium text-safe">
                    <ArrowDownRight className="h-3 w-3" />
                    {decreaseCount} decreasing regulation
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            {/* Upcoming deadlines */}
            {allDeadlines.length > 0 && (
              <div className="mb-10">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-navy">
                  <Calendar className="h-5 w-5 text-amber" />
                  Upcoming Deadlines
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {allDeadlines.slice(0, 6).map((d) => {
                    const days = daysUntil(d.date)
                    return (
                      <div
                        key={`${d.state}-${d.date}`}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-navy">
                            {d.state}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              days !== null && days <= 30
                                ? "bg-red-50 text-red-600"
                                : days !== null && days <= 90
                                  ? "bg-amber/10 text-amber"
                                  : "bg-safe/10 text-safe",
                            )}
                          >
                            {days !== null
                              ? days <= 0
                                ? "Overdue"
                                : `${days} days`
                              : d.date}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {d.label}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {d.date}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ESA states overview */}
            <div className="mb-10">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-navy">
                <ShieldCheck className="h-5 w-5 text-safe" />
                Tracked ESA Programs
              </h2>

              {trackedStates.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-border bg-cream p-12 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-meta" />
                  <p className="mt-3 font-heading text-lg font-semibold text-navy">
                    No ESA states tracked
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure your{" "}
                    <Link
                      href="/settings"
                      className="font-medium text-action hover:underline"
                    >
                      alert preferences
                    </Link>{" "}
                    to monitor states with active ESA programs.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {trackedStates.map((s) => (
                    <div
                      key={s.code}
                      className="rounded-lg border border-border bg-card p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-navy">
                            {s.code}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {s.name}
                          </span>
                        </div>
                        <span className="rounded-full bg-safe/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-safe">
                          Active
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-foreground">
                        {s.esa.name}
                      </h3>

                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5 shrink-0 text-safe" />
                          <span className="text-muted-foreground">
                            Up to{" "}
                            <span className="font-mono font-medium text-foreground">
                              {s.esa.maxAward}
                            </span>
                          </span>
                        </div>
                        {s.esa.deadline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-amber" />
                            <span className="text-muted-foreground">
                              Due:{" "}
                              <span className="font-mono font-medium text-foreground">
                                {s.esa.deadline}
                              </span>
                            </span>
                          </div>
                        )}
                      </dl>

                      {/* Related bills */}
                      {byState[s.code] && byState[s.code].length > 0 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-meta">
                            Related bills
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {byState[s.code].slice(0, 3).map((b) => (
                              <Link
                                key={b.id}
                                href={`/bill/${b.id}`}
                                className="flex items-center gap-1.5 text-xs text-action hover:underline"
                              >
                                <span className="font-mono">{b.billNumber}</span>
                                <span className="truncate">{b.title}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        href={`/state/${s.code.toLowerCase()}`}
                        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-action hover:underline"
                      >
                        View state requirements
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing state setup prompt */}
            {trackedStates.length === 0 && prefs.states.length > 0 && (
              <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
                  <div>
                    <p className="text-sm font-medium text-amber">
                      No ESA programs in your tracked states
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You&apos;re monitoring {prefs.states.length}{" "}
                      {prefs.states.length === 1 ? "state" : "states"}, but none
                      have an active ESA program. Add states with ESA programs
                      in your{" "}
                      <Link
                        href="/settings"
                        className="font-medium text-action hover:underline"
                      >
                        alert preferences
                      </Link>{" "}
                      to unlock this dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Help text */}
            <p className="mt-10 text-xs leading-relaxed text-meta">
              Program details are illustrative. ESA rules change frequently —
              verify award amounts and deadlines with your state administrator.
              This is not legal or financial advice.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
