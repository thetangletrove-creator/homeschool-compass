import type { Metadata } from "next"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { PricingSection } from "@/components/site/pricing-section"

export const metadata: Metadata = {
  title: "Pricing — Tangle Trove",
  description:
    "Free scorecard access or full regulation tracking with real-time alerts and ESA compliance tools.",
}

const faqs = [
  {
    q: "What counts as an alert?",
    a: "Any time a bill matching your watchlist is introduced, amended, advances a chamber, or is signed into law. Alerts are delivered by email and SMS, with webhook delivery on the API tier.",
  },
  {
    q: "How fast are alerts after a bill changes?",
    a: "We scan LegiScan and OpenStates every 4 hours and use change-hash detection for incremental sync. Most status changes reach your inbox within that window.",
  },
  {
    q: "What does the ESA Compliance tier add?",
    a: "Per-state ESA program tracking, award and eligibility data, required documentation checklists, and deadline reminders timed to your enrollment.",
  },
  {
    q: "Is this legal advice?",
    a: "No. Tangle Trove provides regulatory intelligence and source citations. It is not a substitute for an attorney. Consult counsel for guidance specific to your situation.",
  },
]

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <PricingSection />
        <section className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--navy)] md:text-3xl">
            Common questions
          </h2>
          <div className="mt-8 divide-y divide-border border-t border-border">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="text-base font-semibold text-foreground">
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
