import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Bill } from "@/lib/data"
import { cn } from "@/lib/utils"

type Severity = "critical" | "warning" | "info"

function severityFor(bill: Bill): Severity {
  if (bill.impact === "increase" && bill.statusStep >= 4) return "critical"
  if (bill.impact === "increase" || bill.statusStep >= 2) return "warning"
  return "info"
}

const SEVERITY_META: Record<
  Severity,
  { label: string; color: string }
> = {
  critical: { label: "Critical", color: "var(--critical)" },
  warning: { label: "Warning", color: "var(--amber)" },
  info: { label: "Info", color: "var(--action)" },
}

export function AlertCard({
  bill,
  className,
}: {
  bill: Bill
  className?: string
}) {
  const severity = severityFor(bill)
  const meta = SEVERITY_META[severity]

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        className,
      )}
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: meta.color }}
        >
          {meta.label}
        </span>
        <Link
          href={`/bill/${bill.id}`}
          className="font-mono text-sm font-medium text-action hover:underline"
        >
          {bill.stateCode} {bill.number}
        </Link>
      </div>

      <h3 className="mt-3 font-heading text-lg font-semibold leading-snug text-navy">
        {bill.title}
      </h3>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
            Changes from
          </dt>
          <dd className="mt-0.5 leading-relaxed text-foreground">
            {bill.delta}
          </dd>
        </div>
        <div className="rounded-md bg-cream px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
            Action required
          </dt>
          <dd className="mt-0.5 leading-relaxed text-foreground">
            {bill.actionRequired}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          asChild
          className="rounded-md bg-navy text-sm text-primary-foreground hover:bg-navy/90"
        >
          <Link href={`/bill/${bill.id}`}>Read Full Analysis</Link>
        </Button>
        <Button
          variant="outline"
          className="rounded-md border-border text-sm text-foreground hover:bg-secondary"
        >
          Add to Watchlist
        </Button>
      </div>
    </div>
  )
}
