"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { states } from "@/lib/data"

export function StatePicker() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = query.trim()
    ? states.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.code.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 8)
    : []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.05em] text-meta">
        Jump to your state
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search by state name or code…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim()) setOpen(true)
          }}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onKeyDown={handleKey}
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-action focus:outline-none focus:ring-1 focus:ring-action"
          aria-label="Search states"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
        />
      </div>

      {open && results.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          role="listbox"
        >
          {results.map((s) => (
            <li key={s.code} role="option" aria-selected={false}>
              <Link
                href={`/state/${s.code.toLowerCase()}`}
                onClick={() => { setOpen(false); setQuery("") }}
                className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy/10 font-mono text-xs font-bold text-navy">
                  {s.code}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.esa.active || s.esaPrograms.length > 0
                      ? "ESA active"
                      : s.nonEsaPrograms.length > 0
                        ? "Alternative funding available"
                        : "No ESA program"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-lg">
          No states matching "{query}"
        </div>
      )}
    </div>
  )
}
