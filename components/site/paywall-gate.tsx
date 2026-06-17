"use client"

import { usePaywall, PaywallTrigger } from "@/lib/use-paywall"
import { PaywallModal } from "./paywall-modal"

interface PaywallGateProps {
  /** What type of content this gate protects */
  trigger: PaywallTrigger
  /** Optional state code for context in the modal */
  stateCode?: string
  /** The content to render if user has access */
  children: React.ReactNode
  /** Optional fallback to show instead of nothing when blocked (before modal appears) */
  blockedFallback?: React.ReactNode
}

/**
 * Wraps free-tier-limited content. Automatically tracks views and shows
 * the paywall modal when the user exceeds their monthly limit.
 *
 * Usage:
 *   <PaywallGate trigger="state-guide">
 *     <StateGuideContent />
 *   </PaywallGate>
 */
export function PaywallGate({
  trigger,
  stateCode,
  children,
  blockedFallback,
}: PaywallGateProps) {
  const { showPaywall, tryAccess, dismissPaywall, viewsRemaining } = usePaywall()

  // Check access on mount
  const hasAccess = tryAccess(trigger)

  // If within limit, render children
  if (hasAccess) {
    return <>{children}</>
  }

  // Show paywall modal
  return (
    <>
      {blockedFallback ?? (
        <div className="rounded-lg border border-border bg-cream p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {trigger === "state-guide"
              ? `You've used all 3 free guides this month. Upgrade for unlimited access.`
              : trigger === "bill-analysis"
              ? "Bill analysis available for subscribers."
              : trigger === "esa-details"
              ? "ESA details available for subscribers."
              : "Alert setup available for subscribers."}
          </p>
        </div>
      )}
      {showPaywall && (
        <PaywallModal
          trigger={showPaywall}
          stateCode={stateCode}
          onDismiss={dismissPaywall}
        />
      )}
    </>
  )
}
