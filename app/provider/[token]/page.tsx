"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Download,
  Lock,
  ShieldCheck,
} from "lucide-react"
import { importPublicKey, encryptPayload } from "@/lib/crypto"
import type { EncryptedBundle } from "@/lib/crypto"

const SUBJECTS = [
  "1-on-1 Mathematics Instruction",
  "1-on-1 Science Instruction",
  "1-on-1 Language Arts Instruction",
  "1-on-1 History Instruction",
  "1-on-1 Foreign Language Instruction",
  "1-on-1 Music Instruction/Theory",
  "1-on-1 Art Instruction",
  "1-on-1 Reading Intervention",
  "1-on-1 Executive Function Coaching",
  "Group Mathematics Tutoring",
  "Group Science Tutoring",
  "Group Language Arts Tutoring",
  "Educational Therapy Session",
  "Speech/Language Therapy",
  "Occupational Therapy",
]

const PAYMENT_METHODS = [
  { value: "credit_card", label: "Credit Card" },
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH / Bank Transfer" },
  { value: "portal_direct", label: "Direct Pay via Portal" },
  { value: "other", label: "Other" },
]

const STEPS = [
  { num: 1, label: "Identity & Credentials" },
  { num: 2, label: "Sessions" },
  { num: 3, label: "Payment" },
  { num: 4, label: "Review & Submit" },
]

type Session = {
  serviceDate: string
  startTime: string
  endTime: string
  subject: string
  hourlyRate: string
}

