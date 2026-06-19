"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StateCard } from "@/components/site/state-card"
import { states, type Grade } from "@/lib/data"
import { cn } from "@/lib/utils"

type SortKey = "name" | "score-desc" | "score-asc"

const GRADE_FILTERS: Array<Grade | "All"> = ["All", "A", "B", "C", "D", "F"]

export function ScorecardGrid() {
  const [query, setQuery] = useState("")
  const [grade, setGrade] = useState<Grade | "All">("All")
  const [sort, setSort] = useState<SortKey>("name")

  const filtered = useMemo(() => {
    let list = states.filter((s) => {
      const matchesQuery =
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.code.toLowerCase().includes(query.toLowerCase())
      const matchesGrade = grade === "All" || s.grade === grade
      return matchesQuery && matchesGrade
    })
    list = [...list].sort((a, b) => {
      if (sort === "score-desc") return b.score - a.score
      if (sort === "score-asc") return a.score - b.score
      return a.name.localeCompare(b.name)
    })
    return list
  }, [query, grade, sort])

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-meta" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search states..."
            className="h-10 rounded-md border-border bg-card pl-9 text-sm"
            aria-label="Search states"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {GRADE_FILTERS.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  grade === g
                    ? "bg-navy text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {g}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground"
            aria-label="Sort states"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="score-desc">Sort: Freedom (High–Low)</option>
            <option value="score-asc">Sort: Freedom (Low–High)</option>
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Showing {filtered.length} of {states.length} states
      </p>

      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((state) => (
            <StateCard key={state.code} state={state} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <p className="font-heading text-lg font-semibold text-navy">
            No states match your search
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different state name or clear the grade filter.
          </p>
        </div>
      )}
    </div>
  )
}
