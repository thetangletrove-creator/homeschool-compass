import type { Metadata } from "next"
import Image from "next/image"
import { ShieldCheck } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "About — Homeschool Compass",
  description:
    "Why we built a regulatory intelligence platform for homeschool families, our methodology, and our data sources.",
}

const team = [
  {
    name: "Dana Whitfield",
    role: "Founder & Policy Lead",
    bio: "Former state education policy analyst. Homeschools three children in Texas.",
    photo: "/team/founder.png",
  },
  {
    name: "Marcus Reyes",
    role: "Engineering Lead",
    bio: "Built ingestion pipelines for civic data nonprofits. Owns the change-detection system.",
    photo: "/team/engineer.png",
  },
  {
    name: "Priya Nadeau",
    role: "Legislative Analyst",
    bio: "Tracks statute changes across all 50 states and maintains HSLDA-aligned categorization.",
    photo: "/team/analyst.png",
  },
]

const sources = ["LegiScan", "OpenStates", "HSLDA"]

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 bg-[var(--cream)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <h1 className="text-pretty text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">
            Why we built this
          </h1>

          <div className="mt-12 space-y-12">
            <section>
              <h2 className="text-xl font-semibold text-[var(--navy)]">
                The problem
              </h2>
              <p className="mt-3 text-base leading-relaxed text-foreground">
                Homeschool families discover regulation changes too late —
                often after filing deadlines have already passed. A bill
                introduced in committee can change reporting, testing, or
                curriculum requirements with little public notice, and existing
                resources surface the change only after it is law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--navy)]">
                Our approach
              </h2>
              <p className="mt-3 text-base leading-relaxed text-foreground">
                We process 30,000+ API queries monthly across LegiScan and
                OpenStates, with change-hash detection for incremental sync.
                Each new or amended bill is analyzed and categorized against an
                HSLDA-aligned taxonomy, then mapped to the specific requirement
                it would create, remove, or modify. The result is a per-state
                regulatory picture that updates as legislation moves — not after
                it is enacted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--navy)]">
                Who we are
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                {team.map((member) => (
                  <div key={member.name} className="text-center">
                    <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border border-border">
                      <Image
                        src={member.photo || "/placeholder.svg"}
                        alt={`Portrait of ${member.name}`}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-[var(--navy)]">
                      {member.name}
                    </h3>
                    <p className="font-mono text-xs uppercase tracking-wide text-[var(--meta)]">
                      {member.role}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {member.bio}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--navy)]">
                Data sources
              </h2>
              <p className="mt-3 text-base leading-relaxed text-foreground">
                Our regulatory picture is built from primary legislative data
                and aligned with established homeschool legal categorization.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {sources.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border bg-card px-4 py-2 font-mono text-sm text-[var(--navy)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--safe)]/30 bg-[var(--safe)]/5 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[var(--safe)]" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--navy)]">
                    Accuracy guarantee
                  </h2>
                  <p className="mt-2 text-base leading-relaxed text-foreground">
                    If we miss a bill that affects your state, your next year is
                    free.
                  </p>
                </div>
              </div>
            </section>

            <p className="text-xs leading-relaxed text-[var(--meta)]">
              Homeschool Compass provides regulatory intelligence and is not a
              substitute for legal advice. Consult an attorney for guidance
              specific to your situation.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
