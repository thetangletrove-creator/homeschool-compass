"use client"

import Link from "next/link"
import { CheckCircle2, Clock, MinusCircle, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BillCard } from "@/components/site/bill-card"
import type { Bill, StateData } from "@/lib/data"
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

export function StateTabs({
  state,
  stateBills,
}: {
  state: StateData
  stateBills: Bill[]
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-border bg-card p-1">
        {[
          ["overview", "Overview"],
          ["bills", "Current Bills"],
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
        <div className="grid gap-4 sm:grid-cols-2">
          {METRICS.map((m) => {
            const score = state.subscores[m.key]
            return (
              <div
                key={m.key}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-base font-semibold text-navy">
                    {m.label}
                  </h3>
                  <span className="font-mono text-lg font-bold text-navy">
                    {score}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, backgroundColor: barColor(score) }}
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {m.desc}
                </p>
              </div>
            )
          })}
        </div>
      </TabsContent>

      {/* Current Bills */}
      <TabsContent value="bills">
        {stateBills.length > 0 ? (
          <div className="flex flex-col gap-4">
            {stateBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
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

      {/* Requirements */}
      <TabsContent value="requirements">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-[0.04em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Requirement</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Citation
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {state.requirements.map((req) => {
                const meta = STATUS_META[req.status]
                return (
                  <tr
                    key={req.name}
                    className="border-t border-border bg-card transition-colors hover:bg-cream"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {req.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {req.deadline}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Link
                        href={req.formUrl}
                        className="font-mono text-xs text-action hover:underline"
                      >
                        {req.citation}
                      </Link>
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
      </TabsContent>

      {/* ESA */}
      <TabsContent value="esa">
        {state.esa.active ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-heading text-xl font-semibold text-navy">
                {state.esa.name}
              </h3>
              <span className="inline-flex items-center rounded-full bg-safe px-2.5 py-0.5 text-xs font-semibold text-white">
                Active
              </span>
            </div>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  Maximum award
                </dt>
                <dd className="mt-1 font-mono text-2xl font-bold text-navy">
                  {state.esa.maxAward}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  Application deadline
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
                  {state.esa.deadline}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  Eligibility
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-foreground">
                  {state.esa.eligibility}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
                  Required documentation
                </dt>
                <dd className="mt-2">
                  <ul className="flex flex-col gap-2">
                    {state.esa.documentation?.map((doc) => (
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
            </dl>
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
