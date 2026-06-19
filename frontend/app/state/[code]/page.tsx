import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { StateTabs } from "@/components/state/state-tabs"
import { GradeBadge } from "@/components/site/badges"
import { getState, billsForState, states } from "@/lib/data"
import { cn } from "@/lib/utils"

export function generateStaticParams() {
  return states.map((s) => ({ code: s.code.toLowerCase() }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const state = getState(code)
  if (!state) return { title: "State not found — Homeschool Compass" }
  return {
    title: `${state.name} Homeschool Regulations — Homeschool Compass`,
    description: state.summary,
  }
}

const LEVEL_COLOR: Record<string, string> = {
  "No Notice": "var(--safe)",
  "Low Regulation": "#16a34a",
  Moderate: "var(--amber)",
  High: "var(--reg-up)",
}

function restrictionChip(level: string): { label: string; tone: string } {
  if (level === "No Notice" || level === "Low Regulation") return { label: "Low Restriction", tone: "safe" }
  if (level === "Moderate") return { label: "Moderate Restriction", tone: "amber" }
  return { label: "High Restriction", tone: "red" }
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const state = getState(code)
  if (!state) notFound()

  const stateBills = billsForState(state.code)
  const increaseCount = stateBills.filter(b => b.impact === "increase").length
  const decreaseCount = stateBills.filter(b => b.impact === "decrease").length
  const esaBillCount = stateBills.filter(b => b.esaRelated).length

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
            <Breadcrumbs
              crumbs={[
                { label: "Scorecard", href: "/scorecard" },
                { label: state.code },
              ]}
            />

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <span className="font-mono text-4xl font-bold text-navy">
                  {state.code}
                </span>
                <div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-navy md:text-3xl">
                    {state.name}
                  </h1>
                  <span
                    className="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: LEVEL_COLOR[state.level] }}
                  >
                    {state.level}
                  </span>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.05em] text-meta">
                    Freedom score
                  </div>
                  <div className="font-mono text-3xl font-bold text-navy">
                    {state.score}
                    <span className="text-base text-meta">/100</span>
                  </div>
                </div>
                <GradeBadge grade={state.grade} className="h-12 min-w-12 text-xl" />
              </div>
            </div>

            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {state.summary}
            </p>

            {/* Restriction chips + bill counts */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {(() => {
                const chip = restrictionChip(state.level)
                return (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    chip.tone === "safe" && "border-safe/30 bg-safe/10 text-safe",
                    chip.tone === "amber" && "border-amber/30 bg-amber/10 text-amber",
                    chip.tone === "red" && "border-red-200 bg-red-50 text-red-700",
                  )}>
                    {chip.label}
                  </span>
                )
              })()}

              {increaseCount > 0 && (
                <Link
                  href={`#bills`}
                  className="inline-flex items-center gap-1 rounded-full border border-reg-up/20 bg-reg-up/5 px-3 py-1 text-xs font-medium text-reg-up transition-all hover:border-reg-up/40 hover:bg-reg-up/10"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  {increaseCount} bill{increaseCount !== 1 ? "s" : ""} increasing regulation
                </Link>
              )}

              {decreaseCount > 0 && (
                <Link
                  href={`#bills`}
                  className="inline-flex items-center gap-1 rounded-full border border-safe/20 bg-safe/5 px-3 py-1 text-xs font-medium text-safe transition-all hover:border-safe/40 hover:bg-safe/10"
                >
                  <ArrowDownRight className="h-3 w-3" />
                  {decreaseCount} bill{decreaseCount !== 1 ? "s" : ""} decreasing regulation
                </Link>
              )}

              {esaBillCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-navy/5 px-3 py-1 text-xs font-medium text-navy">
                  {esaBillCount} ESA-related bill{esaBillCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
          <StateTabs state={state} stateBills={stateBills} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
