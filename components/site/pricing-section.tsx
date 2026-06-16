"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const FREE_FEATURES = [
  "Full scorecard rankings",
  "Bill search and filtering",
  "Public bill summaries",
  "Weekly digest email",
]

const PAID_FEATURES = [
  "Everything in Scorecard, plus:",
  "Instant bill alerts (SMS, email, webhook)",
  "Detailed compliance checklists per state",
  "ESA program tracking and deadline reminders",
  "Historical bill archive",
  "API access (B2B tier)",
]

export function PricingSection() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(plan: "tracker" | "esa") {
    setLoading(plan)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <section className="bg-navy py-20 text-cream md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Choose Your Level of Protection
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-cream/70">
            Start free with the scorecard. Upgrade when you need real-time alerts
            and state-specific compliance.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col rounded-lg border border-cream/15 bg-white/[0.03] p-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Scorecard Access
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              Free Forever
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              Browse the 50-state scorecard, read bill summaries, and see basic
              status updates.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                  <span className="text-cream/90">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-8 w-full rounded-md border-cream/40 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"
              onClick={() => handleCheckout("tracker")}
            >
              Get Free Access
            </Button>
          </div>

          {/* Paid */}
          <div className="flex flex-col rounded-lg border border-safe/40 bg-white/[0.05] p-8 ring-1 ring-safe/30">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Regulation Tracker
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              $29<span className="text-lg font-normal text-cream/60">/year</span>
            </p>
            <p className="mt-1 text-sm text-cream/60">
              or $99/year for ESA Compliance
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              Real-time alerts, detailed analysis, and compliance checklists
              tailored to your state.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {PAID_FEATURES.map((f, i) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm"
                >
                  {i === 0 ? (
                    <span className="text-sm font-medium text-cream/90">
                      {f}
                    </span>
                  ) : (
                    <>
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                      <span className="text-cream/90">{f}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full rounded-md bg-safe font-medium text-navy hover:bg-safe/90"
              onClick={() => handleCheckout("tracker")}
              disabled={loading === "tracker"}
            >
              {loading === "tracker" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Start Tracking — $29/year
            </Button>
            <Button
              variant="outline"
              className="mt-3 w-full rounded-md border-safe/40 bg-transparent text-safe hover:bg-safe/10"
              onClick={() => handleCheckout("esa")}
              disabled={loading === "esa"}
            >
              {loading === "esa" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              ESA Compliance — $99/year
            </Button>
            <p className="mt-3 text-center text-xs text-cream/60">
              14-day free trial. Cancel anytime.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-cream/15 pt-8 text-sm text-cream/60 md:flex-row md:items-center md:gap-8">
          <span>Used by 2,400+ homeschool families</span>
          <span>Trusted by umbrella schools in 12 states</span>
          <span className="md:ml-auto text-cream/40">
            Stripe · Apple Pay · Google Pay
          </span>
        </div>
        <p className="mt-6 text-sm text-cream/50">
          This is not legal advice. Homeschool Compass provides regulatory tracking, not
          attorney representation.
        </p>
      </div>
    </section>
  )
}
