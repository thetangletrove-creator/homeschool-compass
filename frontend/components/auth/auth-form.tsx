"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn, signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2, Mail } from "lucide-react"

const CALLBACK_URL = "/dashboard"

export function AuthForm({
  mode,
  configured,
}: {
  mode: "sign-in" | "sign-up"
  configured: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  const isSignUp = mode === "sign-up"

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending("email")
    try {
      const res = isSignUp
        ? await signUp.email({ email, password, name, callbackURL: CALLBACK_URL })
        : await signIn.email({ email, password, callbackURL: CALLBACK_URL })
      if (res.error) {
        setError(res.error.message ?? "Something went wrong. Try again.")
        return
      }
      router.push(CALLBACK_URL)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(null)
    }
  }

  async function handleSocial(provider: "google" | "apple") {
    setError(null)
    setPending(provider)
    try {
      const res = await signIn.social({ provider, callbackURL: CALLBACK_URL })
      if (res?.error) setError(res.error.message ?? `Could not sign in with ${provider}.`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(null)
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first, then request a magic link.")
      return
    }
    setError(null)
    setPending("magic")
    try {
      const res = await signIn.magicLink({ email, callbackURL: CALLBACK_URL })
      if (res?.error) {
        setError(res.error.message ?? "Could not send magic link.")
        return
      }
      setMagicSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="w-full">
      {!configured && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-amber/30 bg-amber/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            Authentication is not active yet. Add{" "}
            <code className="rounded bg-cream px-1 py-0.5 font-mono text-xs">
              NEON_AUTH_COOKIE_SECRET
            </code>{" "}
            to your environment to enable sign in. The form below is fully wired and
            will work as soon as the secret is set.
          </p>
        </div>
      )}

      {magicSent ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card p-8 text-center">
          <Mail className="h-8 w-8 text-action" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-primary">Check your email</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a sign-in link to{" "}
            <span className="font-medium text-foreground">{email}</span>. It expires in 15
            minutes.
          </p>
          <button
            type="button"
            onClick={() => setMagicSent(false)}
            className="mt-2 text-sm font-medium text-action hover:underline"
          >
            Use a different method
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center gap-3 border-border bg-card text-foreground hover:bg-cream"
              onClick={() => handleSocial("google")}
              disabled={!!pending}
            >
              {pending === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleMark />
              )}
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center gap-3 border-border bg-card text-foreground hover:bg-cream"
              onClick={() => handleSocial("apple")}
              disabled={!!pending}
            >
              {pending === "apple" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AppleMark />
              )}
              Continue with Apple
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Carter"
                  autoComplete="name"
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-reg-up" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!!pending}
            >
              {pending === "email" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={!!pending}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-action hover:underline disabled:opacity-50"
          >
            {pending === "magic" && <Loader2 className="h-4 w-4 animate-spin" />}
            Email me a magic link instead
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already tracking? " : "New here? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-medium text-action hover:underline"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </>
      )}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg className="h-4 w-4 fill-foreground" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.54-.16-3 .9-3.78.9-.78 0-1.98-.88-3.26-.86-1.68.03-3.23.97-4.09 2.47-1.74 3.02-.45 7.5 1.25 9.96.83 1.2 1.82 2.55 3.12 2.5 1.25-.05 1.72-.8 3.23-.8 1.5 0 1.93.8 3.25.78 1.34-.03 2.19-1.23 3.01-2.43.95-1.4 1.34-2.75 1.36-2.82-.03-.01-2.6-1-2.63-3.96ZM14.6 5.13c.69-.83 1.15-1.99 1.02-3.13-.99.04-2.18.66-2.89 1.49-.64.73-1.2 1.9-1.05 3.02 1.1.09 2.23-.56 2.92-1.38Z" />
    </svg>
  )
}
