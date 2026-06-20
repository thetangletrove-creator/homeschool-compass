import type { Metadata } from "next"
import { Lock, Eye, Server, ShieldCheck, FileSearch, Ban, Home } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import Link from "next/link"

export const metadata: Metadata = {
  title: "For Parents — Homeschool Compass",
  description:
    "Your data never leaves your device. How Homeschool Compass uses zero-knowledge encryption to protect your family's privacy — no accounts, no servers, no third parties.",
}

const guarantees = [
  {
    icon: Lock,
    title: "Your data never leaves your device",
    description:
      "When you fill in your details on Homeschool Compass, that information stays right where you typed it. Our server only gets one message: 'give me the Florida bundle.' No name. No address. No device ID tied to your identity.",
    bg: "bg-navy/[0.03]",
    iconBg: "bg-safe/20",
    iconColor: "text-safe",
  },
  {
    icon: Eye,
    title: "No data sent to any AI",
    description:
      "Your family's information never touches an AI model — not ChatGPT, not Gemini, not anything. Every calculation, every personalized recommendation happens right on your phone or browser. We don't outsource your data to anyone.",
    bg: "bg-navy/[0.03]",
    iconBg: "bg-action/20",
    iconColor: "text-action",
  },
  {
    icon: Server,
    title: "Nothing to sell, nothing to share",
    description:
      "We can't sell what we don't have. Advertisers, data brokers, government agencies — none of them can request your data from us because there's nothing to hand over. Our server keeps a library of laws and requirements, not a database of families.",
    bg: "bg-navy/[0.03]",
    iconBg: "bg-amber/20",
    iconColor: "text-amber",
  },
]

const comparisons = [
  {
    what: "When you search for Florida's ESA rules",
    typical: "Your search query gets logged, analyzed, and sold to advertisers",
    ours: "We fetch the Florida data bundle. That's it. No log, no profile, no tracking.",
  },
  {
    what: "When you add your child's grade and county",
    typical: "Stored on a server, linked to your email, used for retargeting",
    ours: "Stays on your device. Encrypted locally. The server never learns it.",
  },
  {
    what: "When you bookmark a bill that concerns you",
    typical: "Added to a marketing profile for 'homeschool-adjacent' advertising",
    ours: "Saved in your browser's local storage. Only you know what matters to you.",
  },
]

export default function ForParentsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 bg-[var(--background)]">
        {/* Hero — subdued, editorial */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-28">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-safe/20 bg-safe/[0.06] px-3 py-1.5">
              <Lock className="h-3.5 w-3.5 text-safe" />
              <span className="text-xs font-medium text-safe">
                Zero-Knowledge Architecture
              </span>
            </div>
            <h1 className="text-balance font-heading text-4xl font-bold leading-[1.1] tracking-tight text-navy md:text-5xl">
              We Don&apos;t Know Who You Are
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              There is no &ldquo;Create Account&rdquo; button. No &ldquo;Sign In with Google.&rdquo;
              No email required. Your personal information stays with you — our
              server has nothing to sell, leak, or share.
            </p>
          </div>
        </section>

        {/* How it works — the table */}
        <section className="border-b border-border bg-cream">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy">
              How It Works
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              No jargon. Here&apos;s exactly what happens with your data at each step.
            </p>

            <div className="mt-10 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-2 border-b border-border bg-navy/[0.03] px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-navy">
                  What happens
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-navy">
                  Where it lives
                </span>
              </div>
              {/* Table rows */}
              <div className="divide-y divide-border">
                <div className="grid grid-cols-2 gap-4 px-6 py-5">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      You pick your state and fill in your details
                    </p>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 px-2.5 py-1">
                      <Home className="h-3 w-3 text-safe" />
                      <span className="text-xs font-medium text-safe">
                        On your device — nowhere else
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 px-6 py-5">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      The app asks our server: &ldquo;Tell me about Florida&rsquo;s laws&rdquo;
                    </p>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-1">
                      <Server className="h-3 w-3 text-amber" />
                      <span className="text-xs font-medium text-amber">
                        Our server, temporarily
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 px-6 py-5">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      The server sends back the laws and requirements
                    </p>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 px-2.5 py-1">
                      <Lock className="h-3 w-3 text-safe" />
                      <span className="text-xs font-medium text-safe">
                        Your device decodes it locally
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 px-6 py-5">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      Your profile, your answers, your progress
                    </p>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 px-2.5 py-1">
                      <Home className="h-3 w-3 text-safe" />
                      <span className="text-xs font-medium text-safe">
                        Your device, forever
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              The whole transaction looks like this to our server: <em>give me the Florida
              bundle</em>. No name. No device ID tied to your identity. Just a request for
              public law data — the same way you&rsquo;d Google &ldquo;Florida homeschool
              requirements.&rdquo;
            </p>
          </div>
        </section>

        {/* Guarantees — three cards */}
        <section>
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy">
              The Stuff That Doesn&apos;t Happen
            </h2>
            <div className="mt-10 grid gap-6">
              {guarantees.map((g) => {
                const Icon = g.icon
                return (
                  <div
                    key={g.title}
                    className="rounded-lg border border-border bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${g.iconBg}`}
                      >
                        <Icon className={`h-5 w-5 ${g.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-navy">
                          {g.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {g.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="border-y border-border bg-cream">
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy">
              Typical vs. Homeschool Compass
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              Most websites treat your data as inventory. Here&apos;s the difference.
            </p>

            <div className="mt-10 space-y-6">
              {comparisons.map((c) => (
                <div
                  key={c.what}
                  className="rounded-lg border border-border bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-navy">{c.what}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-red-50 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-red-700">
                        <Ban className="h-3.5 w-3.5" />
                        Typical
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-red-800">
                        {c.typical}
                      </p>
                    </div>
                    <div className="rounded-md bg-emerald-50 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Compass
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                        {c.ours}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why we built it this way */}
        <section>
          <div className="mx-auto max-w-[760px] px-4 py-20 md:px-6 md:py-24">
            <div className="rounded-lg border border-safe/20 bg-safe/[0.04] p-8">
              <h2 className="font-heading text-xl font-semibold tracking-tight text-navy">
                Why We Built It This Way
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Homeschool families already deal with enough oversight. The last
                thing you need is another company logging everything you do and
                selling it to the highest bidder.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We decided from day one: <strong className="text-navy">the only way to guarantee we
                never misuse your data is to never have it.</strong> No server-side database
                of families. No data to leak. No &ldquo;we take your privacy
                seriously&rdquo; speech followed by fine-print loopholes. Just a clean
                architecture that makes those promises physically impossible to
                break.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Every homeschool tool could work this way. We just decided to actually do it.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/scorecard"
                className="inline-flex h-12 items-center justify-center rounded-md bg-navy px-8 text-base font-medium text-primary-foreground hover:bg-navy/90"
              >
                Check Your State&rsquo;s Grade →
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-white px-8 text-sm font-medium text-navy hover:bg-cream"
              >
                About Us & Our Architecture
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
