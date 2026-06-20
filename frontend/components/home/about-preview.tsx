import Link from "next/link"
import { ArrowRight, ShieldCheck, AlertTriangle, ArrowDownToLine, Database, Lock } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function AboutPreview() {
  return (
    <section className="bg-cream py-16 md:py-20">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-navy md:text-4xl">
          Why We Built This
        </h2>

        {/* Who This Is For — callout */}
        <div className="mt-6 rounded-lg border border-navy/10 bg-navy/[0.03] px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-navy">For homeschool parents, co-op leaders, and umbrella school administrators</span> who need to know — not guess — what their state requires. Not a legal substitute. Always consult a qualified attorney for specific legal advice.
        </div>

        {/* Three blocks, each with a different visual treatment */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* The Problem — amber callout card */}
          <div className="relative overflow-hidden rounded-lg border border-amber/20 bg-white p-6 shadow-sm">
            <div className="absolute left-0 top-0 h-full w-1 bg-amber" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber/10">
                <AlertTriangle className="h-4 w-4 text-amber" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-amber">
                The Problem
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Homeschool families discover regulation changes too late — often after filing deadlines have already passed. A single missed notice can jeopardize a family&rsquo;s standing <strong className="text-navy">and thousands in ESA funding</strong>.
            </p>
          </div>

          {/* Our Approach — numbered flow */}
          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy">
                <ArrowDownToLine className="h-4 w-4 text-cream" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-navy">
                Our Approach
              </span>
            </div>
            <ol className="mt-4 space-y-3">
              {[
                ["Monitor", "LegiScan + OpenStates track every bill across all 50 states"],
                ["Analyze", "Each bill is categorized against HSLDA framework with AI-powered impact scoring"],
                ["Alert", "You get notified before deadlines — not after"],
              ].map(([step, desc]) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy/10 text-[11px] font-bold text-navy">
                    {["1", "2", "3"][step === "Monitor" ? 0 : step === "Analyze" ? 1 : 2]}
                  </span>
                  <div>
                    <span className="font-medium text-navy">{step}:</span>{" "}
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Data Sources — badge layout */}
          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-safe/20">
                <Database className="h-4 w-4 text-safe" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-safe">
                Data Sources
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["LegiScan", "OpenStates", "State DOE", "HSLDA Framework", "Gemini AI"].map((source) => (
                <span
                  key={source}
                  className="inline-flex items-center rounded-full border border-navy/10 bg-navy/[0.03] px-3 py-1 text-xs font-medium text-navy"
                >
                  {source}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Real-time legislative tracking + open government data + primary source verification. Every source is documented with a clear audit trail.
            </p>
          </div>
        </div>

        {/* Accuracy Guarantee callout — toned down, factual */}
        <div className="mt-6 rounded-lg border border-safe/30 bg-safe/[0.06] px-5 py-4">
          <p className="text-sm leading-relaxed font-semibold text-navy">
            ⭐ Missed a bill? We&apos;ll make it right.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            If our tracking misses a bill that affects your state, your next year&apos;s
            subscription is free. We stand behind our data.
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

        <div className="mt-8 flex flex-col items-start gap-4 rounded-lg border border-navy/10 bg-navy/[0.03] p-6 sm:flex-row sm:items-start">
          <ShieldCheck className="h-8 w-8 shrink-0 text-safe" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            We&apos;re a small team of policy analysts and engineers who believe homeschool
            families deserve clear, timely compliance information. Every source is documented
            with a clear audit trail.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/for-parents"
              className="inline-flex items-center gap-1.5 rounded-full border border-safe/20 bg-safe/[0.06] px-3 py-1.5 text-xs font-medium text-safe hover:bg-safe/[0.12]"
            >
              <Lock className="h-3 w-3" />
              Your data stays private — see how
            </Link>
            <Link
              href="/about"
              className={buttonVariants({ variant: "ghost", className: "shrink-0 text-action hover:bg-cream" })}
            >
              About us
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
