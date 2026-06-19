import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { states, bills } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { CompliancePackDocument } from "@/lib/pdf/compliance-pack-document"

export const runtime = "nodejs"

/**
 * GET /api/app/compliance-pack/[state]
 *
 * Generates a compliance pack PDF for a specific state.
 * Designed for in-app PDF generation — the iPad app calls this
 * with the user's Bearer token.
 *
 * Headers: Authorization: Bearer ***
 * Returns: PDF buffer as application/pdf
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ state: string }> },
) {
  try {
    const stateCode = (await params).state.toUpperCase()

    if (stateCode.length !== 2) {
      return NextResponse.json(
        { error: "State code must be exactly 2 letters" },
        { status: 400 },
      )
    }

    // Fetch state data
    const [state] = await db
      .select()
      .from(states)
      .where(eq(states.code, stateCode))
      .limit(1)

    if (!state) {
      return NextResponse.json(
        { error: `State '${stateCode}' not found` },
        { status: 404 },
      )
    }

    // Fetch recent ESA-related bills
    const stateBills = await db
      .select()
      .from(bills)
      .where(eq(bills.stateCode, stateCode))
      .orderBy(desc(bills.date))
      .limit(10)

    // Build PDF data
    const pdfData = {
      stateName: state.name,
      stateCode: state.code,
      score: state.score,
      level: state.level,
      esaPrograms: (state.esaPrograms ?? []) as any[],
      nonEsaPrograms: (state.nonEsaPrograms ?? []) as any[],
      complianceForms: state.complianceForms as any,
      bills: stateBills.map((b) => ({
        number: b.number,
        title: b.title,
        date: b.date.toISOString().split("T")[0],
        impact: b.impact,
        impactSummary: b.impactSummary,
        statusStep: b.statusStep,
      })),
      generatedAt: new Date().toISOString(),
    }

    const pdfBuffer = await renderToBuffer(
      <CompliancePackDocument {...pdfData} />,
    )

    const filename = `HC-Compliance-${stateCode}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("[APP API] GET /api/app/compliance-pack/[state] failed:", error)
    return NextResponse.json(
      { error: "Failed to generate compliance pack" },
      { status: 500 },
    )
  }
}
