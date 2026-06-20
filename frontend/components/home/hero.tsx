import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { AlertCard } from "@/components/site/alert-card"
import { GradeMap } from "@/components/home/grade-map"
import { StatePicker } from "@/components/home/state-picker"
import { getBill } from "@/lib/data"
import { ShieldCheck, BellRing, ArrowRight, Lock } from "lucide-react"

export function Hero() {
  const featured = getBill("ca-sb-1234")!

  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[1280px] items-start gap-6 px-4 py-8 md:px-6 md:py-20 lg:grid-cols-5 lg:gap-12">
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
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground md:mt-8 md:gap-x-8 md:gap-y-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-safe/15">
                <Lock className="h-2.5 w-2.5 text-safe" />
              </span>
              <Link href="/for-parents" className="underline-offset-4 hover:underline hover:text-navy">
                Zero-knowledge by design
              </Link>
            </span>
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

          {/* Start-here guidance + State picker */}
          <div className="mt-6 rounded-lg border border-amber/20 bg-amber/[0.04] p-3 md:mt-8 md:p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-amber">
              <ArrowRight className="h-3.5 w-3.5" />
              Start here
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <StatePicker />
              <div className="text-xs text-muted-foreground sm:pb-1.5">
                <p>Not sure where to start?</p>
                <Link
                  href="/scorecard"
                  className="font-medium text-action hover:underline"
                >
                  See the full 50-state scorecard →
                </Link>
              </div>
            </div>
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

          {/* App preview — phone-shaped mockup showing what subscribers see */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 text-meta" />
              <span className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                App preview
              </span>
            </div>
            <div className="overflow-hidden rounded-[20px] border-2 border-border bg-navy/5 shadow-sm">
              {/* Phone bezel top */}
              <div className="flex items-center justify-center bg-navy/10 px-4 py-2">
                <div className="h-2 w-16 rounded-full bg-navy/20" />
              </div>
              {/* App content */}
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                    CA — California
                  </span>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-medium text-slate-500">ESA Award</span>
                    <span className="text-lg font-bold text-navy">$7,078</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-slate-100">
                      <div className="h-1.5 w-4/5 rounded-full bg-amber" />
                    </div>
                    <span className="text-[10px] text-amber-600 font-medium">Q3 used</span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                    <span>Platform: Odyssey</span>
                    <span>Deadline: Jun 30</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded bg-slate-100 px-2 py-1.5">
                    <p className="text-[10px] font-medium text-slate-700">📋 SB 1234 — Testing reform</p>
                    <p className="text-[9px] text-slate-400">Amended yesterday · 3 min ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
