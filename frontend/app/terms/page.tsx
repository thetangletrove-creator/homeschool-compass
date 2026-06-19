import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Terms of Service — Homeschool Compass",
  description: "Terms governing use of Homeschool Compass.",
}

export default function TermsPage() {
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
          Terms of Service
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Service Description</h2>
            <p>
              Homeschool Compass provides legislative tracking, compliance document
              generation, and regulatory analysis for homeschool families. This is a
              tool to assist with compliance — it is not a substitute for legal advice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Accuracy</h2>
            <p>
              While we strive for accuracy, legislative data changes rapidly. We
              recommend verifying critical deadlines and requirements with your
              state&apos;s department of education.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Limitation of Liability</h2>
            <p>
              Homeschool Compass is not liable for any losses resulting from the use
              of our platform. Always consult qualified professionals for legal,
              tax, or compliance advice.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
