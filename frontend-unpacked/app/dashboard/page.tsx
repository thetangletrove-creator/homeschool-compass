import type { Metadata } from "next"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { BillFeed } from "@/components/dashboard/bill-feed"

export const metadata: Metadata = {
  title: "Bill Dashboard — Tangle Trove",
  description:
    "Track and filter homeschool legislation across all 50 states in real time.",
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-navy md:text-3xl">
              Bill Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Every tracked bill across all 50 states. Filter by impact, status,
              state, and ESA relevance. We scan for new bills every 4 hours.
            </p>
          </div>
        </section>
        <BillFeed />
      </main>
      <SiteFooter />
    </div>
  )
}
