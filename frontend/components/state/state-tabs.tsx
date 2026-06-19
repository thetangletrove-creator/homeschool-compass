"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, MinusCircle, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BillCard } from "@/components/site/bill-card"
import type { Bill, StateData, Impact } from "@/lib/data"
import { cn } from "@/lib/utils"

const METRICS: Array<{ key: keyof StateData["subscores"]; label: string; desc: string }> = [
  { key: "reporting", label: "Reporting Burden", desc: "Notice, recordkeeping, and filing requirements." },
  { key: "testing", label: "Testing Mandate", desc: "Standardized testing and assessment obligations." },
  { key: "curriculum", label: "Curriculum Freedom", desc: "Latitude to choose subjects and materials." },
  { key: "teacher", label: "Teacher Qualification", desc: "Parent credential or education requirements." },
]

const STATUS_META = {
  compliant: { label: "Compliant", Icon: CheckCircle2, color: "text-safe" },
  pending: { label: "Pending", Icon: Clock, color: "text-amber" },
  "not-applicable": { label: "Not applicable", Icon: MinusCircle, color: "text-meta" },
} as const

function barColor(score: number) {
  if (score >= 80) return "var(--safe)"
  if (score >= 60) return "var(--amber)"
  return "var(--reg-up)"
}

function chipColor(level: string) {
  if (level === "safe") return "bg-safe/10 text-safe border-safe/20"
  if (level === "amber") return "bg-amber/10 text-amber border-amber/20"
  if (level === "red") return "bg-red-50 text-red-700 border-red-200"
  return "bg-muted text-muted-foreground border-border"
}

function subscoreLevel(score: number): { label: string; tone: string } {
  if (score >= 80) return { label: "Low Restriction", tone: "safe" }
  if (score >= 60) return { label: "Moderate", tone: "amber" }
  return { label: "High Restriction", tone: "red" }
}

const IMPACT_FILTERS: Array<{ value: Impact | "all"; label: string; icon: React.ReactNode }> = [
  { value: "all", label: "All Bills", icon: null },
  { value: "increase", label: "Increases Regulation", icon: <ArrowUpRight className="h-3.5 w-3.5 text-reg-up" /> },
  { value: "decrease", label: "Decreases Regulation", icon: <ArrowDownRight className="h-3.5 w-3.5 text-safe" /> },
]

