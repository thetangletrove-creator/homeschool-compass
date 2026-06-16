import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { StateCard } from "@/components/site/state-card"
import { states } from "@/lib/data"

export function ScorecardPreview() {
  // Show a representative selection on the homepage.
  const featured = [
    "ID", "TX", "FL", "CA", "NY", "PA", "AZ", "OH", "MI", "UT",
  ]
    .map((code) => states.find((s) => s.code === code))
    .filter(Boolean) as typeof states

  return (
    <section className="bg-background py-20 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-navy md:text-4xl">
            The 2026 Homeschool Freedom Scorecard
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            How does your state rank on regulation burden, testing mandates, and
            curriculum freedom?
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {featured.map((state) => (
            <StateCard key={state.code} state={state} />
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/scorecard"
            className={buttonVariants({ className: "h-11 rounded-md bg-navy px-6 text-sm font-medium text-primary-foreground hover:bg-navy/90" })}
          >
            View Full Scorecard
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
