"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { Button, buttonVariants } from "@/components/ui/button"
import { LogOut, LayoutDashboard, Settings } from "lucide-react"

export function NavAuth({ onNavigate }: { onNavigate?: () => void }) {
  const { data, isPending } = useSession()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const user = data?.user

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      router.push("/")
      router.refresh()
    } finally {
      setSigningOut(false)
      onNavigate?.()
    }
  }

  if (isPending) {
    return <div className="h-9 w-32 animate-pulse rounded-md bg-cream" aria-hidden="true" />
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={buttonVariants({ variant: "ghost", className: "gap-2 text-sm font-medium text-foreground hover:bg-secondary" })}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={buttonVariants({ variant: "ghost", className: "gap-2 text-sm font-medium text-foreground hover:bg-secondary" })}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="hidden items-center gap-2 lg:flex">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="gap-2 border-border text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/sign-in"
        onClick={onNavigate}
        className={buttonVariants({ variant: "ghost", className: "text-sm font-medium text-foreground hover:bg-secondary" })}
      >
        Sign In
      </Link>
      <Link
        href="/sign-up"
        onClick={onNavigate}
        className={buttonVariants({ className: "rounded-md bg-navy text-sm font-medium text-primary-foreground hover:bg-navy/90" })}
      >
        Start Tracking
      </Link>
    </div>
  )
}
