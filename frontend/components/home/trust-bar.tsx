import { Map, Bell, CheckCircle, FileText, DollarSign } from "lucide-react"

const SIGNALS = [
  { label: "50 States Monitored", Icon: Map },
  { label: "Real-Time Legislative Alerts", Icon: Bell },
  { label: "Based on HSLDA Standards", Icon: CheckCircle },
  { label: "30,000+ Bills Tracked", Icon: FileText },
  { label: "ESA Program Monitoring", Icon: DollarSign },
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
      <div className="mx-auto max-w-[1280px] px-4 pb-4 md:px-6">
        <p className="text-center text-xs text-muted-foreground/60">
          Data sourced from LegiScan, OpenStates, and state DOE records
        </p>
      </div>
    </section>
  )
}
