import { cn } from "@/lib/utils"
import { GRADE_COLORS, IMPACT_META, type Grade, type Impact } from "@/lib/data"

export function GradeBadge({
  grade,
  className,
}: {
  grade: Grade
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-heading text-sm font-bold text-white",
        className,
      )}
      style={{ backgroundColor: GRADE_COLORS[grade] }}
    >
      {grade}
    </span>
  )
}

export function ImpactBadge({
  impact,
  className,
}: {
  impact: Impact
  className?: string
}) {
  const meta = IMPACT_META[impact]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: meta.badgeBg }}
    >
      {meta.label}
    </span>
  )
}

export function StateBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded bg-navy px-2 py-0.5 font-mono text-xs font-semibold text-primary-foreground">
      {code}
    </span>
  )
}
