import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const BLOCKS = [
  {
    title: "The Problem",
    body: "Homeschool families discover regulation changes too late — often after filing deadlines have already passed. A single missed notice can jeopardize a family's standing.",
  },
  {
    title: "Our Approach",
    body: "We monitor legislative data from LegiScan and OpenStates, tracking bills that affect homeschoolers across all 50 states. Each bill is categorized against the HSLDA framework for consistency.",
  },
  {
    title: "Data Sources",
    body: "LegiScan — real-time legislative tracking · OpenStates — open government data · State DOE websites — primary source verification · HSLDA framework — standardized categorization",
  },
]

export function AboutPreview() {
  return (
    <section className="bg-cream py-20 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-navy md:text-4xl">
          Why We Built This
        </h2>

        {/* Who This Is For — callout */}
        <div className="mt-6 rounded-lg border border-navy/10 bg-navy/[0.03] px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-navy">For homeschool parents, co-op leaders, and umbrella school administrators</span> who need to know — not guess — what their state requires. Not a legal substitute. Always consult a qualified attorney for specific legal advice.
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {BLOCKS.map((block) => (
            <div
              key={block.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <h3 className="font-heading text-lg font-semibold text-navy">
                {block.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {block.body}
              </p>
            </div>
          ))}
        </div>

        {/* Accuracy Guarantee callout */}
        <div className="mt-6 rounded-lg border border-safe/30 bg-safe/[0.06] px-5 py-4">
          <p className="text-sm leading-relaxed font-semibold text-navy">
            ⭐ Our Accuracy Guarantee
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            If we miss a bill that affects your state, your next year is free.
            We hold our compliance tracking to the same standard we&apos;d want for
            our own families.
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/methodology"
            className="text-sm font-medium text-action underline-offset-4 hover:underline"
          >
            Methodology: How We Score States →
          </Link>
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 rounded-lg border border-navy/10 bg-navy/[0.03] p-6 sm:flex-row sm:items-center">
          <ShieldCheck className="h-8 w-8 shrink-0 text-safe" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            Built by policy analysts and engineers. Real names, real methodology,
            and documented data sources — because anonymous tools have no place in
            legal compliance.
          </p>
          <Link
            href="/about"
            className={buttonVariants({ variant: "ghost", className: "shrink-0 text-action hover:bg-cream" })}
          >
            Meet the team
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
