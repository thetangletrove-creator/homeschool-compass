"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, BadgeCheck, ShieldCheck, FileText, Layers, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const FREE_FEATURES = [
  "Full 50-state scorecard with grades A–F",
  "State pages with restriction chips and clickable drill-down",
  "Bill search (title + status + impact)",
  "Weekly regulation digest email",
  "3 detailed state compliance guides per month",
]

const PACKET_FEATURES = [
  "Everything in Scorecard, plus:",
  "Your state's complete compliance pack — ready to print or email",
  "All portal links, application URLs, and deadlines in one place",
  "AI-powered ESA award tracking with real program amounts",
  "Bill triage queue: enacted changes, watch items, archive",
  "Action checklist with deadlines built from live bill analysis",
  "Confidence-scored impact analysis for every tracked bill",
  "Download as PDF — share with your co-op or lawyer",
]

const BINDER_FEATURES = [
  "Everything in State Packet, plus:",
  "Multi-state coverage (up to 3 states)",
  "SMS+email urgent alerts when bills affect your state",
  "Full binder with all portal forms, receipts, and checklists",
  "Annual deadline calendar synced to your state's cycle",
  "Priority email support (24-hour response)",
]

export function PricingSection() {
  const router = useRouter()

  return (
    <section className="bg-navy py-16 text-cream md:py-20">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Protect Your Family&rsquo;s ESA Funding
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-cream/70">
            Know what&rsquo;s coming before it hits your state. From a single
            state packet to a full compliance binder.
          </p>
        </div>

        {/* Value comparison bar — reframed as confidence signal */}
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-cream/15 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:gap-8 md:px-6 md:py-5">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber" />
            <span className="text-cream/80">
              HSLDA member? They charge <span className="font-semibold text-cream">$150/yr</span> for legal defense + a basic bill tracker
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BadgeCheck className="h-5 w-5 shrink-0 text-safe" />
            <span className="text-cream/80">
              Homeschool Compass: <span className="font-semibold text-cream">a one-time $29</span> for a dedicated packet &mdash;{" "}
              <span className="text-safe">81% less</span>
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-lg border border-cream/15 bg-white/[0.03] p-5 md:p-8">
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

          {/* State Packet — Most Popular */}
          <div className="relative flex flex-col rounded-lg border border-safe/40 bg-white/[0.05] p-5 ring-2 ring-safe/30 md:p-8">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-safe px-4 py-1 text-xs font-semibold text-navy shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Best Value
            </span>

            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              State Packet
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              $29<span className="text-lg font-normal text-cream/60"> one-time</span>
            </p>
            <p className="mt-1 text-sm text-cream/60">
              <span className="font-medium text-cream">One state</span> &mdash; print-ready compliance pack with all portals, forms, and deadlines
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              Your state&rsquo;s complete picture: live ESA programs, applicable
              bills, portal links, and a personalized action checklist. No
              subscription — buy once, own it.
            </p>

            {/* Visual cue — what you get */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-white/[0.04] p-3">
              <div className="flex flex-col items-center gap-1 text-center">
                <FileText className="h-5 w-5 text-safe" />
                <span className="text-[10px] leading-tight text-cream/60">Print-ready pack</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Layers className="h-5 w-5 text-amber" />
                <span className="text-[10px] leading-tight text-cream/60">Portals + forms</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Sparkles className="h-5 w-5 text-safe" />
                <span className="text-[10px] leading-tight text-cream/60">AI-powered track</span>
              </div>
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {PACKET_FEATURES.map((f, i) => (
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
              onClick={() => router.push("/compliance-kit")}
            >
              Get Your State Packet
            </Button>
            <p className="mt-3 text-center text-xs text-cream/60">
              One-time purchase. Download as PDF immediately.
            </p>
          </div>

          {/* Binder Plus */}
          <div className="flex flex-col rounded-lg border border-cream/15 bg-white/[0.03] p-5 md:p-8">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
              Binder Plus
            </span>
            <p className="mt-3 font-heading text-3xl font-semibold">
              $99<span className="text-lg font-normal text-cream/60">/year</span>
            </p>
            <p className="mt-1 text-sm text-cream/60">
              Everything in Packet, plus multi-state &amp; alerts
            </p>
            <p className="mt-3 leading-relaxed text-cream/70">
              For families managing compliance across multiple states or
              programs: full binder of every document, receipt template, and
              deadline — with alerts when anything changes.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {BINDER_FEATURES.map((f, i) => (
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
              disabled
            >
              Coming Soon
            </Button>
            <p className="mt-3 text-center text-xs text-cream/60">
              Available via iPad app. Email notifications coming Q3 2026.
            </p>
          </div>
        </div>

        {/* Trust signals footer */}
        <div className="mt-8 space-y-3 border-t border-cream/15 pt-6 text-sm text-cream/60">
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
        <div className="mt-6 grid gap-4 border-t border-cream/10 pt-6 text-sm text-cream/60 md:grid-cols-3">
          <div>
            <p className="font-medium text-cream/80">How does the State Packet work?</p>
            <p className="mt-1">Pick your state, pay $29 once, and instantly download a print-ready compliance pack. No ongoing commitment.</p>
          </div>
          <div>
            <p className="font-medium text-cream/80">What about the iPad app?</p>
            <p className="mt-1">Available on iPad with Apple StoreKit IAP — $29.99 per state or $99.99/year Binder Plus. Same data, native experience.</p>
          </div>
          <div>
            <p className="font-medium text-cream/80">Is this legal advice?</p>
            <p className="mt-1">No. We provide regulatory tracking, not attorney representation. Consult a lawyer for your situation.</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-cream/50">
          This is not legal advice. Homeschool Compass provides regulatory tracking, not
          attorney representation.
        </p>
      </div>
    </section>
  )
}
