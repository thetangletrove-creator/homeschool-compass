import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Plus, Share2 } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { StatusTimeline } from "@/components/site/status-timeline"
import { ImpactBadge, StateBadge } from "@/components/site/badges"
import { Button } from "@/components/ui/button"
import { getBill, getState, BILL_STEPS } from "@/lib/data"

export function generateStaticParams() {
  return []
}

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bill = getBill(id)
  if (!bill) notFound()
  const state = getState(bill.stateCode)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:px-6 md:py-16">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bill feed
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
            <span className="rounded-sm bg-[var(--safe)]/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wide text-[var(--safe)]">
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
            Read Full Analysis
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

        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
              Regulatory Impact
            </h2>
            <ImpactBadge impact={bill.impact} />
          </div>
          <p className="mt-4 text-base text-foreground">{bill.impactSummary}</p>
          <div className="mt-5 rounded-md bg-[var(--cream)] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
              Change Summary
            </p>
            <p className="mt-1.5 font-mono text-sm leading-relaxed text-foreground">
              {bill.delta}
            </p>
          </div>
          <div className="mt-4 border-l-4 border-[var(--amber)] bg-[var(--amber)]/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--amber)]">
              Action Required
            </p>
            <p className="mt-1.5 text-sm text-foreground">
              {bill.actionRequired}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
            Analysis
          </h2>
          <ul className="mt-4 space-y-3">
            {bill.analysis.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--action)]" />
                <span className="text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </section>

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

        <p className="mt-8 text-xs leading-relaxed text-[var(--meta)]">
          This summary is generated for informational purposes and is not legal
          advice. Consult an attorney for guidance specific to your situation.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
