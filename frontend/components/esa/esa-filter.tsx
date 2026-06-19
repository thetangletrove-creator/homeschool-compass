"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Search,
  ArrowUpDown,
} from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import type { StateData } from "@/lib/data"

type SortKey = "name" | "award" | "deadline"

interface EsaFilterProps {
  active: StateData[]
  inactive: StateData[]
  altFunding: StateData[]
}

function formatAward(val: string | null | undefined): number {
  if (!val) return 0
  const match = val.replace(/[,$]/g, "").match(/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function formatDeadline(val: string | null | undefined): string {
  if (!val) return ""
  // Try to extract a month/day or just use as-is
  const match = val.match(/(\w+ \d+)/)
  return match ? match[1] : val
}

const MONTH_ORDER: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function deadlineOrder(val: string | null | undefined): number {
  const d = formatDeadline(val).toLowerCase()
  for (const [name, order] of Object.entries(MONTH_ORDER)) {
    if (d.startsWith(name)) return order
  }
  return 99
}

export function EsaFilter({ active, inactive, altFunding }: EsaFilterProps) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = active.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    )

    result.sort((a, b) => {
      let cmp = 0
      switch (sort) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "award": {
          const aProgs = a.esaPrograms.length > 0 ? a.esaPrograms : a.esa.active ? [a.esa] : []
          const bProgs = b.esaPrograms.length > 0 ? b.esaPrograms : b.esa.active ? [b.esa] : []
          const aMax = Math.max(...(aProgs as any[]).map((p) => formatAward(p.maxAward ?? p.max_award)))
          const bMax = Math.max(...(bProgs as any[]).map((p) => formatAward(p.maxAward ?? p.max_award)))
          cmp = aMax - bMax
          break
        }
        case "deadline": {
          const aProgs = a.esaPrograms.length > 0 ? a.esaPrograms : a.esa.active ? [a.esa] : []
          const bProgs = b.esaPrograms.length > 0 ? b.esaPrograms : b.esa.active ? [b.esa] : []
          const aDead = Math.min(...(aProgs as any[]).map((p) => deadlineOrder(p.deadline ?? p.deadline)))
          const bDead = Math.min(...(bProgs as any[]).map((p) => deadlineOrder(p.deadline ?? p.deadline)))
          cmp = aDead - bDead
          break
        }
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [active, search, sort, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSort(key)
      setSortDir(key === "deadline" ? "asc" : "asc")
    }
  }

  const sortLabel = (key: SortKey): string => {
    if (sort !== key) return ""
    return sortDir === "asc" ? "↑" : "↓"
  }

  return (
    <>
      {/* Filter + Sort controls */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by state name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-action focus:outline-none focus:ring-1 focus:ring-action"
            aria-label="Filter states by name or code"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {(["name", "award", "deadline"] as const).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === key
                  ? "bg-navy text-white"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              {key === "name" ? "State" : key === "award" ? "Award" : "Deadline"}
              {sort === key && (
                <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">No states matching "{search}"</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((s) => {
            const programs =
              s.esaPrograms.length > 0
                ? s.esaPrograms
                : s.esa.active
                  ? [
                      {
                        name: s.esa.name ?? "ESA Program",
                        max_award: s.esa.maxAward ?? null,
                        eligibility: s.esa.eligibility ?? null,
                        deadline: s.esa.deadline ?? null,
                        documents_required: s.esa.documentation ?? [],
                        platform: null,
                        portal_url: null,
                        application_url: null,
                        status: "active" as const,
                        forms: [],
                        deadlines: [],
                      },
                    ]
                  : []

            return (
              <article
                key={s.code}
                className="rounded-lg border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-lg font-bold text-navy">
                      {s.code}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {s.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-safe/10 px-3 py-1 font-mono text-xs uppercase tracking-wide text-safe">
                    Active
                  </span>
                </div>
                {programs.map((prog, i) => (
                  <div key={i}>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {prog.name}
                      </h3>
                      {prog.platform && (
                        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-medium text-navy">
                          {prog.platform}
                        </span>
                      )}
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                        <div>
                          <dt className="font-medium text-foreground">Maximum award</dt>
                          <dd className="font-mono text-muted-foreground">
                            {prog.max_award ?? "—"}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-action" />
                        <div>
                          <dt className="font-medium text-foreground">
                            Eligibility
                            <Tooltip content="Who qualifies: residency, grade, income, and special-needs requirements. Check the state portal for full criteria." side="right" />
                          </dt>
                          <dd className="text-muted-foreground">
                            {prog.eligibility ?? "—"}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                        <div>
                          <dt className="font-medium text-foreground">Deadline</dt>
                          <dd className="font-mono text-muted-foreground">
                            {prog.deadline ?? "—"}
                          </dd>
                        </div>
                      </div>
                    </dl>

                    {prog.documents_required.length > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                          Required documentation
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {prog.documents_required.map((doc) => (
                            <li
                              key={doc}
                              className="flex gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-meta" />
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(prog.portal_url || prog.application_url) && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {prog.portal_url && (
                          <a
                            href={prog.portal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-action hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit portal
                          </a>
                        )}
                        {prog.application_url && (
                          <a
                            href={prog.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-action hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Apply now
                          </a>
                        )}
                      </div>
                    )}

                    {i < programs.length - 1 && <hr className="my-4 border-border" />}
                  </div>
                ))}

                <Link
                  href={`/state/${s.code.toLowerCase()}`}
                  className="mt-5 inline-block text-sm font-medium text-action hover:underline"
                >
                  View {s.name} requirements
                </Link>
              </article>
            )
          })}
        </div>
      )}

      {/* Inactive states — no filtering needed here */}
      <h2 className="mt-16 text-2xl font-semibold tracking-tight text-navy">
        No active program
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        These states do not currently offer an ESA program. Track bills that could create one.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {inactive.map((s) => (
          <Link
            key={s.code}
            href={`/state/${s.code.toLowerCase()}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-sm text-navy transition-colors hover:border-slate-300 hover:bg-cream"
          >
            {s.code}
          </Link>
        ))}
      </div>

      {/* Alternative Funding */}
      {altFunding.length > 0 && (
        <>
          <h2 className="mt-16 text-2xl font-semibold tracking-tight text-navy">
            Alternative Funding Programs
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These states don&apos;t offer an ESA, but have other funding programs that can help with homeschooling costs.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {altFunding.map((s) => (
              <article
                key={s.code}
                className="rounded-lg border border-violet-200 bg-violet-50 p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-lg font-bold text-violet-900">
                      {s.code}
                    </span>
                    <span className="ml-2 text-sm text-violet-700">{s.name}</span>
                  </div>
                  <span className="rounded-full bg-violet-600/10 px-3 py-1 font-mono text-xs uppercase tracking-wide text-violet-700">
                    {s.nonEsaPrograms.length} program{s.nonEsaPrograms.length > 1 ? "s" : ""}
                  </span>
                </div>
                {s.nonEsaPrograms.map((prog, i) => (
                  <div key={i} className="mt-4 rounded-xl border border-violet-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-violet-900">{prog.name}</p>
                      {prog.homeschool_eligible && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                          Homeschool OK
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-violet-600 uppercase tracking-wide">
                      {prog.program_type.replace(/_/g, " ")}
                    </p>
                    {prog.amount && (
                      <p className="mt-2 text-lg font-bold text-violet-800">{prog.amount}</p>
                    )}
                    {prog.short_description && (
                      <p className="mt-1 text-xs text-muted-foreground">{prog.short_description}</p>
                    )}
                    {(prog.application_method || prog.application_window) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {prog.application_method && (
                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-600">
                            {prog.application_method}
                          </span>
                        )}
                        {prog.application_window && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-600">
                            {prog.application_window}
                          </span>
                        )}
                      </div>
                    )}
                    {prog.url && (
                      <a
                        href={prog.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
                      >
                        Learn more →
                      </a>
                    )}
                  </div>
                ))}
              </article>
            ))}
          </div>
        </>
      )}

      <p className="mt-12 text-xs leading-relaxed text-meta">
        Program details are illustrative. ESA rules change frequently — verify award amounts and
        deadlines with your state administrator. This is not legal or financial advice.
      </p>
    </>
  )
}
