import Link from "next/link"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusTimeline } from "./status-timeline"
import { ImpactBadge, StateBadge } from "./badges"
import type { Bill } from "@/lib/data"
import { cn } from "@/lib/utils"

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function BillCard({
  bill,
  className,
}: {
  bill: Bill
  className?: string
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card p-6 transition-all hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StateBadge code={bill.stateCode} />
        <Link
          href={`/bill/${bill.id}`}
          className="font-mono text-sm font-medium text-action hover:underline"
        >
          {bill.number}
        </Link>
        <span className="ml-auto text-xs font-medium uppercase tracking-[0.05em] text-meta">
          {formatDate(bill.date)}
        </span>
      </div>

      <h3 className="mt-3">
        <Link
          href={`/bill/${bill.id}`}
          className="font-heading text-lg font-semibold leading-snug text-navy hover:underline"
        >
          {bill.title}
        </Link>
      </h3>

      <div className="mt-5 px-1">
        <StatusTimeline activeStep={bill.statusStep} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ImpactBadge impact={bill.impact} />
        <span className="text-sm leading-relaxed text-muted-foreground">
          {bill.impactSummary}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          asChild
          variant="ghost"
          className="h-9 px-3 text-sm text-action hover:bg-secondary"
        >
          <Link href={`/bill/${bill.id}`}>View Full Text</Link>
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-md border-border px-3 text-sm text-foreground hover:bg-secondary"
        >
          Track This Bill
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-9 w-9 text-muted-foreground hover:bg-secondary"
          aria-label="Share bill"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  )
}
