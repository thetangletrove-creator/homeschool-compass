import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getAlertPreferences } from "@/lib/actions/alerts"
import { SiteNav } from "@/components/site/site-nav"
import { SiteFooter } from "@/components/site/site-footer"
import { SettingsForm } from "@/components/settings/settings-form"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Alert Settings — Homeschool Compass",
  description: "Configure which states and bill types trigger alerts.",
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const prefs = await getAlertPreferences()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-16">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-navy md:text-3xl">
            Alert Settings
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Configure how and when you want to be notified about homeschool legislation changes.
          </p>
          <div className="mt-10">
            <SettingsForm prefs={prefs} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
