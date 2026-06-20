import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { states } from "@/lib/data"
import type { Grade } from "@/lib/data"

function gradeColor(grade: Grade): string {
  switch (grade) {
    case "A": return "#22c55e"
    case "B": return "#16a34a"
    case "C": return "#d97706"
    case "D": return "#ea580c"
    case "F": return "#dc2626"
  }
}

/** Micro sub-score bar */
function SubBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#d97706" : "#ea580c"
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.03em] text-muted-foreground/70">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border md:w-12">
          <div
            className="h-full rounded-full transition-all group-hover:w-[var(--w)]"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/70">
          {value}%
        </span>
      </div>
    </div>
  )
}

export function ScorecardPreview() {
  // Show 5 states with wide grade range — A, A, B, D, F
  const featured = ["ID", "TX", "FL", "CA", "NY"]
    .map((code) => states.find((s) => s.code === code))
    .filter(Boolean) as typeof states

  return (
    <section className="bg-background py-16 md:py-20">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-navy md:text-4xl">
            The 2026 Homeschool Freedom Scorecard
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            How does your state rank on regulation burden, testing mandates, and
            curriculum freedom?
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
          {featured.map((state) => {
            const bg = gradeColor(state.grade)
            return (
              <Link
                key={state.code}
                href={`/state/${state.code}`}
                className="group flex flex-col rounded-lg border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:p-4"
              >
                {/* State header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold leading-none text-navy">
                    {state.code}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold leading-none"
                    style={{ backgroundColor: bg + "15", color: bg }}
                  >
                    {state.grade}
                  </span>
                </div>
                <span className="mt-1 text-xs text-muted-foreground">{state.name}</span>

                {/* Score */}
                <div className="mt-3 flex items-baseline gap-0.5">
                  <span className="font-mono text-2xl font-bold leading-none text-navy">
                    {state.score}
                  </span>
                  <span className="text-[10px] text-meta">/100</span>
                </div>

                {/* Sub-scores — hidden on smallest viewports, narrower bars on tablet */}
                <div className="mt-3 hidden space-y-1 min-[480px]:block md:space-y-1.5" aria-hidden="true">
                  <SubBar label="Reporting" value={state.subscores.reporting} />
                  <SubBar label="Testing" value={state.subscores.testing} />
                  <SubBar label="Curriculum" value={state.subscores.curriculum} />
                  <SubBar label="Teacher" value={state.subscores.teacher} />
                </div>

                {/* Click hint (visible on hover) */}
                <span className="mt-2 text-[10px] font-medium text-action opacity-0 transition-opacity group-hover:opacity-100">
                  See full breakdown →
                </span>
              </Link>
            )
          })}
        </div>

        {/* Don't see your state? */}
        <div className="mt-6">
          <Link
            href="/scorecard"
            className="text-sm font-medium text-action underline underline-offset-4 hover:no-underline"
          >
            Don&apos;t see your state? View all 50 →
          </Link>
        </div>

        <div className="mt-6">
          <Link
            href="/scorecard"
            className={buttonVariants({ className: "h-11 rounded-md bg-navy px-6 text-sm font-medium text-primary-foreground hover:bg-navy/90" })}
          >
            View Full Scorecard
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
