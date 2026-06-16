"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scorecard", label: "Scorecard" },
  { href: "/dashboard", label: "Alerts" },
  { href: "/esa", label: "ESA Guide" },
  { href: "/about", label: "About" },
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="Tangle Trove home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link, i) => {
            const active = pathname === link.href
            return (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                className={cn(
                  "border-b-2 py-5 text-sm font-medium transition-colors",
                  active
                    ? "border-navy text-navy"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            asChild
            className="text-sm font-medium text-foreground hover:bg-secondary"
          >
            <Link href="/dashboard">Sign In</Link>
          </Button>
          <Button
            asChild
            className="rounded-md bg-navy text-sm font-medium text-primary-foreground hover:bg-navy/90"
          >
            <Link href="/pricing">Start Tracking</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-cream md:hidden"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-cream p-0">
            <div className="border-b border-border p-6">
              <Logo />
            </div>
            <nav className="flex flex-col p-4" aria-label="Mobile">
              {NAV_LINKS.map((link, i) => (
                <Link
                  key={`${link.href}-${i}`}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-background"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 px-3">
                <Button
                  asChild
                  className="w-full rounded-md bg-navy text-primary-foreground hover:bg-navy/90"
                >
                  <Link href="/pricing" onClick={() => setOpen(false)}>
                    Start Tracking
                  </Link>
                </Button>
              </div>
            </nav>
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
