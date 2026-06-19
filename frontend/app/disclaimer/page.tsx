import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Legal Disclaimer — Homeschool Compass",
  description: "Important legal information about Homeschool Compass.",
}

export default function DisclaimerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:px-6 md:py-16">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-pretty text-3xl font-bold leading-tight tracking-tight text-navy md:text-4xl">
          Legal Disclaimer
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Not Legal Advice</h2>
            <p>
              Homeschool Compass provides regulatory information and compliance tools.
              Nothing on this website constitutes legal advice. Homeschool laws and
              regulations vary by state and change frequently.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Consult Professionals</h2>
            <p>
              We strongly recommend consulting with an attorney, your state&apos;s
              department of education, or a qualified educational consultant before
              making decisions based on the information provided here.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">No Guarantee</h2>
            <p>
              While we track legislation across all 50 states and update our data
              regularly, we cannot guarantee that all information is current at the
              time you access it. Always verify directly with your state agency.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
