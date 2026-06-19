import Link from "next/link"
import { AlertTriangle, ShieldCheck, Calendar, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChecklistItem = {
  id: string
  billTitle: string
  action: string
  deadline: string | null
  stateCode: string
  billNumber: string
  impact: "increase" | "decrease" | "neutral"
  esaRelated: boolean
}

function isUrgent(deadline: string | null): boolean {
  if (!deadline || deadline === "No deadline yet" || deadline === "None") return false
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return false
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return d.getTime() - Date.now() < thirtyDays
}

function formatDeadline(deadline: string | null): string {
  if (!deadline || deadline === "None" || deadline === "No deadline yet") return "No deadline yet"
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return deadline
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function ActionChecklist({
  items,
  title = "Your Action Items",
  emptyMessage = "No action items yet — bills you watch will appear here.",
  maxItems,
}: {
  items: ChecklistItem[]
  title?: string
  emptyMessage?: string
  maxItems?: number
}) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items
  const urgentCount = items.filter(i => isUrgent(i.deadline)).length

  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-navy">{title}</h3>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" />
              {urgentCount} urgent
            </span>
          )}
        </div>
        {items.length > (maxItems ?? Infinity) && (
          <Link
            href="/dashboard"
            className="text-xs font-medium text-action hover:underline"
          >
            View all {items.length}
          </Link>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {displayItems.map((item) => {
            const urgent = isUrgent(item.deadline)
            return (
              <li key={item.id} className="px-5 py-4 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  {/* Impact icon */}
                  <div
                    className={cn(
                      "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      item.impact === "increase" && "bg-amber/10 text-amber",
                      item.impact === "decrease" && "bg-safe/10 text-safe",
                      item.impact === "neutral" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.impact === "increase" ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : item.impact === "decrease" ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Bill reference */}
                    <Link
                      href={`/bill/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-action hover:underline"
                    >
                      {item.stateCode} {item.billNumber}
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {/* Action text */}
                    <p className="mt-0.5 text-sm text-foreground leading-relaxed">
                      {item.action}
                    </p>

                    {/* Tags */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {/* Deadline */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs",
                          urgent ? "font-semibold text-red-700" : "text-muted-foreground",
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {urgent ? "Due " : ""}{formatDeadline(item.deadline)}
                      </span>

                      {/* Bill title (truncated) */}
                      <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {item.billTitle}
                      </span>

                      {/* ESA tag */}
                      {item.esaRelated && (
                        <span className="rounded bg-safe/10 px-1.5 py-0.5 text-[10px] font-semibold text-safe">
                          ESA
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
