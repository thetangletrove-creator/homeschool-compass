import type { Metadata } from "next"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { states } from "@/lib/data"
import { EsaFilter } from "@/components/esa/esa-filter"

export const metadata: Metadata = {
  title: "ESA Compliance Guide — Homeschool Compass",
  description:
    "Education Savings Account programs by state: award amounts, eligibility, required documentation, and deadlines.",
}

export default function EsaPage() {
  const active = states.filter((s) => s.esa.active || s.esaPrograms.length > 0)
  const inactive = states.filter((s) => !s.esa.active && s.esaPrograms.length === 0)
  const altFunding = states.filter((s) => s.nonEsaPrograms.length > 0)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border bg-cream">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 md:px-6 md:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.05em] text-meta">
              ESA Compliance Guide
            </p>
            <h1 className="mt-3 text-pretty text-4xl font-bold tracking-tight text-navy md:text-5xl">
              Education Savings Accounts, state by state
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Award amounts, eligibility, required documentation, and filing
              deadlines for every active program. Track bills that could create
              or change a program in your state.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-14 md:px-6 md:py-16">
          <EsaFilter active={active} inactive={inactive} altFunding={altFunding} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
