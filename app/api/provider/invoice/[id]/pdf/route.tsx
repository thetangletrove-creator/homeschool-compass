import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { providerInvoices, invoiceLineItems } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoiceDocument } from "@/lib/pdf/invoice-document"

export const runtime = "nodejs"

/**
 * GET /api/provider/invoice/[id]/pdf
 *
 * Returns the invoice as a downloadable PDF.
 * The PDF matches the corporate invoice template layout that ClassWallet/Odyssey
 * auditors expect — structured, scannable, no missing fields.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id

  const [invoice] = await db
    .select()
    .from(providerInvoices)
    .where(eq(providerInvoices.id, id))
    .limit(1)

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const sessions = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.serviceDate)

  // Format the date
  const date = invoice.submittedAt
    ? new Date(invoice.submittedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

  const totalFormatted = parseFloat(invoice.totalDue).toFixed(2)

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    date,
    providerName: invoice.providerName,
    providerAddress: invoice.providerAddress,
    providerCredentials: invoice.providerCredentials,
    parentName: "ESA Account Holder", // Filled from parent profile when available
    studentName: invoice.studentName,
    sessions: sessions.map((s) => ({
      serviceDate: s.serviceDate,
      startTime: s.startTime,
      endTime: s.endTime,
      subject: s.subject,
      amount: parseFloat(s.amount).toFixed(2),
    })),
    totalDue: totalFormatted,
    isPaidInFull: invoice.isPaidInFull,
    paymentMethod: invoice.paymentMethod ?? "pending",
    paymentLastFour: invoice.paymentLastFour,
  }

  const pdfBuffer = await renderToBuffer(<InvoiceDocument {...pdfData} />)

  const filename = `HC-Invoice-${invoice.invoiceNumber}.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  })
}
