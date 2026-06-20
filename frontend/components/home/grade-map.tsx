import Link from "next/link"
import { states } from "@/lib/data"
import type { Grade } from "@/lib/data"

/** Color-coded US state grid map showing grades across all 50 states */

function gradeColor(grade: Grade): string {
  switch (grade) {
    case "A": return "#22c55e"
    case "B": return "#16a34a"
    case "C": return "#d97706"
    case "D": return "#ea580c"
    case "F": return "#dc2626"
  }
}

const ROWS: Array<{ label: string; codes: string[] }> = [
  {
    label: "West",
    codes: ["WA", "OR", "CA", "NV", "ID", "MT", "WY", "UT", "CO", "AZ", "NM", "AK", "HI"],
  },
  {
    label: "Midwest",
    codes: ["ND", "SD", "NE", "KS", "MN", "IA", "MO", "WI", "IL", "IN", "MI", "OH"],
  },
  {
    label: "South",
    codes: ["OK", "TX", "AR", "LA", "MS", "AL", "GA", "FL", "SC", "NC", "TN", "KY", "WV", "VA", "MD", "DE", "DC"],
  },
  {
    label: "Northeast",
    codes: ["PA", "NJ", "NY", "CT", "RI", "MA", "VT", "NH", "ME"],
  },
]

export function GradeMap() {
  const lookup = new Map(states.map((s) => [s.code, s]))

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
          Freedom Score — 50-State Map
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(["A", "B", "C", "D", "F"] as Grade[]).map((g) => (
            <span key={g} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: gradeColor(g) }}
              />
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Map grid */}
      <div className="space-y-2">
        {ROWS.map((row) => (
          <div key={row.label}>
            <div className="flex flex-wrap gap-1.5 md:gap-1">
              {row.codes.map((code) => {
                const state = lookup.get(code)
                if (!state) return null
                const bgColor = gradeColor(state.grade)

                return (
                  <Link
                    key={code}
                    href={`/state/${code}`}
                    className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-md border border-border text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm md:h-10 md:w-10"
                    style={{
                      backgroundColor: bgColor + "10",
                      borderColor: bgColor + "30",
                    }}
                    title={`${state.name}: ${state.grade} — ${state.score}/100`}
                  >
                    <span
                      className="text-sm font-bold leading-none md:text-sm"
                      style={{ color: bgColor }}
                    >
                      {code}
                    </span>
                    <span
                      className="text-[10px] leading-none opacity-60 md:text-[9px]"
                      style={{ color: bgColor }}
                    >
                      {state.score}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Key callout states */}
      <div className="mt-4 flex flex-wrap gap-2">
        {["ID", "TX", "FL", "CA", "NY"].map((code) => {
          const state = lookup.get(code)
          if (!state) return null
          return (
            <Link
              key={code}
              href={`/state/${code}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-cream"
            >
              <span className="font-semibold text-navy">{state.code}</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold leading-none"
                style={{ backgroundColor: gradeColor(state.grade) + "15", color: gradeColor(state.grade) }}
              >
                {state.grade} — {state.score}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
