import type { Metadata } from "next"
import Image from "next/image"
import { ShieldCheck, Lock, Map, Bell, FileText, DollarSign } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "About — Homeschool Compass",
  description:
    "Why we built a regulatory intelligence platform for homeschool families, our zero-knowledge architecture, methodology, and the team behind it.",
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

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 bg-[var(--background)]">
        <section className="border-b border-border">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-28">
            <h1 className="text-balance font-heading text-4xl font-bold leading-[1.1] tracking-tight text-navy md:text-5xl">
              Armor for the Funded Homeschool
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              We built a regulatory intelligence platform that tracks every bill
              affecting homeschoolers across all 50 states — and we made sure
              your personal data never leaves your device.
            </p>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-amber">
                  The problem
                </span>
                <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight text-navy">
                  Families discover changes too late
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  A bill introduced in committee can change reporting, testing,
                  or curriculum requirements with little public notice. Existing
                  resources surface the change only after it is law — often
                  after filing deadlines have already passed. One missed notice
                  can jeopardize thousands in ESA funding.
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-safe">
                  Our mission
                </span>
                <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight text-navy">
                  Know before the laws change
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  We turn government opacity into clear, timely intelligence.
                  Every bill that affects your state gets tracked, analyzed, and
                  presented in plain language — so you can act before the
                  deadline, not after.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy">
              How It Works
            </h2>
            <div className="mt-10 grid gap-4">
              {[
                { step: "1", title: "Monitor", desc: "We process 30,000+ API queries monthly across LegiScan and OpenStates, with change-hash detection for incremental sync.", icon: Map },
                { step: "2", title: "Analyze", desc: "Each new or amended bill is categorized against an HSLDA-aligned taxonomy and scored for impact — how it would change reporting, testing, curriculum, or funding requirements.", icon: FileText },
                { step: "3", title: "Alert", desc: "You get notified before deadlines — not after. No noise, just the bills that affect your state and your situation.", icon: Bell },
                { step: "4", title: "Protect", desc: "For families with ESA accounts, our provider invoice portal uses zero-knowledge encryption — provider credentials never reach our server unencrypted.", icon: DollarSign },
              ].map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.step} className="flex items-start gap-4 rounded-lg border border-border bg-white p-5 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary-foreground">
                      {s.step}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-navy">{s.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <div className="rounded-lg border border-safe/20 bg-safe/[0.04] p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-safe/20">
                  <Lock className="h-6 w-6 text-safe" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.05em] text-safe">
                    Privacy by Architecture
                  </span>
                  <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-navy">
                    Your Data Never Touches Our Server
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Most homeschool tools ask you to create an account, share
                    your email, and trust them not to sell your data. We took a
                    different approach:{" "}
                    <strong className="text-navy">
                      we built a system where your data physically cannot reach us.
                    </strong>
                  </p>
                  <ul className="mt-4 space-y-3">
                    {[
                      "No account creation — no email, no password, no profile on our end",
                      "All personalized data stays in your browser's local storage",
                      "Our server only sees public requests: 'give me the Florida bundle'",
                      "Provider invoice portal uses RSA-OAEP + AES-256-GCM encryption — keys never leave your device",
                      "No data is ever sent to any AI model, third party, or advertiser",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <a
                      href="/for-parents"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-action underline-offset-4 hover:underline"
                    >
                      Full explanation for parents →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-navy">Data Sources</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Our regulatory picture is built from primary legislative data and aligned with established homeschool legal frameworks.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {["LegiScan", "OpenStates", "State DOE Records", "HSLDA Framework", "Gemini AI"].map((s) => (
                <span key={s} className="inline-flex items-center rounded-full border border-navy/10 bg-navy/[0.03] px-4 py-1.5 text-xs font-medium text-navy">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-navy">Who We Are</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A small team of policy analysts and engineers who believe homeschool families deserve clear, timely compliance information.
            </p>
            <div className="mt-10 grid gap-10 sm:grid-cols-3">
              {team.map((member) => (
                <div key={member.name}>
                  <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border border-border">
                    <Image src={member.photo || "/placeholder.svg"} alt={`Portrait of ${member.name}`} fill sizes="112px" className="object-cover" />
                  </div>
                  <h3 className="mt-4 text-center text-base font-semibold text-navy">{member.name}</h3>
                  <p className="text-center font-mono text-xs uppercase tracking-[0.05em] text-meta">{member.role}</p>
                  <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-safe" />
                <div>
                  <h2 className="text-base font-semibold text-navy">Our Guarantee</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    If our tracking misses a bill that affects your state, your next year is free. We stand behind our data.
                  </p>
                  <p className="mt-4 text-xs leading-relaxed text-meta">
                    Homeschool Compass provides regulatory intelligence and is not a substitute for legal advice. Consult an attorney for guidance specific to your situation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
