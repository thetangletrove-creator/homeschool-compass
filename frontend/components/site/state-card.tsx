import Link from "next/link"
import { GradeBadge } from "./badges"
import type { StateData } from "@/lib/data"
import { cn } from "@/lib/utils"

const SEGMENTS: Array<{ key: keyof StateData["subscores"]; label: string }> = [
  { key: "reporting", label: "Reporting" },
  { key: "testing", label: "Testing" },
  { key: "curriculum", label: "Curriculum" },
  { key: "teacher", label: "Teacher" },
]

function segColor(score: number) {
  if (score >= 80) return "var(--safe)"
  if (score >= 60) return "var(--amber)"
  return "var(--reg-up)"
}

export function StateCard({
  state,
  className,
}: {
  state: StateData
  className?: string
}) {
  return (
    <Link
      href={`/state/${state.code}`}
      className={cn(
        "group flex flex-col rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-2xl font-bold leading-none text-navy">
            {state.code}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{state.name}</div>
        </div>
        <GradeBadge grade={state.grade} />
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className="font-mono text-[32px] font-bold leading-none text-navy">
          {state.score}
        </span>
        <span className="mb-1 text-xs text-meta">/100</span>
      </div>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {SEGMENTS.map((seg) => (
          <span
            key={seg.key}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: segColor(state.subscores[seg.key]) }}
            title={`${seg.label}: ${state.subscores[seg.key]}`}
          />
        ))}
      </div>
      <span className="sr-only">
        Reporting {state.subscores.reporting}, Testing {state.subscores.testing},
        Curriculum {state.subscores.curriculum}, Teacher{" "}
        {state.subscores.teacher}
      </span>
    </Link>
  )
}
