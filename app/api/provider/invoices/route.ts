import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { providerInvoices, invoiceMagicLinks, invoiceLineItems } from "@/lib/db/schema"
import { eq, and, gt, desc, sql } from "drizzle-orm"

export const runtime = "nodejs"

/**
 * GET /api/provider/invoices
 *
 * Returns all invoices for the authenticated parent, plus active magic links.
 * Used by the parent dashboard Provider page.
 */
export async function GET() {
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Invoices submitted by providers for this parent
  const invoices = await db
    .select({
      id: providerInvoices.id,
      invoiceNumber: providerInvoices.invoiceNumber,
      providerName: providerInvoices.providerName,
      studentName: providerInvoices.studentName,
      totalDue: providerInvoices.totalDue,
      status: providerInvoices.status,
      isPaidInFull: providerInvoices.isPaidInFull,
      submittedAt: providerInvoices.submittedAt,
      encryptedProfile: providerInvoices.encryptedProfile,
    })
    .from(providerInvoices)
    .where(eq(providerInvoices.parentId, userId))
    .orderBy(desc(providerInvoices.submittedAt))

  // Active (unused, not expired) magic links
  const activeLinks = await db
    .select({
      id: invoiceMagicLinks.id,
      token: invoiceMagicLinks.token,
      studentName: invoiceMagicLinks.studentName,
      stateCode: invoiceMagicLinks.stateCode,
      createdAt: invoiceMagicLinks.createdAt,
      expiresAt: invoiceMagicLinks.expiresAt,
    })
    .from(invoiceMagicLinks)
    .where(
      and(
        eq(invoiceMagicLinks.parentId, userId),
        eq(invoiceMagicLinks.used, false),
        gt(invoiceMagicLinks.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(invoiceMagicLinks.createdAt))

  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : "http://localhost:3000"

  const linksWithUrls = activeLinks.map((l) => ({
    ...l,
    url: `${domain}/provider/${l.token}`,
    createdAt: l.createdAt?.toISOString() ?? null,
    expiresAt: l.expiresAt.toISOString(),
  }))

  return NextResponse.json({
    invoices,
    activeLinks: linksWithUrls,
  })
}
