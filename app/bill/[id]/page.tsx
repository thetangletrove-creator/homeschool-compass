import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Plus, Share2, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { StatusTimeline } from "@/components/site/status-timeline"
import { ImpactBadge, StateBadge } from "@/components/site/badges"
import { Button } from "@/components/ui/button"
import { getDb, BILL_STEPS } from "@/lib/data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = await getDb()
  const bill = await db.getBill(id)
  if (!bill) notFound()

  const stateDb = await db.getState(bill.stateCode)
  const state = stateDb ?? null

  // Parse analysis JSONB — it comes as an array of strings
  const analysisPoints = bill.analysis ?? []

  // GST: impact_confidence formatting
  const confidence = bill.impactConfidence ?? null
  const analyzedAt = bill.analyzedAt ?? null

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:px-6 md:py-16">
        <Link
          href={state ? `/state/${state.code.toLowerCase()}` : "/dashboard"}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {state ? state.name : "bill feed"}
        </Link>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StateBadge code={bill.stateCode} />
          <span className="font-mono text-sm text-[var(--action)]">
            {bill.number}
          </span>
          <span className="font-mono text-xs uppercase tracking-wide text-[var(--meta)]">
            {bill.date}
          </span>
          {bill.esaRelated ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--safe)]/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wide text-[var(--safe)]">
              <ShieldCheck className="h-3 w-3" />
              ESA
            </span>
          ) : null}
        </div>

        <h1 className="text-pretty text-3xl font-bold leading-tight tracking-tight text-[var(--navy)] md:text-4xl">
          {bill.title}
        </h1>
        {state ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <Link
              href={`/state/${state.code.toLowerCase()}`}
              className="hover:text-foreground hover:underline"
            >
              {state.name}
            </Link>{" "}
            legislature
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button className="bg-[var(--navy)] text-[var(--primary-foreground)] hover:bg-[var(--navy)]/90">
            View Full Text
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-[var(--navy)]/20 text-[var(--navy)]"
          >
            <Plus className="h-4 w-4" />
            Add to Watchlist
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Share bill"
            className="text-muted-foreground"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Legislative Progress */}
        <section className="mt-10 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
            Legislative Progress
          </h2>
          <div className="mt-5">
            <StatusTimeline activeStep={bill.statusStep} />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Current stage:{" "}
            <span className="font-medium text-foreground">
              {BILL_STEPS[bill.statusStep]}
            </span>
          </p>
        </section>

        {/* Regulatory Impact */}
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
              Regulatory Impact
            </h2>
            <div className="flex items-center gap-2">
              <ImpactBadge impact={bill.impact} />
              {confidence !== null && (
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    confidence >= 0.8 && "bg-safe/10 text-safe",
                    confidence >= 0.5 && confidence < 0.8 && "bg-amber/10 text-amber",
                    confidence < 0.5 && "bg-red-50 text-red-600",
                  )}
                  title={`AI confidence: ${(confidence * 100).toFixed(0)}%`}
                >
                  {(confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          {bill.impactSummary && (
            <p className="mt-4 text-base text-foreground">{bill.impactSummary}</p>
          )}

          {bill.delta && (
            <div className="mt-5 rounded-md bg-[var(--cream)] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
                Change Summary
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex-1 rounded border border-safe/30 bg-white p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-safe">Before</p>
                  <p className="mt-0.5 font-mono text-sm text-foreground">
                    {bill.delta.split("→")[0]?.trim() || "Current state"}
                  </p>
                </div>
                <div className="flex items-center">
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    bill.impact === "increase" && "text-[var(--reg-up)]",
                    bill.impact === "decrease" && "text-[var(--safe)]",
                    bill.impact === "neutral" && "text-meta"
                  )} />
                </div>
                <div className="flex-1 rounded border border-reg-up/30 bg-white p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-reg-up">After</p>
                  <p className="mt-0.5 font-mono text-sm text-foreground">
                    {bill.delta.split("→")[1]?.trim() || "Proposed change"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Target audience chip */}
          {confidence !== null && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-meta">AI confidence:</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${confidence * 100}%`,
                    backgroundColor: confidence >= 0.8 ? "var(--safe)" : confidence >= 0.5 ? "var(--amber)" : "var(--reg-up)"
                  }}
                />
              </div>
              <span className={cn(
                "text-xs font-medium",
                confidence >= 0.8 && "text-safe",
                confidence >= 0.5 && confidence < 0.8 && "text-amber",
                confidence < 0.5 && "text-reg-up"
              )}>
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {analyzedAt && (
            <p className="mt-2 text-xs text-meta">
              Analyzed {new Date(analyzedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
              })}
            </p>
          )}
        </section>

        {/* Action Required */}
        {bill.actionRequired ? (
          <section className="mt-6 rounded-lg border border-border bg-card p-6">
            <div className={cn(
              "border-l-4 p-4 rounded-r-md",
              bill.impact === "increase" && "border-[var(--amber)] bg-[var(--amber)]/5",
              bill.impact === "decrease" && "border-safe bg-safe/5",
              bill.impact === "neutral" && "border-muted bg-muted/20"
            )}>
              <div className="flex items-center gap-2">
                {bill.impact === "increase" ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--amber)]" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-safe" />
                )}
                <p className={cn(
                  "text-xs font-medium uppercase tracking-[0.05em]",
                  bill.impact === "increase" && "text-[var(--amber)]",
                  bill.impact === "decrease" && "text-safe",
                  bill.impact === "neutral" && "text-meta"
                )}>
                  {bill.impact === "increase" ? "Action Required" : "Good News"}
                </p>
              </div>
              <p className="mt-2 text-sm text-foreground leading-relaxed">
                {bill.actionRequired}
              </p>
            </div>
          </section>
        ) : null}

        {/* Analysis Points */}
        {analysisPoints.length > 0 && (
          <section className="mt-6 rounded-lg border border-border bg-card p-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
              Analysis
            </h2>
            <ul className="mt-4 space-y-3">
              {analysisPoints.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--action)]" />
                  <span className="text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Full Text — only show if populated */}
        {bill.fullText && bill.fullText.length > 0 && (
          <section className="mt-6 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
                Full Text
              </h2>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--action)] hover:underline"
              >
                Official source
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {bill.fullText}
            </p>
          </section>
        )}

        {/* List of bills on this topic — TODO: related bills */}
        <section className="mt-6 rounded-lg border border-dashed border-border bg-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
            Need to take action?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upgrade to Regulation Tracker ($29/yr) to get a personalized
            compliance checklist with deadlines, email/SMS alerts, and ESA
            tracking for your state.
          </p>
          <div className="mt-4">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--action)] hover:underline"
            >
              See plans →
            </Link>
          </div>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-[var(--meta)]">
          This summary is generated for informational purposes and is not legal
          advice. Consult an attorney for guidance specific to your situation.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
