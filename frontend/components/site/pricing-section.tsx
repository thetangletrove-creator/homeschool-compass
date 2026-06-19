"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, BadgeCheck, Bell, TrendingUp, MousePointerClick, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

const FREE_FEATURES = [
  "Full 50-state scorecard with grades A–F",
  "State pages with restriction chips and clickable drill-down",
  "Bill search (title + status + impact)",
  "Weekly regulation digest email",
  "3 detailed state compliance guides per month",
]

const PAID_FEATURES = [
  "Everything in Scorecard, plus:",
  "Clickable investigation board — drill from state restrictions to specific bills",
  "AI-powered bill analysis: plain-English summaries with impact scoring",
  "Real-time alerts when new bills affect your state (email + SMS + webhook)",
  "Personalized compliance checklist with deadlines built from bill analysis",
  "ESA program tracking: eligibility, awards, and filing deadlines",
  "Full bill archive with status updates and historical data",
  "14-day free trial — no credit card required",
]

const ESA_FEATURES = [
  "Everything in Regulation Tracker, plus:",
  "Multi-state tracking (up to 3 states)",
  "SMS alerts for urgent bills (up to 5/month)",
  "Webhook/API access for custom integrations",
  "Priority email support (24-hour response)",
  "Annual deadline reminder + personalized compliance checklist",
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
            Protect Your Family&rsquo;s ESA Funding
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-cream/70">
            Less than one dinner out per month to protect thousands in state funding.
            Start free. Upgrade when you need alerts and compliance tools.
          </p>
        </div>

        {/* Value comparison bar — reframed as confidence signal */}
        <div className="mt-8 flex flex-col gap-4 rounded-lg border border-cream/15 bg-white/[0.03] px-6 py-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber" />
            <span className="text-cream/80">
              HSLDA member? They charge <span className="font-semibold text-cream">$150/yr</span> for legal defense + a basic bill tracker
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BadgeCheck className="h-5 w-5 shrink-0 text-safe" />
            <span className="text-cream/80">
              Homeschool Compass: <span className="font-semibold text-cream">$29/yr</span> for dedicated AI-powered tracking &mdash;{" "}
              <span className="text-safe">81% less</span>
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-lg border border-cream/15 bg-white/[0.03] p-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Scorecard Access
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              Free Forever
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              Browse the 50-state scorecard, drill into state restriction details,
              and see bill impact summaries.
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
              onClick={() => router.push("/sign-up")}
            >
              Get Started Free
            </Button>
          </div>

          {/* Paid — Most Popular */}
          <div className="relative flex flex-col rounded-lg border border-safe/40 bg-white/[0.05] p-8 ring-2 ring-safe/30">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-safe px-4 py-1 text-xs font-semibold text-navy shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Biggest ROI
            </span>

            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Regulation Tracker
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              $29<span className="text-lg font-normal text-cream/60">/year</span>
            </p>
            <p className="mt-1 text-sm text-cream/60">
              <span className="font-medium text-cream">$2.42/month</span> &mdash; less than one coffee shop visit &mdash;{" "}
              <span className="text-safe">to protect thousands in ESA funding</span>
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              Turn awareness into action. Click any restriction, see every bill
              creating it, understand what it means, and know what to do next.
            </p>

            {/* Visual cue — what you get */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-white/[0.04] p-3">
              <div className="flex flex-col items-center gap-1 text-center">
                <MousePointerClick className="h-5 w-5 text-safe" />
                <span className="text-[10px] leading-tight text-cream/60">Clickable drill-down</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <TrendingUp className="h-5 w-5 text-amber" />
                <span className="text-[10px] leading-tight text-cream/60">AI impact scoring</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Bell className="h-5 w-5 text-safe" />
                <span className="text-[10px] leading-tight text-cream/60">Real-time alerts</span>
              </div>
            </div>

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
              Start Free Trial
            </Button>
            <p className="mt-3 text-center text-xs text-cream/60">
              14-day free trial. No credit card required.
            </p>
          </div>

          {/* ESA — Full Protection */}
          <div className="flex flex-col rounded-lg border border-cream/15 bg-white/[0.03] p-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Full Protection
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              $99<span className="text-lg font-normal text-cream/60">/year</span>
            </p>
            <p className="mt-1 text-sm text-cream/60">
              Everything in Tracker, plus multi-state &amp; SMS
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              For families managing ESA compliance, tracking bills across multiple
              states, or needing SMS alerts and priority support.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {ESA_FEATURES.map((f, i) => (
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
              variant="outline"
              className="mt-8 w-full rounded-md border-safe/40 bg-transparent text-safe hover:bg-safe/10"
              onClick={() => handleCheckout("esa")}
              disabled={loading === "esa"}
            >
              {loading === "esa" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Try ESA Free for 14 Days
            </Button>
            <p className="mt-3 text-center text-xs text-cream/60">
              14-day free trial. No credit card required.
            </p>
          </div>
        </div>

        {/* Trust signals footer */}
        <div className="mt-10 space-y-3 border-t border-cream/15 pt-8 text-sm text-cream/60">
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Payments
            </span>
            <span>Stripe · Apple Pay · Google Pay · 256-bit SSL Encryption</span>
          </div>
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Data Sources
            </span>
            <span>LegiScan · Gemini AI Analysis · State DOE Records</span>
          </div>
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Framework
            </span>
            <span>AI-powered impact analysis · Aligned with HSLDA State Law Categories</span>
          </div>
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Guarantee
            </span>
            <span>Miss a bill affecting your state? Your next year is free.</span>
          </div>
        </div>

        {/* FAQ micro-copy */}
        <div className="mt-8 grid gap-4 border-t border-cream/10 pt-8 text-sm text-cream/60 md:grid-cols-3">
          <div>
            <p className="font-medium text-cream/80">What happens after my free trial?</p>
            <p className="mt-1">Converts to $29/year auto-renew. Cancel anytime before the trial ends — no charge.</p>
          </div>
          <div>
            <p className="font-medium text-cream/80">Can I switch tiers later?</p>
            <p className="mt-1">Yes — upgrade or downgrade anytime. Changes take effect at the next billing cycle.</p>
          </div>
          <div>
            <p className="font-medium text-cream/80">Is this legal advice?</p>
            <p className="mt-1">No. We provide regulatory tracking, not attorney representation. Consult a lawyer for your situation.</p>
          </div>
        </div>

        <p className="mt-8 text-sm text-cream/50">
          This is not legal advice. Homeschool Compass provides regulatory tracking, not
          attorney representation.
        </p>
      </div>
    </section>
  )
}
