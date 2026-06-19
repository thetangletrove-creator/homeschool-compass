import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { AlertCard } from "@/components/site/alert-card"
import { GradeMap } from "@/components/home/grade-map"
import { getBill } from "@/lib/data"
import { ShieldCheck, BellRing } from "lucide-react"

export function Hero() {
  const featured = getBill("ca-sb-1234")!

  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[1280px] items-start gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {/* Live alert — moved above eyebrow, more urgent */}
          <div className="mb-6 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
              Legislative sessions active in 47 states right now
            </span>
          </div>

          <h1 className="text-balance font-heading text-4xl font-bold leading-[1.1] tracking-tight text-navy md:text-5xl">
            Know Before the Laws Change
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            One missed regulation can cost your family thousands in ESA funding.
            We track every bill affecting homeschoolers across all 50 states so
            you <em className="font-semibold text-navy">always know what&rsquo;s coming</em> — before it takes effect.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/scorecard"
              className={buttonVariants({ className: "h-12 rounded-md bg-navy px-8 text-base font-medium text-primary-foreground hover:bg-navy/90" })}
            >
              Check Your State&rsquo;s Grade →
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "ghost", className: "h-12 px-3 text-sm font-medium text-action hover:bg-secondary" })}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Free scorecard. No signup required.
            </Link>
          </div>

          {/* Trust micro-copy — three quick assurances */}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-safe" />
              Alerts before deadlines
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-safe" />
              ESA compliance built in
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-cream">$</span>
              Protects up to $10K/yr in ESA funding
            </span>
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
