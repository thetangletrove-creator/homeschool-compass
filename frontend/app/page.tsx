import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { Hero } from "@/components/home/hero"
import { TrustBar } from "@/components/home/trust-bar"
import { ScorecardPreview } from "@/components/home/scorecard-preview"
import { PricingSection } from "@/components/site/pricing-section"
import { AboutPreview } from "@/components/home/about-preview"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <ScorecardPreview />
        <PricingSection />
        <AboutPreview />
      </main>
      <SiteFooter />
    </div>
  )
}
