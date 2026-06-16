import type { Metadata } from "next"
import Link from "next/link"
import { Calendar, CheckCircle2, DollarSign } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { states } from "@/lib/data"

export const metadata: Metadata = {
  title: "ESA Compliance Guide — Homeschool Compass",
  description:
    "Education Savings Account programs by state: award amounts, eligibility, required documentation, and deadlines.",
}

export default function EsaPage() {
  const active = states.filter((s) => s.esa.active)
  const inactive = states.filter((s) => !s.esa.active)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border bg-[var(--cream)]">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 md:px-6 md:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.05em] text-[var(--meta)]">
              ESA Compliance Guide
            </p>
            <h1 className="mt-3 text-pretty text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">
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
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--navy)]">
            Active programs
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {active.map((s) => (
              <article
                key={s.code}
                className="rounded-lg border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-lg font-bold text-[var(--navy)]">
                      {s.code}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {s.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-[var(--safe)]/10 px-3 py-1 font-mono text-xs uppercase tracking-wide text-[var(--safe)]">
                    Active
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {s.esa.name}
                </h3>

                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-[var(--safe)]" />
                    <div>
                      <dt className="font-medium text-foreground">
                        Maximum award
                      </dt>
                      <dd className="font-mono text-muted-foreground">
                        {s.esa.maxAward}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--action)]" />
                    <div>
                      <dt className="font-medium text-foreground">
                        Eligibility
                      </dt>
                      <dd className="text-muted-foreground">
                        {s.esa.eligibility}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber)]" />
                    <div>
                      <dt className="font-medium text-foreground">Deadline</dt>
                      <dd className="font-mono text-muted-foreground">
                        {s.esa.deadline}
                      </dd>
                    </div>
                  </div>
                </dl>

                {s.esa.documentation && s.esa.documentation.length > 0 ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--meta)]">
                      Required documentation
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {s.esa.documentation.map((doc) => (
                        <li
                          key={doc}
                          className="flex gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--meta)]" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Link
                  href={`/state/${s.code.toLowerCase()}`}
                  className="mt-5 inline-block text-sm font-medium text-[var(--action)] hover:underline"
                >
                  View {s.name} requirements
                </Link>
              </article>
            ))}
          </div>

          <h2 className="mt-16 text-2xl font-semibold tracking-tight text-[var(--navy)]">
            No active program
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These states do not currently offer an ESA program. Track bills that
            could create one.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {inactive.map((s) => (
              <Link
                key={s.code}
                href={`/state/${s.code.toLowerCase()}`}
                className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-sm text-[var(--navy)] transition-colors hover:border-slate-300 hover:bg-[var(--cream)]"
              >
                {s.code}
              </Link>
            ))}
          </div>

          <p className="mt-12 text-xs leading-relaxed text-[var(--meta)]">
            Program details are illustrative. ESA rules change frequently —
            verify award amounts and deadlines with your state administrator.
            This is not legal or financial advice.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
