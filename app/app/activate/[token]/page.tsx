"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"

const APP_SCHEME = "homeschoolcompass://auth/activate"

/**
 * /app/activate/[token]
 *
 * Magic link activation page — handles both:
 * 1. Deep link to the iPad app (homeschoolcompass://)
 * 2. Web fallback for users who click the link on a desktop
 */
export default function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [status, setStatus] = useState<"activating" | "success" | "error">(
    "activating",
  )
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function activate() {
      try {
        const res = await fetch("/api/app/auth/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()

        if (!res.ok) {
          setStatus("error")
          setMessage(data.error ?? "Activation failed")
          return
        }

        setStatus("success")
        setMessage(`Activated for ${data.email}`)

        // Try deep link to iPad app
        const appUrl = `${APP_SCHEME}/${token}`
        window.location.href = appUrl

        // If the deep link doesn't work, the user stays on this page
        setTimeout(() => {
          // Still show the success state
        }, 500)
      } catch (err) {
        setStatus("error")
        setMessage("Network error — please check your connection")
      }
    }

    activate()
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f6f0] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e2dcd0] bg-white p-8 text-center shadow-sm">
        {/* Logo */}
        <div className="mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1a3a5c] text-white">
            <span className="text-2xl font-bold">HC</span>
          </div>
        </div>

        {status === "activating" && (
          <>
            <h1 className="mb-2 text-xl font-semibold text-[#1a3a5c]">
              Activating Your Purchase…
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              Please wait while we verify your link.
            </p>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1a3a5c] border-t-transparent" />
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="mb-2 text-xl font-semibold text-[#1a3a5c]">
              ✅ Purchase Activated
            </h1>
            <p className="mb-6 text-sm text-gray-600">{message}</p>
            <div className="rounded-lg bg-[#f0f7f0] p-4 text-left text-sm">
              <p className="mb-2 font-medium text-[#1a3a5c]">
                Opening the iPad app…
              </p>
              <p className="text-gray-500">
                If the app doesn&apos;t open automatically, make sure{" "}
                <strong>Homeschool Compass</strong> is installed on your iPad,
                then tap the link again.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/"
                className="text-sm text-[#1a3a5c] underline hover:text-[#2a5a8c]"
              >
                Back to Homeschool Compass
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="mb-2 text-xl font-semibold text-red-600">
              Activation Failed
            </h1>
            <p className="mb-6 text-sm text-gray-600">{message}</p>
            <div className="rounded-lg bg-red-50 p-4 text-left text-sm text-gray-600">
              <p className="mb-2 font-medium text-red-700">
                Common fixes:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>The link may have expired (valid for 90 days)</li>
                <li>The link may have already been used</li>
                <li>Try copying the link and opening it directly</li>
              </ul>
            </div>
            <div className="mt-6">
              <Link
                href="/support"
                className="text-sm text-[#1a3a5c] underline hover:text-[#2a5a8c]"
              >
                Contact Support
              </Link>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-400">
          Homeschool Compass &mdash; Compliance Tools for Funded Homeschooling
        </p>
      </div>
    </div>
  )
}
