"use client"

import { useState, useEffect, useCallback } from "react"

const LS_KEY = "hc_paywall_views"
const MONTHLY_LIMIT = 3

/** Check if we're in a new month vs stored month */
function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}`
}

interface PaywallState {
  month: string
  stateGuideViews: number
}

function readState(): PaywallState {
  if (typeof window === "undefined") return { month: currentMonth(), stateGuideViews: 0 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { month: currentMonth(), stateGuideViews: 0 }
    const parsed = JSON.parse(raw) as PaywallState
    // Reset if month rolled over
    if (parsed.month !== currentMonth()) {
      return { month: currentMonth(), stateGuideViews: 0 }
    }
    return parsed
  } catch {
    return { month: currentMonth(), stateGuideViews: 0 }
  }
}

function writeState(s: PaywallState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch { /* localStorage full or unavailable */ }
}

export type PaywallTrigger = "state-guide" | "bill-analysis" | "esa-details" | "alert-signup"

export function usePaywall() {
  const [state, setState] = useState<PaywallState>({ month: currentMonth(), stateGuideViews: 0 })
  const [showPaywall, setShowPaywall] = useState<PaywallTrigger | null>(null)

  useEffect(() => {
    setState(readState())
  }, [])

  const recordView = useCallback((type: "state-guide") => {
    setState((prev) => {
      const updated = { ...prev, stateGuideViews: prev.stateGuideViews + 1 }
      writeState(updated)
      return updated
    })
  }, [])

  const tryAccess = useCallback((trigger: PaywallTrigger): boolean => {
    if (trigger === "state-guide") {
      // Count THIS access attempt
      const current = readState()
      if (current.stateGuideViews < MONTHLY_LIMIT) {
        // Within limit — allow access and record view
        const updated = { ...current, stateGuideViews: current.stateGuideViews + 1 }
        writeState(updated)
        setState(updated)
        return true
      } else {
        // At limit — show paywall
        setShowPaywall("state-guide")
        return false
      }
    }

    // Non-state-guide triggers always show paywall (for free users)
    setShowPaywall(trigger)
    return false
  }, [])

  const dismissPaywall = useCallback(() => {
    setShowPaywall(null)
  }, [])

  const viewsRemaining = Math.max(0, MONTHLY_LIMIT - state.stateGuideViews)

  return {
    viewsRemaining,
    showPaywall,
    recordView,
    tryAccess,
    dismissPaywall,
  }
}
