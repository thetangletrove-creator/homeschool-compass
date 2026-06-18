"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Copy,
  Check,
  Loader2,
  FileText,
  Download,
  Clock,
  Lock,
  Unlock,
  ShieldCheck,
} from "lucide-react"
import { loadOrCreateKeypair, getDecryptionKey, decryptPayload } from "@/lib/crypto"
import type { EncryptedBundle } from "@/lib/crypto"

type MagicLink = {
  id: string
  token: string
  studentName: string
  stateCode: string
  url: string
  createdAt: string | null
  expiresAt: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  providerName: string
  studentName: string
  totalDue: string
  status: string
  isPaidInFull: boolean
  submittedAt: string | null
  encryptedProfile: string | null
}

export default function ProviderManagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activeLinks, setActiveLinks] = useState<MagicLink[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create link form
  const [showForm, setShowForm] = useState(false)
  const [studentName, setStudentName] = useState("")
  const [stateCode, setStateCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<string | null>(null)

  // ZK keypair: generated once, stored in localStorage
  const [publicKeyHex, setPublicKeyHex] = useState<string | null>(null)
  const [decryptedProfiles, setDecryptedProfiles] = useState<
    Record<string, { credentials: string; phone: string; email: string }>
  >({})
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set())
  const [keypairReady, setKeypairReady] = useState(false)

  // Initialize keypair on mount — generates RSA-2048 keypair if first visit
  useEffect(() => {
    if (typeof window === "undefined") return
    loadOrCreateKeypair()
      .then((kp) => {
        setPublicKeyHex(kp.publicKeyHex)
        setKeypairReady(true)
      })
      .catch(() => {
        // Web Crypto unavailable — continue without ZK
        setKeypairReady(true)
      })
  }, [])

  // Decrypt all encrypted profiles when invoices load
  useEffect(() => {
    if (!keypairReady) return
    const encrypted = invoices.filter((inv) => inv.encryptedProfile)
    if (encrypted.length === 0) return

    const decryptBatch = async () => {
      const key = await getDecryptionKey()
      if (!key) return

      const ids = new Set(encrypted.map((inv) => inv.id))
      setDecryptingIds(ids)

      const results: Record<string, { credentials: string; phone: string; email: string }> = {}
      for (const inv of encrypted) {
        try {
          const bundle = JSON.parse(inv.encryptedProfile!) as EncryptedBundle
          const decrypted = await decryptPayload<{
            credentials: string
            phone: string
            email: string
          }>(key, bundle)
          results[inv.id] = decrypted
        } catch {
          // Can't decrypt — corrupted or wrong key
          results[inv.id] = { credentials: "🔒 Unable to decrypt", phone: "", email: "" }
        }
      }

      setDecryptedProfiles(results)
      setDecryptingIds(new Set())
    }

    decryptBatch()
  }, [invoices, keypairReady])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/provider/invoices")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/sign-in")
          return
        }
        throw new Error("Failed to load")
      }
      const data = await res.json()
      setInvoices(data.invoices)
      setActiveLinks(data.activeLinks)
    } catch {
      // Silent fail — component shows empty state
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback: select the text manually
    }
  }

  const createLink = async () => {
    if (!studentName.trim()) {
      setCreateError("Student name is required")
      return
    }
    if (!stateCode.trim() || stateCode.length !== 2) {
      setCreateError("Valid 2-letter state code is required")
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch("/api/provider/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          stateCode: stateCode.trim().toUpperCase(),
          publicKey: publicKeyHex ?? undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create link")

      setCreatedLink(data.url)
      setStudentName("")
      setStateCode("")
      setShowForm(false)
      // Refresh data
      fetchData()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Provider Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate invoice links for tutors and therapists. They fill in the details — you get a
          compliant PDF.
        </p>
        {publicKeyHex && keypairReady && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-700">
            <ShieldCheck className="h-4 w-4" />
            <span>
              <strong>Zero-Knowledge Encryption Active.</strong> Provider credentials, phone, and
              email are encrypted end-to-end before reaching the server. Your private key stays on
              this device.
            </span>
          </div>
        )}
      </div>

      {/* Create link button / form */}
      <div className="mb-8">
        {!showForm && !createdLink && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy/90"
          >
            <Plus className="h-4 w-4" />
            Request Invoice from Provider
          </button>
        )}

        {createdLink && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Magic link created!</p>
                <p className="mt-2 break-all font-mono text-xs text-green-700">{createdLink}</p>
              </div>
              <button
                onClick={() => {
                  copyToClipboard(createdLink, "new")
                  setCreatedLink(null)
                }}
                className="ml-4 flex-shrink-0 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                {copiedId === "new" ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <p className="mt-2 text-xs text-green-600">
              Send this link to your provider. They don&apos;t need an account — it expires in 7 days.
              {publicKeyHex && (
                <span className="block mt-1">
                  🔒 With zero-knowledge encryption enabled, their credentials and
                  contact info stay private.
                </span>
              )}
            </p>
          </div>
        )}

        {showForm && (
          <div className="max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">New Invoice Request</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  placeholder="Alex Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">State (2-letter code)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                  className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  placeholder="AZ"
                />
              </div>
              {createError && (
                <p className="text-xs text-red-600">{createError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={createLink}
                  disabled={creating}
                  className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Generate Link"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setCreateError(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active magic links */}
      {activeLinks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Active Invoice Links
          </h2>
          <div className="space-y-2">
            {activeLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {link.studentName}
                    <span className="ml-2 text-xs text-gray-400">({link.stateCode})</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{link.url}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    Expires {new Date(link.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(link.url, link.id)}
                  className="ml-4 flex-shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {copiedId === link.id ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <Check className="h-3 w-3" />
                      Copied
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Copy className="h-3 w-3" />
                      Copy Link
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invoices table */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Submitted Invoices
        </h2>

        {invoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-cream p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-muted-foreground">
              No invoices yet. Send a magic link to your provider to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Student
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        {inv.encryptedProfile && (
                          <span className="text-amber-500" title="Provider credentials are end-to-end encrypted">
                            {decryptingIds.has(inv.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                            ) : decryptedProfiles[inv.id] ? (
                              <Unlock className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </span>
                        )}
                        <span>{inv.providerName}</span>
                      </div>
                      {decryptedProfiles[inv.id] && (
                        <div className="mt-0.5 text-xs text-gray-400">
                          {decryptedProfiles[inv.id].credentials}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {inv.studentName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-800">
                      ${parseFloat(inv.totalDue).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {inv.isPaidInFull ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                          {inv.status}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-400">
                      {inv.submittedAt
                        ? new Date(inv.submittedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <a
                        href={`/api/provider/invoice/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
