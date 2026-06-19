"use client"

import { useState, useRef } from "react"
import { HelpCircle } from "lucide-react"

interface TooltipProps {
  content: string
  side?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ content, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const sideClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label={content}
        tabIndex={0}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 w-56 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg ${sideClasses[side]}`}
          style={{ pointerEvents: "none" }}
        >
          {content}
        </span>
      )}
    </span>
  )
}
