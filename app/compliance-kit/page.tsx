import type { Metadata } from "next"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { ComplianceKitLanding } from "@/components/site/compliance-kit-landing"

export const metadata: Metadata = {
  title: "Annual Compliance Kit — Homeschool Compass",
  description:
    "Download your state-specific homeschool compliance packet. Printable checklist, ESA packet, law change brief, and record binder — generated from live state data.",
}

export default function ComplianceKitPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <ComplianceKitLanding />
      <SiteFooter />
    </div>
  )
}