export function StateTabs({
  state,
  stateBills,
}: {
  state: StateData
  stateBills: Bill[]
}) {
  const [activeTab, setActiveTab] = useState("overview")
  const [impactFilter, setImpactFilter] = useState<Impact | "all">("all")

  const handleMetricClick = useCallback((_key: string) => {
    setActiveTab("bills")
  }, [])

  const filteredBills = impactFilter === "all"
    ? stateBills
    : stateBills.filter(b => b.impact === impactFilter)

  const increaseCount = stateBills.filter(b => b.impact === "increase").length

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-border bg-card p-1">
        {[
          ["overview", "Overview"],
          ["bills", `Bills (${stateBills.length})`],
          ["requirements", "Requirements"],
          ["esa", "ESA Program"],
          ["legal", "Legal Precedent"],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-navy data-[state=active]:text-primary-foreground"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview">
        {/* Restriction level chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {METRICS.map((m) => {
            const score = state.subscores[m.key]
            const level = subscoreLevel(score)
            return (
              <button
                key={m.key}
                onClick={() => handleMetricClick(m.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm",
                  chipColor(level.tone),
                  "cursor-pointer"
                )}
              >
                {m.label}: {level.label}
                <ArrowUpRight className="h-3 w-3 opacity-60" />
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {METRICS.map((m) => {
            const score = state.subscores[m.key]
            const level = subscoreLevel(score)
            return (
              <button
                key={m.key}
                onClick={() => handleMetricClick(m.key)}
                className={cn(
                  "group rounded-lg border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                  "cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-base font-semibold text-navy group-hover:text-action">
                    {m.label}
                  </h3>
                  <span className="font-mono text-lg font-bold text-navy">
                    {score}
                    <span className="ml-1.5 text-xs font-normal text-meta">/100</span>
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all group-hover:opacity-80"
                    style={{ width: `${score}%`, backgroundColor: barColor(score) }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {m.desc}
                  </p>
                  <span
                    className={cn(
                      "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      level.tone === "red" && "bg-red-50 text-red-700",
                      level.tone === "amber" && "bg-amber/10 text-amber",
                      level.tone === "safe" && "bg-safe/10 text-safe",
                    )}
                  >
                    {level.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-action opacity-0 transition-opacity group-hover:opacity-100">
                  Click to see relevant bills →
                </p>
              </button>
            )
          })}
        </div>
      </TabsContent>

      {/* Current Bills */}
      <TabsContent value="bills">
        {stateBills.length > 0 ? (
          <>
            {/* Impact filter chips */}
            <div className="mb-4 flex flex-wrap gap-2">
              {IMPACT_FILTERS.map((f) => {
                const count = f.value === "all"
                  ? stateBills.length
                  : stateBills.filter(b => b.impact === f.value).length
                return (
                  <button
                    key={f.value}
                    onClick={() => setImpactFilter(f.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      impactFilter === f.value
                        ? "border-navy bg-navy text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-slate-300 hover:text-foreground"
                    )}
                  >
                    {f.icon}
                    {f.label}
                    <span className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[10px]",
                      impactFilter === f.value ? "bg-white/20" : "bg-muted"
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {increaseCount > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber/5 border border-amber/20 px-4 py-2 text-sm text-amber">
                <ArrowUpRight className="h-4 w-4 shrink-0" />
                <span>
                  {increaseCount} bill{increaseCount !== 1 ? "s" : ""} {increaseCount !== 1 ? "are" : "is"} increasing regulation —{" "}
                  <span className="font-medium">requires attention</span>
                </span>
              </div>
            )}

            {filteredBills.length > 0 ? (
              <div className="flex flex-col gap-4">
                {filteredBills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
                <p className="font-heading text-lg font-semibold text-navy">
                  No {impactFilter !== "all" ? `${impactFilter} ` : ""}bills for {state.name}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different filter or check back after the next LegiScan sync.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <p className="font-heading text-lg font-semibold text-navy">
              No active bills for {state.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              We scan for new bills every 4 hours. Check back tomorrow or set up
              an alert.
            </p>
          </div>
        )}
      </TabsContent>

      {/* Requirements — live from complianceForms when available */}
      <TabsContent value="requirements">
        {(() => {
          // Build requirement rows from complianceForms JSONB, fallback to mock
          const hasCompliance = state.complianceForms &&
            (state.complianceForms.notification_url ||
             state.complianceForms.notification_form_url ||
             state.complianceForms.assessment_rules ||
             state.complianceForms.immunization_rules ||
             state.complianceForms.instruction_days)

          const reqRows = hasCompliance
            ? [
                ...(state.complianceForms.notification_url || state.complianceForms.notification_form_url
                  ? [{
                      name: "File notice of intent to homeschool",
                      detail: state.complianceForms.notification_url ?? "Required at withdrawal",
                      url: state.complianceForms.notification_url ?? state.complianceForms.notification_form_url,
                      status: "compliant" as const,
                    }]
                  : []),
                ...(state.complianceForms.assessment_rules
                  ? [{
                      name: "Standardized testing or portfolio review",
                      detail: state.complianceForms.assessment_rules,
                      url: state.complianceForms.assessment_form_url,
                      status: "pending" as const,
                    }]
                  : []),
                ...(state.complianceForms.immunization_rules
                  ? [{
                      name: "Immunization records on file",
                      detail: state.complianceForms.immunization_rules,
                      url: null,
                      status: "compliant" as const,
                    }]
                  : []),
                ...(state.complianceForms.instruction_days
                  ? [{
                      name: "Instruction days requirement",
                      detail: state.complianceForms.instruction_days,
                      url: null,
                      status: "compliant" as const,
                    }]
                  : []),
                ...(state.complianceForms.recordkeeping
                  ? [{
                      name: "Recordkeeping requirement",
                      detail: state.complianceForms.recordkeeping,
                      url: null,
                      status: "compliant" as const,
                    }]
                  : []),
                ...(state.complianceForms.other_forms?.map(f => ({
                  name: f.name,
                  detail: f.type === "PDF" ? "PDF form — download and submit" : f.type === "web_portal" ? "Web portal submission" : "Form submission",
                  url: f.url,
                  status: "pending" as const,
                })) ?? []),
              ]
            : state.requirements.map(r => ({
                name: r.name,
                detail: r.deadline,
                url: r.formUrl === "#" ? null : r.formUrl,
                status: r.status as "compliant" | "pending" | "not-applicable",
              }))

          return (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream text-xs uppercase tracking-[0.04em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Requirement</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reqRows.map((req) => {
                    const meta = STATUS_META[req.status] ?? STATUS_META["not-applicable"]
                    return (
                      <tr
                        key={req.name}
                        className="border-t border-border bg-card transition-colors hover:bg-cream"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {req.url ? (
                            <a
                              href={req.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-action hover:underline"
                            >
                              {req.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            req.name
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {req.detail}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-medium",
                              meta.color,
                            )}
                          >
                            <meta.Icon className="h-4 w-4" />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </TabsContent>

      {/* ESA — multi-program support */}
      <TabsContent value="esa">
        {state.esaPrograms.length > 0 || state.esa.active ? (
          <div className="flex flex-col gap-6">
            {(state.esaPrograms.length > 0 ? state.esaPrograms : [{
              name: state.esa.name ?? "ESA Program",
              status: "active" as const,
              portal_url: null,
              application_url: null,
              platform: null,
              max_award: state.esa.maxAward ?? null,
              eligibility: state.esa.eligibility ?? null,
              deadline: state.esa.deadline ?? null,
              documents_required: state.esa.documentation ?? [],
              forms: [],
              deadlines: [],
            }]).map((program, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-heading text-xl font-semibold text-navy">
                    {program.name}
                  </h3>
                  {program.status === "active" && (
                    <span className="inline-flex items-center rounded-full bg-safe px-2.5 py-0.5 text-xs font-semibold text-white">
                      Active
                    </span>
                  )}
                  {program.status === "capped" && (
                    <span className="inline-flex items-center rounded-full bg-amber px-2.5 py-0.5 text-xs font-semibold text-white">
                      Capped
                    </span>
                  )}
                  {program.status === "blocked" && (
                    <span className="inline-flex items-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Blocked
                    </span>
                  )}
                  {program.status === "pending_launch" && (
                    <span className="inline-flex items-center rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Pending Launch
                    </span>
                  )}
                  {program.platform && (
                    <span className="inline-flex items-center rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-medium text-navy">
                      {program.platform}
                    </span>
                  )}
                </div>

                <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                      Maximum award
                    </dt>
                    <dd className="mt-1 font-mono text-2xl font-bold text-navy">
                      {program.max_award ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                      Application deadline
                    </dt>
                    <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
                      {program.deadline ?? "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                      Eligibility
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-foreground">
                      {program.eligibility ?? "—"}
                    </dd>
                  </div>
                  {(program.portal_url || program.application_url) && (
                    <div className="sm:col-span-2 flex flex-wrap gap-3">
                      {program.portal_url && (
                        <a
                          href={program.portal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-action hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit portal
                        </a>
                      )}
                      {program.application_url && (
                        <a
                          href={program.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-action hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Apply now
                        </a>
                      )}
                    </div>
                  )}
                  {program.documents_required.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                        Required documentation
                      </dt>
                      <dd className="mt-2">
                        <ul className="flex flex-col gap-2">
                          {program.documents_required.map((doc) => (
                            <li
                              key={doc}
                              className="flex items-center gap-2 text-sm text-foreground"
                            >
                              <CheckCircle2 className="h-4 w-4 text-safe" />
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <p className="font-heading text-lg font-semibold text-navy">
              No ESA program in {state.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Track bills that could create one.
            </p>
          </div>
        )}
      </TabsContent>

      {/* Legal */}
      <TabsContent value="legal">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-[0.04em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Citation
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Decided
                </th>
                <th className="px-4 py-3 font-medium">Impact</th>
              </tr>
            </thead>
            <tbody>
              {state.precedents.map((c) => (
                <tr key={c.name} className="border-t border-border bg-card">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.name}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-mono text-xs text-action">
                      {c.citation}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                    {c.date}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-meta">
          <ExternalLink className="h-3.5 w-3.5" />
          Citations are illustrative. Consult an attorney for your situation.
        </p>
      </TabsContent>
    </Tabs>
  )
}
