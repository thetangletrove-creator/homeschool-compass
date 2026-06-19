import { Map, Bell, CheckCircle, FileText, DollarSign } from "lucide-react"

const SIGNALS = [
  { label: "50 States Monitored", Icon: Map },
  { label: "Real-Time Legislative Alerts", Icon: Bell },
  { label: "HSLDA-Aligned Categorization", Icon: CheckCircle },
  { label: "30,000+ Bills Analyzed", Icon: FileText },
  { label: "ESA Compliance Tracking", Icon: DollarSign },
]

export function TrustBar() {
  return (
    <section className="border-y border-border bg-cream">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-4 py-6 md:px-6">
        {SIGNALS.map(({ label, Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-meta" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
