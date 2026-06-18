"use client"

import { useRef } from "react"
import { Printer, ShieldAlert, ArrowUpRight, ArrowDownRight, Minus, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import type { InferSelectModel } from "drizzle-orm"
import { states, bills } from "@/lib/db/schema"

type StateData = InferSelectModel<typeof states>
type BillData = InferSelectModel<typeof bills>

const IMPACT_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  increase: { label: "Risk", icon: ArrowUpRight, color: "text-red-600", bg: "bg-red-50" },
  decrease: { label: "Upside", icon: ArrowDownRight, color: "text-green-600", bg: "bg-green-50" },
  neutral:  { label: "Neutral", icon: Minus, color: "text-gray-500", bg: "bg-gray-50" },
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#16a34a"
    case "B": return "#65a30d"
    case "C": return "#ca8a04"
    case "D": return "#ea580c"
    default: return "#dc2626"
  }
}

interface Props {
  state: StateData
  code: string
  grade: string
  avgConf: number
  bills: BillData[]
  totalBills: number
  enactedBills: number
  esaBills: number
  increaseBills: number
  decreaseBills: number
  statusLabels: Record<number, string>
}

export function KitDownloadClient({
  state,
  grade,
  avgConf,
  bills: allBills,
  statusLabels,
  totalBills,
  enactedBills,
  esaBills,
  increaseBills,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const stateName = state.name
  const year = new Date().getFullYear()

  // Sort bills: enacted + signed first, then high-confidence, then rest
  const sortedBills = [...allBills].sort((a, b) => {
    const aStatus = a.statusStep >= 6 ? 0 : a.statusStep >= 3 ? 1 : 2
    const bStatus = b.statusStep >= 6 ? 0 : b.statusStep >= 3 ? 1 : 2
    if (aStatus !== bStatus) return aStatus - bStatus
    return (b.impactConfidence ?? 0) - (a.impactConfidence ?? 0)
  })

  // Enacted (signed/chaptered) bills first
  const enactedBillsList = sortedBills.filter((b) => b.statusStep >= 6)
  const watchBills = sortedBills.filter((b) => b.statusStep >= 3 && b.statusStep < 6)
  const archiveBills = sortedBills.filter((b) => b.statusStep < 3 || b.statusStep >= 9)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print controls */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm print:hidden">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-navy">Your Compliance Kit — Ready</h2>
            <p className="text-xs text-muted-foreground">
              {stateName} · Annual Compliance Kit · {year}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="mx-auto max-w-[1000px] px-4 py-8 print:px-0 print:py-0">
        {/* ── COVER ── */}
        <div className="rounded-2xl bg-navy p-8 text-white print:rounded-none print:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">
                Annual Compliance Kit
              </p>
              <h1 className="mt-2 font-heading text-3xl font-bold leading-tight">
                {stateName}
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Homeschool compliance brief · School year {year}–{year + 1}
              </p>
            </div>
            <div className="text-right">
              <div
                className="inline-flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                style={{ backgroundColor: gradeColor(grade) }}
              >
                {grade}
              </div>
              <p className="mt-1 text-xs text-white/60">Freedom Grade</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-white/60">Freedom Score</p>
              <p className="text-xl font-bold">{state.score}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Regulation Level</p>
              <p className="text-xl font-bold">{state.level}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Bills Tracked</p>
              <p className="text-xl font-bold">{totalBills}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Enacted Laws</p>
              <p className="text-xl font-bold">{enactedBills}</p>
            </div>
          </div>
        </div>

        {/* ── ESA PACKET ── (if applicable) */}
        {state.esaActive && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 print:border print:p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                  <CheckCircle className="h-3 w-3" />
                  ESA Available
                </div>
                <h2 className="mt-3 font-heading text-xl font-bold text-green-900">
                  {state.esaName || "Education Savings Account"}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-700">Max Award</p>
                <p className="text-xl font-bold text-green-800">{state.esaMaxAward || "Varies"}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {state.esaEligibility && (
                <div>
                  <p className="text-xs font-medium text-green-700">Eligibility</p>
                  <p className="mt-1 text-sm text-green-900">{state.esaEligibility}</p>
                </div>
              )}
              {state.esaDeadline && (
                <div>
                  <p className="text-xs font-medium text-green-700">Deadline</p>
                  <p className="mt-1 text-sm font-semibold text-green-900">{state.esaDeadline}</p>
                </div>
              )}
            </div>
            {(state.esaDocumentation as string[])?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-green-700">Required Documentation</p>
                <ul className="mt-1 space-y-1">
                  {(state.esaDocumentation as string[]).map((doc, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-green-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── DEADLINE CALENDAR ── */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 print:border print:p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber" />
            <h2 className="font-heading text-lg font-bold text-amber-900">Hard Deadlines</h2>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {state.esaActive && state.esaDeadline ? (
              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <p className="text-xs font-medium text-amber-600">ESA Deadline</p>
                <p className="text-lg font-bold text-amber-900">{state.esaDeadline}</p>
                <p className="text-xs text-muted-foreground">{state.esaName || "ESA application"}</p>
              </div>
            ) : null}
            {enactedBillsList.slice(0, 3).map((bill) => bill.effectiveDate ? (
              <div key={bill.id} className="rounded-lg border border-amber-200 bg-white p-4">
                <p className="text-xs font-medium text-amber-600">Effective Date</p>
                <p className="text-lg font-bold text-amber-900">{bill.effectiveDate}</p>
                <p className="text-xs text-muted-foreground">{bill.number}</p>
              </div>
            ) : null)}
            {!state.esaDeadline && enactedBillsList.filter((b) => b.effectiveDate).length === 0 ? (
              <div className="col-span-2 rounded-lg border border-amber-200 bg-white p-4 text-center">
                <p className="text-sm text-muted-foreground">No hard deadlines this period</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── BILL TRIAGE ── */}
        <div className="mt-6 space-y-4">
          <h2 className="font-heading text-xl font-bold text-navy">Law Change Queue</h2>
          <p className="text-sm text-muted-foreground">
            Sorted by actionability: enacted first, then proposed watch items, then archive.
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {avgConf >= 0.8 ? `${(avgConf * 100).toFixed(0)}% avg. confidence` : "Analysis confidence varies"}
            </span>
          </p>

          {/* Enacted */}
          {enactedBillsList.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Enacted
                </span>
                <span className="text-xs text-muted-foreground">{enactedBillsList.length} bills</span>
              </div>
              <div className="mt-2 space-y-2">
                {enactedBillsList.slice(0, 8).map((bill) => (
                  <BillCard key={bill.id} bill={bill} statusLabels={statusLabels} />
                ))}
              </div>
            </div>
          )}

          {/* Watch */}
          {watchBills.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Watch
                </span>
                <span className="text-xs text-muted-foreground">{watchBills.length} bills</span>
              </div>
              <div className="mt-2 space-y-2">
                {watchBills.slice(0, 8).map((bill) => (
                  <BillCard key={bill.id} bill={bill} statusLabels={statusLabels} />
                ))}
              </div>
            </div>
          )}

          {/* Archive */}
          {archiveBills.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  Archive
                </span>
                <span className="text-xs text-muted-foreground">{archiveBills.length} bills</span>
              </div>
              <div className="mt-2 space-y-2">
                {archiveBills.slice(0, 5).map((bill) => (
                  <BillCard key={bill.id} bill={bill} statusLabels={statusLabels} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SUMMARY STATS ── */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Tracked Bills</p>
            <p className="mt-1 text-2xl font-bold text-navy">{totalBills}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Enacted</p>
            <p className="mt-1 text-2xl font-bold text-navy">{enactedBills}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Oversight Risk</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{increaseBills}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">ESA-Related</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{esaBills}</p>
          </div>
        </div>

        {/* ── ACTION CHECKLIST ── */}
        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 print:border print:p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <h2 className="font-heading text-lg font-bold text-blue-900">Action Checklist</h2>
          </div>
          <div className="mt-4 space-y-3">
            {state.esaActive && state.esaDeadline ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 transition-colors hover:bg-blue-100/50">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Submit ESA application before {state.esaDeadline}</p>
                  <p className="text-xs text-muted-foreground">{state.esaName} — up to {state.esaMaxAward || "varies"}/year</p>
                </div>
              </label>
            ) : null}
            {enactedBillsList.filter((b) => b.impact === "increase").slice(0, 3).map((bill) => (
              <label key={bill.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 transition-colors hover:bg-blue-100/50">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Review {bill.number}: {bill.title.slice(0, 80)}</p>
                  <p className="text-xs text-muted-foreground">{bill.impactSummary || "Impact pending review"}</p>
                </div>
              </label>
            ))}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 transition-colors hover:bg-blue-100/50">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Print and file this compliance kit</p>
                <p className="text-xs text-muted-foreground">Keep a physical copy with your homeschool records</p>
              </div>
            </label>
          </div>
        </div>

        {/* ── LEGAL DISCLAIMER ── */}
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber/20 bg-amber/5 p-4 print:border print:p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
          <div>
            <p className="text-sm font-medium text-amber">Not legal advice</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber/80">
              Homeschool Compass provides compliance organization and legislative monitoring,
              not attorney representation. Every item in this kit displays its data source
              and confidence level. Consult a qualified attorney for legal guidance specific
              to your situation. Generated {new Date().toLocaleDateString()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BillCard({ bill, statusLabels }: { bill: BillData; statusLabels: Record<number, string> }) {
  const meta = IMPACT_META[bill.impact] || IMPACT_META.neutral
  const Icon = meta.icon
  const status = statusLabels[bill.statusStep] || "Unknown"
  const confText = bill.impactConfidence ? `${(bill.impactConfidence * 100).toFixed(0)}%` : null

  return (
    <div className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-gray-600">
              {bill.number}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            {confText && (
              <span className="text-[11px] text-gray-400">{confText}</span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground leading-snug">
            {bill.title.length > 120 ? bill.title.slice(0, 120) + "…" : bill.title}
          </p>
          {bill.impactSummary && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{bill.impactSummary}</p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{status}</span>
            {bill.effectiveDate && <span>Effective {bill.effectiveDate}</span>}
            {bill.actionRequired && bill.actionRequired !== "none" && (
              <span className="inline-flex items-center gap-1 text-amber">
                <AlertTriangle className="h-3 w-3" />
                Action: {bill.actionRequired}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
