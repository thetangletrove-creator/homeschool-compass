import Link from "next/link"
import { Share2, ShieldCheck } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
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

function confidenceColor(conf: number): string {
  if (conf >= 0.8) return "bg-safe/10 text-safe"
  if (conf >= 0.5) return "bg-amber/10 text-amber"
  return "bg-red-50 text-red-600"
}

export function BillCard({
  bill,
  className,
}: {
  bill: Bill
  className?: string
}) {
  const confidence = bill.impactConfidence ?? null
  const analysisPreview = bill.analysis?.[0] ?? null

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

        {/* Tags */}
        <div className="flex items-center gap-1.5">
          {bill.esaRelated && (
            <span className="inline-flex items-center gap-0.5 rounded bg-safe/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-safe">
              <ShieldCheck className="h-3 w-3" />
              ESA
            </span>
          )}
        </div>

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
        {confidence !== null && (
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
              confidenceColor(confidence),
            )}
            title={`AI confidence: ${(confidence * 100).toFixed(0)}%`}
          >
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
        {bill.impactSummary && (
          <span className="text-sm leading-relaxed text-muted-foreground">
            {bill.impactSummary}
          </span>
        )}
      </div>

      {/* Analysis preview */}
      {analysisPreview && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {analysisPreview}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Link
          href={`/bill/${bill.id}`}
          className={buttonVariants({ variant: "ghost", className: "h-9 px-3 text-sm text-action hover:bg-secondary" })}
        >
          View Details
        </Link>
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
