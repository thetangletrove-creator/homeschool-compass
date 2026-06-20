import Link from "next/link"
import { Lock, Map, Bell, CheckCircle, FileText, DollarSign } from "lucide-react"

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
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-2.5 md:justify-between md:gap-3 md:px-6 md:py-3">
        {SIGNALS.map(({ label, Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-meta" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1280px] px-4 pb-2.5 md:px-6 md:pb-3">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground/60">
            Data sourced from LegiScan, OpenStates, and state DOE records
          </p>
          <Link
            href="/for-parents"
            className="inline-flex items-center gap-1.5 rounded-full border border-safe/20 bg-safe/[0.06] px-3 py-1 text-xs font-medium text-safe transition-colors hover:bg-safe/[0.12]"
          >
            <Lock className="h-3 w-3" />
            Your data never leaves your device
            <span className="ml-0.5 underline-offset-2 hover:underline">Learn more →</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
