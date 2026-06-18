import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import {
  invoiceMagicLinks,
  providers,
  providerInvoices,
  invoiceLineItems,
} from "@/lib/db/schema"
import { eq, and, gt } from "drizzle-orm"
import crypto from "crypto"

export const runtime = "nodejs"

// ── GET /api/provider/[token] ─────────────────────────────────────────────
// Returns magic link metadata so the form can pre-populate student name + state.
// No auth required — the token IS the auth.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const token = (await params).token

  const [link] = await db
    .select()
    .from(invoiceMagicLinks)
    .where(
      and(
        eq(invoiceMagicLinks.token, token),
        eq(invoiceMagicLinks.used, false),
        gt(invoiceMagicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!link) {
    return NextResponse.json(
      { error: "Magic link not found, already used, or expired." },
      { status: 404 },
    )
  }

  return NextResponse.json({
    valid: true,
    studentName: link.studentName,
    stateCode: link.stateCode,
    expiresAt: link.expiresAt.toISOString(),
  })
}

// ── POST /api/provider/[token] ────────────────────────────────────────────
// Provider submits the invoice. No auth required — the token IS the auth.
// If the provider's email is new, we create a provider record.
//
// Supports two modes:
//   1. Plaintext (legacy): provider identity sent as raw fields
//   2. ZK Encrypted: sensitive fields (credentials, phone, email) encrypted
//      under the parent's RSA public key. Server stores only the ciphertext.
//
// Body: {
//   provider: { legalName, businessName?, address, email, phone, credentials },
//   encryptedProfile?: { encryptedKey, iv, tag, ciphertext },  // ZK mode
//   sessions: [{ serviceDate, startTime, endTime, subject, hourlyRate }],
//   payment: { totalDue, paymentMethod, parentAlreadyPaid, paymentLastFour? }
// }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const token = (await params).token

  // Validate magic link
  const [link] = await db
    .select()
    .from(invoiceMagicLinks)
    .where(
      and(
        eq(invoiceMagicLinks.token, token),
        eq(invoiceMagicLinks.used, false),
        gt(invoiceMagicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!link) {
    return NextResponse.json(
      { error: "Magic link not found, already used, or expired." },
      { status: 404 },
    )
  }

  // Parse body
  let body: {
    provider?: {
      legalName: string
      businessName?: string
      address: string
      email: string
      phone: string
      credentials: string
    }
    encryptedProfile?: {
      encryptedKey: string
      iv: string
      tag: string
      ciphertext: string
    } | null
    sessions?: {
      serviceDate: string
      startTime: string
      endTime: string
      subject: string
      hourlyRate: string
    }[]
    payment?: {
      totalDue: string
      paymentMethod: string
      parentAlreadyPaid: boolean
      paymentLastFour?: string
    }
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const isZkMode = !!body.encryptedProfile

  // Validate required fields
  if (!body.provider?.legalName) {
    return NextResponse.json({ error: "Provider legal name is required" }, { status: 400 })
  }
  if (!body.provider?.address) {
    return NextResponse.json({ error: "Provider address is required" }, { status: 400 })
  }
  if (!isZkMode && !body.provider?.email) {
    return NextResponse.json({ error: "Provider email is required" }, { status: 400 })
  }
  if (!isZkMode && !body.provider?.phone) {
    return NextResponse.json({ error: "Provider phone is required" }, { status: 400 })
  }
  if (!isZkMode && !body.provider?.credentials) {
    return NextResponse.json({ error: "Provider credentials are required" }, { status: 400 })
  }
  if (!body.sessions || body.sessions.length === 0) {
    return NextResponse.json({ error: "At least one session line item is required" }, { status: 400 })
  }
  if (!body.payment?.totalDue) {
    return NextResponse.json({ error: "Total due is required" }, { status: 400 })
  }

  // Validate each session
  for (const s of body.sessions) {
    if (!s.serviceDate || !s.startTime || !s.endTime || !s.subject || !s.hourlyRate) {
      return NextResponse.json(
        { error: "Each session requires serviceDate, startTime, endTime, subject, and hourlyRate" },
        { status: 400 },
      )
    }
  }

  // 1. Upsert provider
  // In ZK mode, email is "encrypted" sentinel — use a hash for dedup
  const providerEmail = isZkMode
    ? `zk-${crypto.createHash("sha256").update(token).digest("hex").slice(0, 16)}@encrypted.local`
    : body.provider!.email

  const [existingProvider] = await db
    .select()
    .from(providers)
    .where(eq(providers.email, providerEmail))
    .limit(1)

  let providerId: string
  if (existingProvider) {
    providerId = existingProvider.id
    await db
      .update(providers)
      .set({
        legalName: body.provider.legalName,
        businessName: body.provider.businessName ?? null,
        address: body.provider.address,
        phone: isZkMode ? "encrypted" : body.provider!.phone,
        credentials: isZkMode ? "encrypted" : body.provider!.credentials,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, providerId))
  } else {
    const [newProvider] = await db
      .insert(providers)
      .values({
        legalName: body.provider.legalName,
        businessName: body.provider.businessName ?? null,
        address: body.provider.address,
        email: providerEmail,
        phone: isZkMode ? "encrypted" : body.provider!.phone,
        credentials: isZkMode ? "encrypted" : body.provider!.credentials,
      })
      .returning({ id: providers.id })
    providerId = newProvider.id
  }

  // 2. Generate invoice number
  const invoiceNumber = `HC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`

  // 3. Create invoice record
  const isPaidInFull = body.payment.parentAlreadyPaid === true

  const credentialsLabel = isZkMode
    ? "🔒 End-to-End Encrypted"
    : body.provider!.credentials

  const [invoice] = await db
    .insert(providerInvoices)
    .values({
      invoiceNumber,
      magicLinkId: link.id,
      providerId,
      parentId: link.parentId,
      studentName: link.studentName,
      stateCode: link.stateCode,
      totalDue: body.payment.totalDue,
      paymentMethod: body.payment.paymentMethod as typeof providerInvoices.$inferSelect["paymentMethod"],
      parentAlreadyPaid: body.payment.parentAlreadyPaid,
      paymentLastFour: body.payment.paymentLastFour ?? null,
      isPaidInFull,
      providerName: body.provider.businessName
        ? `${body.provider.businessName} (${body.provider.legalName})`
        : body.provider.legalName,
      providerAddress: body.provider.address,
      providerCredentials: credentialsLabel,
      encryptedProfile: body.encryptedProfile
        ? JSON.stringify(body.encryptedProfile)
        : null,
    })
    .returning({ id: providerInvoices.id })

  // 4. Insert line items
  const lineItemValues = body.sessions.map((s) => {
    const hours =
      parseFloat(s.endTime.split(":")[0]) - parseFloat(s.startTime.split(":")[0])
    const amount = (parseFloat(s.hourlyRate) * hours).toFixed(2)
    return {
      invoiceId: invoice.id,
      serviceDate: s.serviceDate,
      startTime: s.startTime,
      endTime: s.endTime,
      subject: s.subject,
      hourlyRate: s.hourlyRate,
      amount,
    }
  })

  await db.insert(invoiceLineItems).values(lineItemValues)

  // 5. Mark magic link as used
  await db
    .update(invoiceMagicLinks)
    .set({ used: true })
    .where(eq(invoiceMagicLinks.id, link.id))

  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : request.headers.get("origin") || "http://localhost:3000"

  return NextResponse.json({
    success: true,
    invoice: {
      id: invoice.id,
      invoiceNumber,
      pdfUrl: `${domain}/api/provider/invoice/${invoice.id}/pdf`,
    },
  })
}
