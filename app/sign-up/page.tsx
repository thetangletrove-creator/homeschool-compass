import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession, isAuthConfigured } from "@/lib/auth"
import { Logo } from "@/components/site/logo"
import { AuthForm } from "@/components/auth/auth-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Start Tracking — Homeschool Compass",
}

export default async function SignUpPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-primary text-balance">
              Start tracking your state
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Create a free account to build a watchlist and get alerts before filing
              deadlines.
            </p>
          </div>
          <AuthForm mode="sign-up" configured={isAuthConfigured()} />
        </div>
      </div>
    </main>
  )
}
