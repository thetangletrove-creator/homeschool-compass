import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Privacy Policy — Homeschool Compass",
  description: "How Homeschool Compass handles your data.",
}

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Data We Collect</h2>
            <p>
              Homeschool Compass collects only the data necessary to provide its services:
              account credentials (email), state selection preferences, and compliance
              document data you explicitly upload.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">How We Use It</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To deliver your state-specific compliance packets and alerts</li>
              <li>To improve our legislative tracking and regulatory analysis</li>
              <li>To communicate service updates and critical deadline reminders</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Data Sharing</h2>
            <p>
              We do not sell your data. Provider invoice credentials are encrypted
              end-to-end before reaching our servers (RSA-OAEP + AES-256-GCM).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-navy">Contact</h2>
            <p>
              Questions about this policy? Reach us through our support channels linked
              in the app.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
