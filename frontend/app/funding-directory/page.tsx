"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ExternalLink, X } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { states } from "@/lib/data"
import type { NonEsaProgram } from "@/lib/types"
import { cn } from "@/lib/utils"

type ProgramWithState = NonEsaProgram & {
  stateCode: string
  stateName: string
}

const PROGRAM_TYPE_META: Record<string, { label: string }> = {
  allotment: { label: "Allotment" },
  deduction: { label: "Tax Deduction" },
  refundable_tax_credit: { label: "Refundable Tax Credit" },
  non_refundable_tax_credit: { label: "Tax Credit" },
  voucher: { label: "Voucher" },
  scholarship: { label: "Scholarship" },
  tuitioning: { label: "Tuitioning" },
  efct: { label: "EFTC" },
  pending: { label: "Pending" },
  other: { label: "Other" },
}

const PROGRAM_TYPES = Object.keys(PROGRAM_TYPE_META)

export default function FundingDirectoryPage() {
  const [search, setSearch] = useState("")
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [homeschoolOnly, setHomeschoolOnly] = useState(false)

  const allPrograms = useMemo<ProgramWithState[]>(() => {
    return states.flatMap((s) =>
      s.nonEsaPrograms.map((p) => ({
        ...p,
        stateCode: s.code,
        stateName: s.name,
      }))
    )
  }, [])

  const filtered = useMemo(() => {
    let result = allPrograms

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.stateName.toLowerCase().includes(q) ||
          p.stateCode.toLowerCase().includes(q)
      )
    }

    if (activeTypes.length > 0) {
      result = result.filter((p) => activeTypes.includes(p.program_type))
    }

    if (homeschoolOnly) {
      result = result.filter((p) => p.homeschool_eligible)
    }

    return result
  }, [allPrograms, search, activeTypes, homeschoolOnly])

  const toggleType = (type: string) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const clearFilters = () => {
    setSearch("")
    setActiveTypes([])
    setHomeschoolOnly(false)
  }

  const hasFilters = search || activeTypes.length > 0 || homeschoolOnly

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-cream">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6 md:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.05em] text-meta">
              Funding Directory
            </p>
            <h1 className="mt-3 text-pretty text-4xl font-bold tracking-tight text-navy md:text-5xl">
              Every program that helps fund homeschooling
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Vouchers, tax credits, scholarships, allotments, EFTC, and more —
              across all 50 states. Filter by program type and homeschool
              eligibility to find every funding stream available to your family.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by state or program name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-navy focus:ring-1 focus:ring-navy/20"
              />
            </div>

            {/* Type filter chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {PROGRAM_TYPES.map((type) => {
                const meta = PROGRAM_TYPE_META[type]
                const isActive = activeTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-border bg-white text-muted-foreground hover:border-violet-300 hover:text-violet-700"
                    )}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* Homeschool toggle + clear */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={homeschoolOnly}
                  onChange={(e) => setHomeschoolOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm font-medium text-foreground">
                  Homeschool eligible only
                </span>
              </label>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Result count */}
            <p className="mt-4 text-xs text-muted-foreground">
              {filtered.length} program{filtered.length !== 1 ? "s" : ""}{" "}
              {hasFilters ? "match your filters" : "across all states"}
            </p>
          </div>
        </section>

        {/* Results */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          {filtered.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((program, i) => (
                <article
                  key={`${program.stateCode}-${program.name}-${i}`}
                  className="rounded-xl border border-violet-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  {/* State badge + type badge */}
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/state/${program.stateCode.toLowerCase()}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200"
                    >
                      {program.stateCode}
                      <span className="font-normal text-violet-500">
                        {program.stateName}
                      </span>
                    </Link>
                    <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                      {PROGRAM_TYPE_META[program.program_type]?.label ?? program.program_type}
                    </span>
                  </div>

                  {/* Program name */}
                  <h3 className="mt-3 font-heading text-base font-bold text-navy leading-snug">
                    {program.name}
                  </h3>

                  {/* Amount */}
                  {program.amount && (
                    <p className="mt-1.5 text-lg font-bold text-violet-800">
                      {program.amount}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {program.homeschool_eligible ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Homeschool OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                        School only
                      </span>
                    )}
                    {program.status === "active" && (
                      <span className="inline-flex items-center rounded-full bg-safe/10 px-2 py-0.5 text-[10px] font-medium text-safe">
                        Active
                      </span>
                    )}
                    {program.status === "pending_launch" && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        Pending
                      </span>
                    )}
                    {program.status === "blocked" && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                        Blocked
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {program.short_description && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {program.short_description}
                    </p>
                  )}

                  {/* Income cap */}
                  {program.income_cap && program.income_cap !== "None" && (
                    <p className="mt-1.5 text-[11px] text-amber-700">
                      Income cap: {program.income_cap}
                    </p>
                  )}

                  {/* Application method + window */}
                  {(program.application_method || program.application_window) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {program.application_method && (
                        <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                          {program.application_method}
                        </span>
                      )}
                      {program.application_window && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                          {program.application_window}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Link */}
                  {program.url && (
                    <a
                      href={program.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Learn more
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card py-20 text-center">
              <p className="font-heading text-lg font-semibold text-navy">
                No programs match your filters
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search or clearing the filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
