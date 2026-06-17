"use client"

import { useEffect, useRef } from "react"
import { X, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PaywallTrigger } from "@/lib/use-paywall"

interface PaywallModalProps {
  trigger: PaywallTrigger
  onDismiss: () => void
  stateCode?: string
}

const MODAL_CONTENT: Record<PaywallTrigger, {
  headline: string
  body: string
  bullets: string[]
  primaryCta: string
  secondaryCta: string
  emotionalHook: string
  showProgress?: boolean
  viewsUsed?: number
}> = {
  "state-guide": {
    headline: "You're doing your research. We respect that.",
    body: "You've used 3 of your 3 free state guides this month. Ready to go deeper?",
    bullets: [
      "Unlimited state compliance guides (all 50 states)",
      "Instant bill alerts when laws change",
      "Personalized compliance checklist with your deadlines",
      "ESA program tracking and deadline reminders",
    ],
    primaryCta: "Start 14-Day Free Trial →",
    secondaryCta: "Thanks — I'll wait. (You'll get 3 more free guides next month.)",
    emotionalHook: "State laws change fast. Don't miss what matters for your family.",
    showProgress: true,
    viewsUsed: 3,
  },
  "bill-analysis": {
    headline: "Bill analysis available for subscribers",
    body: "Free accounts show bill title and status only. Upgrade to see what this bill means for your homeschool.",
    bullets: [
      "Full bill summary — what it means for homeschoolers",
      "Action required checklist",
      "Timeline and status updates",
      "Similar bills in other states",
    ],
    primaryCta: "Start Free Trial →",
    secondaryCta: "Back to Bill List →",
    emotionalHook: "A bill's title doesn't tell you if it affects your homeschool. Our analysis does.",
  },
  "esa-details": {
    headline: "ESA program details available for subscribers",
    body: "Free accounts show whether your state has an ESA program. Upgrade to see application windows, deadlines, and step-by-step guides.",
    bullets: [
      "Application windows and deadlines",
      "Eligible expenses and providers",
      "Step-by-step application guide",
      "Deadline reminders",
    ],
    primaryCta: "Start Free Trial →",
    secondaryCta: "Back to State Guide →",
    emotionalHook: "ESA programs change annually. Know what you qualify for — before deadlines pass.",
  },
  "alert-signup": {
    headline: "Bill alerts are a paid feature",
    body: "Free accounts include a weekly digest email on Fridays. Upgrade to get notified the day a bill moves.",
    bullets: [
      "Instant alerts the day a bill moves (introduced, amended, signed)",
      "SMS alerts for urgent bills",
      "Customizable by state and impact type",
      "Historical alert archive",
    ],
    primaryCta: "Start Free Trial →",
    secondaryCta: "Continue with Weekly Digest →",
    emotionalHook: "A weekly digest is good. Instant alerts are peace of mind.",
  },
}

export function PaywallModal({ trigger, onDismiss, stateCode }: PaywallModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const content = MODAL_CONTENT[trigger]

  // Trap focus / close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [onDismiss])

  async function handleCheckout() {
    const plan = trigger === "esa-details" ? "esa" : "tracker"
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // Silent fail — user stays on page
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss() }}
      role="dialog"
      aria-modal="true"
      aria-label={content.headline}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-cream hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Lock icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/[0.06]">
          <Lock className="h-6 w-6 text-navy" />
        </div>

        {/* Progress indicator (state guide only) */}
        {content.showProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Free guides used</span>
              <span>3 of 3</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full w-full rounded-full bg-amber" />
            </div>
          </div>
        )}

        {/* Headline */}
        <h3 className="mt-4 text-center font-heading text-lg font-semibold leading-snug text-navy">
          {content.headline}
        </h3>

        {/* Emotional hook */}
        <p className="mt-2 text-center text-sm italic text-muted-foreground/70">
          {content.emotionalHook}
        </p>

        {/* Body */}
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          {content.body}
        </p>

        {/* Feature bullets */}
        <ul className="mt-4 space-y-2">
          {content.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-safe">✓</span>
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="mt-6 space-y-2">
          <Button
            className="w-full rounded-md bg-navy text-base font-medium text-primary-foreground hover:bg-navy/90"
            onClick={handleCheckout}
          >
            {content.primaryCta}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            14-day free trial. No credit card required.
          </p>
          <button
            onClick={onDismiss}
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {content.secondaryCta}
          </button>
        </div>
      </div>
    </div>
  )
}
