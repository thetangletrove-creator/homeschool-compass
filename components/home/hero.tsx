import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { AlertCard } from "@/components/site/alert-card"
import { GradeMap } from "@/components/home/grade-map"
import { getBill } from "@/lib/data"

export function Hero() {
  const featured = getBill("ca-sb-1234")!

  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[1280px] items-start gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <span className="inline-flex items-center rounded-full bg-cream px-3 py-1 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            Regulatory intelligence for homeschool families
          </span>
          <h1 className="mt-5 text-balance font-heading text-4xl font-bold leading-[1.1] tracking-tight text-navy md:text-5xl">
            Know Exactly What Your State Requires — Before the Law Changes
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Track homeschool legislation across all 50 states. Get instant alerts
            when bills that affect YOUR family are introduced, amended, or signed
            — before they take effect.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/60">
            Legislative sessions are active in 47 states right now.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/scorecard"
              className={buttonVariants({ className: "h-12 rounded-md bg-navy px-8 text-base font-medium text-primary-foreground hover:bg-navy/90" })}
            >
              See Your State's Grade →
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "ghost", className: "h-12 px-3 text-sm font-medium text-action hover:bg-secondary" })}
            >
              Free 50-state scorecard. No signup required.
            </Link>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Grade map */}
          <GradeMap />

          {/* Live alert card */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                Live regulation alert
              </span>
            </div>
            <AlertCard bill={featured} className="shadow-md" />
          </div>
        </div>
      </div>
    </section>
  )
}
