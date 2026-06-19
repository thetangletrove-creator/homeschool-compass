import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

const BLOCKS = [
  {
    title: "The Problem",
    body: "Homeschool families discover regulation changes too late — often after filing deadlines have already passed. A single missed notice can jeopardize a family's standing.",
  },
  {
    title: "Our Approach",
    body: "We process 30,000+ API queries monthly across LegiScan and OpenStates, with change-hash detection for incremental sync and Gemini-assisted analysis categorized against the HSLDA framework.",
  },
  {
    title: "The Accuracy Guarantee",
    body: "If we miss a bill that affects your state, your next year is free. We hold our compliance tracking to the same standard the IRS holds your taxes.",
  },
]

export function AboutPreview() {
  return (
    <section className="bg-cream py-20 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-navy md:text-4xl">
          Why We Built This
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
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

        <div className="mt-8 flex flex-col items-start gap-4 rounded-lg border border-navy/10 bg-navy/[0.03] p-6 sm:flex-row sm:items-center">
          <ShieldCheck className="h-8 w-8 shrink-0 text-safe" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            Built by policy analysts and engineers. Real names, real methodology,
            and documented data sources — because anonymous tools have no place in
            legal compliance.
          </p>
          <Button
            asChild
            variant="ghost"
            className="shrink-0 text-action hover:bg-cream"
          >
            <Link href="/about">
              Meet the team
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
