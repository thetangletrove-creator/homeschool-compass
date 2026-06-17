import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, AlertTriangle } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "How We Score Homeschool Freedom — Methodology — Homeschool Compass",
  description:
    "Our 50-state scorecard measures homeschool regulation burden on a 0–100 scale. Learn how we score Reporting, Testing, Curriculum Freedom, and Teacher Qualifications.",
}

const CATEGORIES = [
  {
    name: "Reporting Burden",
    weight: "30%",
    scores: [
      { range: "25/25", desc: "No notice required. No filing. No records required.", examples: "Idaho, Alaska, Texas" },
      { range: "20/25", desc: "Minimal notice required (e.g., letter of intent, one-time filing)", examples: "Missouri, Illinois" },
      { range: "15/25", desc: "Annual notice required + basic record-keeping", examples: "Florida, Virginia" },
      { range: "10/25", desc: "Annual notice + detailed records + periodic reporting", examples: "Ohio, Washington" },
      { range: "5/25", desc: "Extensive reporting (quarterly reports, detailed narratives)", examples: "New York, Pennsylvania" },
      { range: "0/25", desc: "Supervision by certified teacher or school district", examples: "—" },
    ],
    source: "State DOE websites, state statutes, HSLDA state law summaries",
  },
  {
    name: "Testing Mandate",
    weight: "25%",
    scores: [
      { range: "25/25", desc: "No testing required. No assessments.", examples: "Idaho, Texas, Alaska" },
      { range: "20/25", desc: "Optional testing or portfolio review", examples: "California, Colorado" },
      { range: "15/25", desc: "Testing required in some grades (e.g., 3, 5, 8, 10)", examples: "Pennsylvania, Ohio" },
      { range: "10/25", desc: "Testing required in most grades OR annual evaluation by certified teacher", examples: "New York, Florida" },
      { range: "5/25", desc: "Testing required every year + must use state-approved test", examples: "—" },
      { range: "0/25", desc: "Testing required every year + results submitted to state", examples: "—" },
    ],
    source: "State DOE testing requirements, state statute text",
  },
  {
    name: "Curriculum Freedom",
    weight: "25%",
    scores: [
      { range: "25/25", desc: "No required subjects. No curriculum approval. Complete freedom.", examples: "Idaho, Alaska" },
      { range: "20/25", desc: "Broad subject list required but no approval needed", examples: "Texas, California" },
      { range: "15/25", desc: "Specific subject list required + some format restrictions", examples: "Florida, Virginia" },
      { range: "10/25", desc: "Detailed subject list + required hours + curriculum must be 'equivalent'", examples: "Pennsylvania, New York" },
      { range: "5/25", desc: "Curriculum must be pre-approved by school district or state board", examples: "—" },
      { range: "0/25", desc: "Must use state-approved curriculum only", examples: "—" },
    ],
    source: "State DOE curriculum guidelines, state statutes, HSLDA summaries",
  },
  {
    name: "Teacher Qualification",
    weight: "20%",
    scores: [
      { range: "25/25", desc: "No qualifications required. No degree, no certification.", examples: "Idaho, Texas, Alaska" },
      { range: "20/25", desc: "High school diploma or GED required", examples: "California, Missouri" },
      { range: "15/25", desc: "Some college credit or specific coursework required", examples: "—" },
      { range: "10/25", desc: "Bachelor's degree required OR annual evaluation by certified teacher", examples: "—" },
      { range: "5/25", desc: "Teaching certificate required OR supervision by certified teacher", examples: "—" },
      { range: "0/25", desc: "State-certified teacher required for all instruction", examples: "—" },
    ],
    source: "State DOE teacher qualification rules, state statutes",
  },
]

function gradeFromScore(score: number): string {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  if (score >= 60) return "D"
  return "F"
}

