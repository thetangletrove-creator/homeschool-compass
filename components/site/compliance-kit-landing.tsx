"use client"

import { useState } from "react"
import { Loader2, FileText, CheckSquare, Landmark, ScrollText, FolderArchive, Repeat, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

const STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "DC" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
]

const FEATURES = [
  {
    icon: FileText,
    title: "Parent Action Brief",
    desc: "2-page executive summary of deadlines, enacted changes, and required actions for the school year.",
  },
  {
    icon: CheckSquare,
    title: "Filing Checklist",
    desc: "Annual requirements — what to file, when, to whom, and what proof to keep. Printable with blank checkboxes.",
  },
  {
    icon: Landmark,
    title: "ESA Packet",
    desc: "Eligibility, deadline, award amount, required documentation, and receipt log for your state's ESA program.",
  },
  {
    icon: ScrollText,
    title: "Law Change Queue",
    desc: "Enacted bills first, proposed watch items second. Sorted by impact with confidence labels on every item.",
  },
  {
    icon: FolderArchive,
    title: "Record Binder",
    desc: "Printable evidence tracker for attendance, assessments, notices, receipts, and correspondence — year-end ready.",
  },
  {
    icon: Repeat,
    title: "Update Digest",
    desc: "When state rules change, your kit regenerates with a 'What changed since last version' summary.",
  },
]

export function ComplianceKitLanding() {
  const [selectedState, setSelectedState] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handlePurchase() {
    if (!selectedState) {
      setError("Select a state first")
      return
    }
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/checkout/kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: selectedState }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || "Something went wrong")
      }
    } catch {
      setError("Failed to start checkout. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const stateName = STATES.find((s) => s.code === selectedState)?.name || selectedState

  return (
    <main>
      {/* Hero */}
      <section className="bg-background py-20 md:pb-24 md:pt-28">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Left: hero copy + state picker */}
            <div className="lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-meta">
                ANNUAL COMPLIANCE KIT
              </p>
              <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-navy md:text-5xl">
                Stop reading homeschool law like it&apos;s a cursed PDF from 2009
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                The paid kit turns your state&apos;s rules, ESA deadlines, enacted bills, and
                watch items into a printable action system for the school year. Generated
                from live state data — not a static PDF from a government website.
              </p>

              {/* State picker + CTA */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:max-w-[220px]">
                  <select
                    value={selectedState}
                    onChange={(e) => { setSelectedState(e.target.value); setError("") }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    aria-label="Select your state"
                  >
                    <option value="">Select a state…</option>
                    {STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  size="lg"
                  className="rounded-lg bg-navy px-8 text-base font-medium text-primary-foreground hover:bg-navy/90"
                  onClick={handlePurchase}
                  disabled={loading || !selectedState}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {selectedState ? `Get my ${stateName} kit` : "Select your state"}
                </Button>
              </div>
              {error ? (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              ) : null}
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-semibold text-navy">$29</span> one-time —{" "}
                updated when your state&apos;s rules change
              </p>
            </div>

            {/* Right: visual card stack (desktop only) */}
            <div className="hidden lg:col-span-2 lg:relative lg:block">
              <div className="absolute inset-0 rounded-2xl bg-navy [background-image:radial-gradient(ellipse_at_30%_70%,rgba(120,180,255,0.12)_0%,transparent_70%)]" />
              <div className="relative flex flex-col gap-4 p-6 pt-12">
                {/* Card 1: Action Brief */}
                <div className="rounded-xl border border-white/10 bg-white/95 p-5 shadow-lg">
                  <p className="text-xs font-semibold text-navy">Iowa Parent Action Brief</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    SCHOOL YEAR 2026
                  </p>
                  <div className="mt-3 flex gap-3">
                    <span className="text-2xl font-bold text-navy">76</span>
                    <span className="text-sm text-muted-foreground">Freedom score</span>
                    <span className="ml-auto rounded-md bg-amber/10 px-2 py-0.5 text-xs font-medium text-amber">
                      Jun 30
                    </span>
                  </div>
                </div>
                {/* Card 2: ESA Claim */}
                <div className="relative -ml-3 rounded-xl border border-white/10 bg-white/95 p-5 shadow-lg">
                  <p className="text-xs font-semibold text-navy">ESA Claim Packet</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    STUDENTS FIRST ESA
                  </p>
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-3/4 rounded-full bg-green-500" />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-green-600">$7,800/yr</p>
                  </div>
                </div>
                {/* Card 3: Law Queue */}
                <div className="relative -ml-6 rounded-xl border border-white/10 bg-white/95 p-5 shadow-lg">
                  <p className="text-xs font-semibold text-navy">Law Change Queue</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    ENACTED · WATCH · ARCHIVE
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">3 new</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600">12 watch</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">227 archive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-border bg-muted/50 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-navy md:text-3xl">
            What the kit contains
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Built from your state&apos;s live data — freedom score, ESA details, tracked bills,
            impact summaries, action requirements, and effective dates.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-background p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/5">
                  <f.icon className="h-5 w-5 text-navy" />
                </div>
                <p className="mt-4 font-semibold text-foreground">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / legal disclaimer */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6">
          <div className="rounded-xl border border-amber/20 bg-amber/5 p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
              <div>
                <p className="font-medium text-amber">Not legal advice</p>
                <p className="mt-1 text-sm leading-relaxed text-amber/80">
                  Homeschool Compass provides compliance organization and legislative monitoring,
                  not attorney representation. Every item in your kit displays its data source
                  and confidence level. Consult a qualified attorney for legal guidance specific
                  to your situation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
