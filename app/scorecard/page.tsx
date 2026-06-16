import type { Metadata } from "next"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { ScorecardGrid } from "@/components/scorecard/scorecard-grid"
import { states } from "@/lib/data"

export const metadata: Metadata = {
  title: "2026 Homeschool Freedom Scorecard — Homeschool Compass",
  description:
    "Rankings for all 50 states on regulation burden, testing mandates, curriculum freedom, and teacher qualification requirements.",
}

export default function ScorecardPage() {
  const avg = Math.round(
    states.reduce((sum, s) => sum + s.score, 0) / states.length,
  )
  const aStates = states.filter((s) => s.grade === "A").length
  const esaStates = states.filter((s) => s.esa.active).length

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-16">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
              50-State Rankings
            </span>
            <h1 className="mt-3 max-w-3xl text-balance font-heading text-3xl font-bold tracking-tight text-navy md:text-4xl">
              The 2026 Homeschool Freedom Scorecard
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Each state is scored 0–100 across reporting burden, testing
              mandates, curriculum freedom, and teacher qualification. Higher
              scores mean fewer restrictions.
            </p>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
              {[
                { label: "National average", value: `${avg}/100` },
                { label: "Grade A states", value: aStates },
                { label: "Active ESA programs", value: esaStates },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="font-mono text-2xl font-bold text-navy">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6">
          <ScorecardGrid />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
