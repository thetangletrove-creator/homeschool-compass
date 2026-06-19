import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { StateTabs } from "@/components/state/state-tabs"
import { GradeBadge } from "@/components/site/badges"
import { getState, billsForState, states } from "@/lib/data"

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
  if (!state) return { title: "State not found — Tangle Trove" }
  return {
    title: `${state.name} Homeschool Regulations — Tangle Trove`,
    description: state.summary,
  }
}

const LEVEL_COLOR: Record<string, string> = {
  "No Notice": "var(--safe)",
  "Low Regulation": "#16a34a",
  Moderate: "var(--amber)",
  High: "var(--reg-up)",
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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
            <Link
              href="/scorecard"
              className="inline-flex items-center gap-1.5 text-sm text-action hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Scorecard
            </Link>

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
