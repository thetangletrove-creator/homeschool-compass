"use client"

import { useMemo, useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { BillCard } from "@/components/site/bill-card"
import { bills, states, BILL_STEPS, type Impact } from "@/lib/data"
import { cn } from "@/lib/utils"

type ImpactFilter = "any" | Impact

const IMPACT_OPTIONS: Array<{ value: ImpactFilter; label: string }> = [
  { value: "any", label: "Any" },
  { value: "increase", label: "Increases Burden" },
  { value: "decrease", label: "Decreases Burden" },
  { value: "neutral", label: "Neutral" },
]

const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "session", label: "This session" },
]

// Reference "today" anchored to the most recent bill for stable demo filtering.
const REFERENCE_DATE = new Date("2026-05-30")

function Filters({
  query,
  setQuery,
  impact,
  setImpact,
  selectedStates,
  toggleState,
  statusFilter,
  toggleStatus,
  esaOnly,
  setEsaOnly,
  dateRange,
  setDateRange,
  stateQuery,
  setStateQuery,
}: {
  query: string
  setQuery: (v: string) => void
  impact: ImpactFilter
  setImpact: (v: ImpactFilter) => void
  selectedStates: string[]
  toggleState: (code: string) => void
  statusFilter: number[]
  toggleStatus: (step: number) => void
  esaOnly: boolean
  setEsaOnly: (v: boolean) => void
  dateRange: string
  setDateRange: (v: string) => void
  stateQuery: string
  setStateQuery: (v: string) => void
}) {
  const filteredStateList = states.filter(
    (s) =>
      s.name.toLowerCase().includes(stateQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(stateQuery.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
          Regulation impact
        </h3>
        <div className="mt-3 flex flex-col gap-1">
          {IMPACT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setImpact(opt.value)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm transition-colors",
                impact === opt.value
                  ? "bg-navy text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
          Status
        </h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {BILL_STEPS.map((step, i) => (
            <label
              key={step}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground"
            >
              <Checkbox
                checked={statusFilter.includes(i)}
                onCheckedChange={() => toggleStatus(i)}
              />
              {step}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5">
        <Label htmlFor="esa-toggle" className="text-sm text-foreground">
          ESA-related only
        </Label>
        <Switch id="esa-toggle" checked={esaOnly} onCheckedChange={setEsaOnly} />
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
          Date range
        </h3>
        <div className="mt-3 flex flex-col gap-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm transition-colors",
                dateRange === opt.value
                  ? "bg-navy text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-meta">
          States
        </h3>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-meta" />
          <Input
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
            placeholder="Search states..."
            className="h-9 rounded-md border-border bg-card pl-8 text-sm"
          />
        </div>
        <div className="mt-2 max-h-56 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2.5">
            {filteredStateList.map((s) => (
              <label
                key={s.code}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground"
              >
                <Checkbox
                  checked={selectedStates.includes(s.code)}
                  onCheckedChange={() => toggleState(s.code)}
                />
                <span className="font-mono text-xs text-meta">{s.code}</span>
                {s.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BillFeed() {
  const [query, setQuery] = useState("")
  const [impact, setImpact] = useState<ImpactFilter>("any")
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<number[]>([])
  const [esaOnly, setEsaOnly] = useState(false)
  const [dateRange, setDateRange] = useState("all")
  const [stateQuery, setStateQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleState = (code: string) =>
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  const toggleStatus = (step: number) =>
    setStatusFilter((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step],
    )

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      if (impact !== "any" && b.impact !== impact) return false
      if (selectedStates.length > 0 && !selectedStates.includes(b.stateCode))
        return false
      if (statusFilter.length > 0 && !statusFilter.includes(b.statusStep))
        return false
      if (esaOnly && !b.esaRelated) return false
      if (
        query &&
        !`${b.number} ${b.title} ${b.stateCode}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false
      if (dateRange !== "all") {
        const days = Math.floor(
          (REFERENCE_DATE.getTime() - new Date(b.date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
        if (dateRange === "7" && days > 7) return false
        if (dateRange === "30" && days > 30) return false
        if (dateRange === "session" && days > 120) return false
      }
      return true
    })
  }, [impact, selectedStates, statusFilter, esaOnly, query, dateRange])

  const activeCount =
    (impact !== "any" ? 1 : 0) +
    selectedStates.length +
    statusFilter.length +
    (esaOnly ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0)

  const filterProps = {
    query,
    setQuery,
    impact,
    setImpact,
    selectedStates,
    toggleState,
    statusFilter,
    toggleStatus,
    esaOnly,
    setEsaOnly,
    dateRange,
    setDateRange,
    stateQuery,
    setStateQuery,
  }

  return (
    <div className="mx-auto flex max-w-[1280px] gap-8 px-4 py-8 md:px-6">
      {/* Desktop sidebar */}
      <aside className="hidden w-[280px] shrink-0 lg:block">
        <div className="sticky top-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-navy">
              Filters
            </h2>
            {activeCount > 0 && (
              <button
                onClick={() => {
                  setImpact("any")
                  setSelectedStates([])
                  setStatusFilter([])
                  setEsaOnly(false)
                  setDateRange("all")
                }}
                className="text-xs font-medium text-action hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <Filters {...filterProps} />
        </div>
      </aside>

      {/* Main feed */}
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-meta" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bills by number, title, or state..."
              className="h-11 rounded-md border-border bg-card pl-9 text-sm"
              aria-label="Search bills"
            />
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="outline"
                className="h-11 rounded-md border-border text-foreground"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 rounded-full bg-navy px-1.5 text-xs text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] overflow-y-auto bg-background">
              <SheetTitle className="mb-4 font-heading text-lg text-navy">
                Filters
              </SheetTitle>
              <Filters {...filterProps} />
            </SheetContent>
          </Sheet>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "bill" : "bills"} match your
          filters
        </p>

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filtered.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <X className="h-6 w-6 text-meta" />
            </div>
            <p className="mt-4 font-heading text-lg font-semibold text-navy">
              No bills match your filters
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try broadening your search or check back tomorrow — we scan for new
              bills every 4 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