export default function ProviderInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter()
  const [token, setToken] = useState<string>("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<{ invoiceNumber: string; pdfUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linkValid, setLinkValid] = useState<boolean | null>(null)

  // ZK encryption: parent's public key from URL hash fragment
  const [publicKeyHex, setPublicKeyHex] = useState("")
  const [allowSave, setAllowSave] = useState(false)
  const [encrypting, setEncrypting] = useState(false)

  // Step 1 — Provider Identity
  const [legalName, setLegalName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [credentials, setCredentials] = useState("")
  const [studentName, setStudentName] = useState("")
  const [stateCode, setStateCode] = useState("")

  // Step 2 — Sessions
  const [sessions, setSessions] = useState<Session[]>([
    { serviceDate: "", startTime: "", endTime: "", subject: "", hourlyRate: "" },
  ])

  // Step 3 — Payment
  const [paymentMethod, setPaymentMethod] = useState("credit_card")
  const [parentAlreadyPaid, setParentAlreadyPaid] = useState(false)
  const [paymentLastFour, setPaymentLastFour] = useState("")

  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    fetch(`/api/provider/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setLinkValid(true)
          setStudentName(data.studentName)
          setStateCode(data.stateCode)
        } else {
          setLinkValid(false)
          setError(data.error ?? "Invalid or expired link")
        }
      })
      .catch(() => {
        setLinkValid(false)
        setError("Could not load invoice link")
      })
      .finally(() => setLoading(false))
  }, [token])

  // ZK: read parent's public key from URL hash fragment
  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash
    if (!hash) return
    const match = hash.match(/pubkey=([a-f0-9]+)/i)
    if (match) {
      setPublicKeyHex(match[1])
    }
  }, [])

  const addSession = useCallback(() => {
    setSessions((s) => [
      ...s,
      { serviceDate: "", startTime: "", endTime: "", subject: "", hourlyRate: "" },
    ])
  }, [])

  const removeSession = useCallback((i: number) => {
    setSessions((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s))
  }, [])

  const updateSession = useCallback(
    (i: number, field: keyof Session, value: string) => {
      setSessions((s) =>
        s.map((session, idx) =>
          idx === i ? { ...session, [field]: value } : session,
        ),
      )
    },
    [],
  )

  const calcTotal = useCallback(() => {
    return sessions
      .reduce((sum, s) => {
        if (!s.startTime || !s.endTime || !s.hourlyRate) return sum
        const start = parseFloat(s.startTime.split(":")[0])
        const end = parseFloat(s.endTime.split(":")[0])
        const hours = end - start
        if (hours <= 0) return sum
        return sum + hours * parseFloat(s.hourlyRate)
      }, 0)
      .toFixed(2)
  }, [sessions])

  const validateStep1 = () => {
    if (!legalName.trim()) return "Legal name is required"
    if (!address.trim()) return "Physical address is required"
    if (!email.trim() || !email.includes("@")) return "Valid email is required"
    if (!phone.trim()) return "Phone number is required"
    if (!credentials.trim()) return "Credentials are required (cert # or degree)"
    return null
  }

  const validateStep2 = () => {
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i]
      if (!s.serviceDate) return `Session ${i + 1}: service date is required`
      if (!s.startTime) return `Session ${i + 1}: start time is required`
      if (!s.endTime) return `Session ${i + 1}: end time is required`
      if (!s.subject) return `Session ${i + 1}: subject is required`
      if (!s.hourlyRate || parseFloat(s.hourlyRate) <= 0)
        return `Session ${i + 1}: valid hourly rate is required`

      // Block generic descriptions
      const lower = s.subject.toLowerCase()
      if (
        lower.includes("tutoring services") &&
        !lower.includes("instruction") &&
        !lower.includes("1-on-1")
      ) {
        return `Session ${i + 1}: generic description not allowed. Use specific strings like "1-on-1 Algebra II Instruction"`
      }
    }
    return null
  }

  const handleNext = () => {
    const validationError =
      step === 1 ? validateStep1() : step === 2 ? validateStep2() : null
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, 4))
  }

  const handleSubmit = async () => {
    const err1 = validateStep1()
    const err2 = validateStep2()
    if (err1 || err2) {
      setError(err1 ?? err2 ?? "Validation failed")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // ZK encryption: encrypt sensitive provider fields under parent's public key
      let encryptedProfile: EncryptedBundle | null = null
      if (publicKeyHex && allowSave) {
        setEncrypting(true)
        const pubKey = await importPublicKey(publicKeyHex)
        encryptedProfile = await encryptPayload(pubKey, {
          credentials,
          phone,
          email,
        })
        setEncrypting(false)
      }

      const res = await fetch(`/api/provider/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: {
            legalName,
            businessName: businessName || undefined,
            address,
            email: encryptedProfile ? "encrypted" : email,
            phone: encryptedProfile ? "encrypted" : phone,
            credentials: encryptedProfile ? "encrypted" : credentials,
          },
          encryptedProfile,
          sessions: sessions.map((s) => ({
            serviceDate: s.serviceDate,
            startTime: s.startTime,
            endTime: s.endTime,
            subject: s.subject,
            hourlyRate: parseFloat(s.hourlyRate).toFixed(2),
          })),
          payment: {
            totalDue: calcTotal(),
            paymentMethod,
            parentAlreadyPaid,
            paymentLastFour: paymentLastFour || undefined,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit invoice")
      }

      setResult(data.invoice)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / Error / Success screens ──

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading invoice...</span>
        </div>
      </div>
    )
  }

  if (linkValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-4 max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Link Expired or Invalid</h1>
          <p className="mt-3 text-gray-600">
            {error ?? "This invoice link is no longer valid. Ask the parent to send a new one."}
          </p>
        </div>
      </div>
    )
  }

  if (done && result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Invoice Submitted</h1>
          <p className="mt-2 text-sm text-gray-600">
            Invoice <span className="font-mono font-medium">{result.invoiceNumber}</span> has been
            submitted. The parent will receive a notification.
          </p>
          <a
            href={result.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy/90"
          >
            <Download className="h-4 w-4" />
            Download Invoice PDF
          </a>
          <p className="mt-4 text-xs text-gray-400">
            This PDF is formatted for ClassWallet / Odyssey compliance.
          </p>
        </div>
      </div>
    )
  }

  // ── Main form ──

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-navy">Provider Invoice</h1>
          {studentName && (
            <p className="mt-1 text-sm text-gray-500">
              Invoice for <span className="font-medium text-gray-700">{studentName}</span>
              {stateCode ? ` · ${stateCode}` : ""}
            </p>
          )}
        </div>

        {/* Steps indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    step === s.num
                      ? "bg-navy text-white"
                      : step > s.num
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-12 ${
                      step > s.num ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            {STEPS.find((s) => s.num === step)?.label}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Provider Identity & Credentials */}
        {step === 1 && (
          <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Provider Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                placeholder="Jane Smith, M.A."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Name (optional)
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                placeholder="Smith Tutoring LLC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Physical Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                placeholder="123 Main St, Phoenix, AZ 85001"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  placeholder="(602) 555-0123"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Credentials <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                placeholder="State Teaching Cert #AZ-123456 or B.S. Mathematics, ASU"
              />
              <p className="mt-1 text-xs text-gray-400">
                Must match what your state&apos;s ESA auditor expects: certificate number, degree, or
                professional license.
              </p>
            </div>
            {/* ZK Consent */}
            {publicKeyHex && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={allowSave}
                    onChange={(e) => setAllowSave(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        🔏 Allow this parent to securely save my provider profile
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-blue-600">
                      Your credentials, phone number, and email will be encrypted so
                      only the parent can read them. The server stores only the
                      encrypted data — this keeps your personal information
                      private.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Calendar-Linked Itemization */}
        {step === 2 && (
          <div className="space-y-4">
            {sessions.map((session, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Session {i + 1}
                  </h3>
                  {sessions.length > 1 && (
                    <button
                      onClick={() => removeSession(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Date of Service
                    </label>
                    <input
                      type="date"
                      value={session.serviceDate}
                      onChange={(e) => updateSession(i, "serviceDate", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={session.startTime}
                        onChange={(e) => updateSession(i, "startTime", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={session.endTime}
                        onChange={(e) => updateSession(i, "endTime", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Subject Area
                    </label>
                    <select
                      value={session.subject}
                      onChange={(e) => updateSession(i, "subject", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="">Select subject...</option>
                      {SUBJECTS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={session.hourlyRate}
                      onChange={(e) => updateSession(i, "hourlyRate", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="50.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addSession}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-navy hover:text-navy"
            >
              <Plus className="h-4 w-4" />
              Add Another Session
            </button>
          </div>
        )}

        {/* Step 3: Payment Reconciliation */}
        {step === 3 && (
          <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Due
              </label>
              <p className="mt-1 text-2xl font-bold text-navy">${calcTotal()}</p>
              <p className="text-xs text-gray-400">
                Calculated from {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={parentAlreadyPaid}
                  onChange={(e) => setParentAlreadyPaid(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    The parent has already paid me for these services
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500">
                    If checked, the document header changes from INVOICE to INVOICE & RECEIPT and
                    shows a &quot;PAID IN FULL - BALANCE ZERO&quot; watermark.
                  </p>
                </div>
              </label>
            </div>
            {parentAlreadyPaid && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Last 4 Digits (optional)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={paymentLastFour}
                  onChange={(e) =>
                    setPaymentLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  placeholder="1234"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-navy">Review Your Invoice</h2>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Provider
              </h3>
              <div className="mt-1 space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-medium">{legalName}</span>
                  {businessName ? ` · ${businessName}` : ""}
                </p>
                <p>{address}</p>
                <p>
                  {email} · {phone}
                </p>
                <p className="font-mono text-xs text-gray-500">{credentials}</p>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Client
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Student: <span className="font-medium">{studentName}</span> ({stateCode})
              </p>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Sessions
              </h3>
              <div className="mt-2 divide-y divide-gray-100">
                {sessions.map((s, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium">{s.serviceDate}</span>
                      <span className="text-gray-500">
                        {" "}
                        · {s.startTime}–{s.endTime}
                      </span>
                      <span className="block text-xs text-gray-400">{s.subject}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">
                        ${(parseFloat(s.hourlyRate) || 0).toFixed(2)}/hr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Total Due</span>
              <span className="text-xl font-bold text-navy">${calcTotal()}</span>
            </div>

            {parentAlreadyPaid && (
              <div className="rounded-lg border-2 border-green-500 bg-green-50 p-3 text-center">
                <p className="text-sm font-bold text-green-700">
                  PAID IN FULL — BALANCE ZERO
                </p>
                <p className="text-xs text-green-600">
                  This invoice will be stamped as a receipt.
                </p>
              </div>
            )}
            {/* ZK encryption indicator */}
            {allowSave && publicKeyHex && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Lock className="h-4 w-4" />
                <span>
                  Your credentials, phone, and email will be end-to-end encrypted.
                  Only the parent can decrypt them.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => {
                setError(null)
                setStep((s) => s - 1)
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded-lg bg-navy px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {encrypting ? "Encrypting..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Submit Invoice
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
