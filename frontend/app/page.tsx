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
        <div className="lg:grid lg:grid-cols-2 lg:items-start">
          <ScorecardPreview />
          <AboutPreview />
        </div>
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  )
}
