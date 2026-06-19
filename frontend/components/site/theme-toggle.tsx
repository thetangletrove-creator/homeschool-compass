"use client"

import { useEffect, useState, useCallback } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const isDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    setDark(isDark)
    if (isDark) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    const html = document.documentElement
    // Enable smooth transition for this toggle action
    html.classList.add("theme-transition")

    const next = !dark
    setDark(next)
    localStorage.setItem("theme", next ? "dark" : "light")
    html.classList.toggle("dark", next)

    // Remove transition class after animation completes
    requestAnimationFrame(() => {
      setTimeout(() => html.classList.remove("theme-transition"), 350)
    })
  }, [dark])

  // SSR placeholder — prevents layout shift
  if (!mounted) {
    return <div className={cn("h-9 w-9", className)} />
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md",
        "text-muted-foreground hover:bg-secondary hover:text-foreground",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