export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-16">
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
              Methodology
            </span>
            <h1 className="mt-3 max-w-3xl text-balance font-heading text-3xl font-bold tracking-tight text-navy md:text-4xl">
              How We Score Homeschool Freedom
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Our 50-state scorecard measures homeschool regulation burden on a 0–100 scale.
              Higher scores mean fewer restrictions. Lower scores mean more requirements.
            </p>
            <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
              <span>Last reviewed: <strong className="text-navy">June 2026</strong></span>
              <span>Next review: <strong className="text-navy">January 2027</strong></span>
            </div>
          </div>
        </section>

        {/* The Four Categories */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy md:text-3xl">
              The Four Categories
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              This methodology is aligned with the HSLDA framework for categorizing state
              homeschool laws. We score every state across four categories, then weight and
              combine them into a composite score.
            </p>

            <div className="mt-12 space-y-16">
              {CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-heading text-xl font-semibold text-navy">
                      {cat.name}
                    </h3>
                    <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Weight: {cat.weight}
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-cream text-left text-xs font-medium uppercase tracking-[0.03em] text-muted-foreground">
                          <th className="px-4 py-3 w-20">Score</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 hidden md:table-cell">Examples</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {cat.scores.map((s) => (
                          <tr key={s.range} className="hover:bg-cream/50">
                            <td className="px-4 py-3 font-mono text-sm font-medium text-navy">
                              {s.range}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.desc}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-muted-foreground/70">
                              {s.examples}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground/60">
                    Data sources: {cat.source}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How We Calculate */}
        <section className="border-y border-border bg-cream py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy md:text-3xl">
              How We Calculate the Composite Score
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-semibold text-navy">Formula</h3>
                <div className="rounded-lg border border-border bg-card p-5 font-mono text-sm leading-loose text-muted-foreground">
                  Score = Reporting(30%) + Testing(25%) + Curriculum(25%) + Teacher(20%)
                </div>
                <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                  <li>Score each category 0–25 using the rubric above</li>
                  <li>Weight and sum: 0–100</li>
                  <li>Round to nearest whole number</li>
                  <li>Assign letter grade: A (90–100), B (80–89), C (70–79), D (60–69), F (0–59)</li>
                </ol>
              </div>

              <div className="space-y-6">
                <h3 className="font-heading text-lg font-semibold text-navy">Examples</h3>

                {/* California */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy">California</span>
                    <span className="rounded-full bg-[#ea580c]/10 px-3 py-0.5 text-sm font-bold text-[#ea580c]">
                      Grade D — 42/100
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p>Reporting: 10/25 × 30% = 12</p>
                    <p>Testing: 15/25 × 25% = 15</p>
                    <p>Curriculum: 10/25 × 25% = 10</p>
                    <p>Teacher: 5/25 × 20% = 4</p>
                    <p className="border-t border-border pt-1.5 font-semibold text-navy">
                      Total: 12 + 15 + 10 + 4 = 41 → 42
                    </p>
                  </div>
                </div>

                {/* Idaho */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy">Idaho</span>
                    <span className="rounded-full bg-[#16a34a]/10 px-3 py-0.5 text-sm font-bold text-[#16a34a]">
                      Grade A — 100/100
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p>Reporting: 25/25 × 30% = 30</p>
                    <p>Testing: 25/25 × 25% = 25</p>
                    <p>Curriculum: 25/25 × 25% = 25</p>
                    <p>Teacher: 25/25 × 20% = 20</p>
                    <p className="border-t border-border pt-1.5 font-semibold text-navy">
                      Total: 30 + 25 + 25 + 20 = 100
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy md:text-3xl">
              Data Sources &amp; Verification
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-navy">Primary sources</h3>
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  <li>State Department of Education websites (linked per state)</li>
                  <li>State statute text (linked where available)</li>
                  <li>HSLDA State Law summaries (hslda.org)</li>
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-navy">Secondary sources</h3>
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  <li>OpenStates legislative data API</li>
                  <li>LegiScan bill tracking API</li>
                  <li>Johns Hopkins Homeschool Hub research</li>
                  <li>State homeschool organization websites</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-navy">Update frequency</h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
                <li><strong className="text-navy">Annual review:</strong> Every January, we review all 50 states for law changes</li>
                <li><strong className="text-navy">Triggered review:</strong> When our pipeline detects a signed bill that changes homeschool law, we update that state within 48 hours</li>
                <li><strong className="text-navy">Emergency review:</strong> If a bill is signed with immediate effect, we update within 24 hours</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="border-y border-border bg-cream py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy md:text-3xl">
              Limitations &amp; Caveats
            </h2>
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber/30 bg-amber/[0.06] p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
              <div className="text-sm leading-relaxed text-muted-foreground">
                <ol className="list-inside list-decimal space-y-2">
                  <li>This scorecard measures <strong>regulation burden</strong>, not homeschool quality or outcomes.</li>
                  <li>A low score (D/F) does not mean homeschooling is &ldquo;bad&rdquo; in that state — it means there are more requirements to follow.</li>
                  <li>Some states have local district variations that our state-level score cannot capture.</li>
                  <li>ESA program rules are tracked separately and do not affect the freedom score.</li>
                  <li>This is not legal advice. Always consult your state DOE and an attorney for your specific situation.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy md:text-3xl">
                Ready to see where your state stands?
              </h2>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/scorecard"
                  className={buttonVariants({ className: "h-12 rounded-md bg-navy px-8 text-base font-medium text-primary-foreground hover:bg-navy/90" })}
                >
                  See the Full 50-State Scorecard
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
                <Link
                  href="/sign-up"
                  className={buttonVariants({ variant: "outline", className: "h-12 rounded-md px-8 text-base font-medium" })}
                >
                  Get Alerts When Your State Changes
                </Link>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                Found an error? <Link href="mailto:support@homeschoolcompass.com" className="text-action underline underline-offset-4 hover:no-underline">Report it here</Link> — we review all corrections within 5 business days.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
