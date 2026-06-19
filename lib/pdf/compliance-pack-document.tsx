import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"

// Register fonts
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.cdnfonts.com/s/29107/Helvetica.woff", fontWeight: "normal" },
    { src: "https://fonts.cdnfonts.com/s/29107/Helvetica-Bold.woff", fontWeight: "bold" },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 24,
    borderBottom: "2 solid #1a3a5c",
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a3a5c",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a3a5c",
    marginBottom: 8,
    borderBottom: "1 solid #ccc",
    paddingBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingVertical: 2,
  },
  label: {
    color: "#666",
    width: "40%",
  },
  value: {
    width: "60%",
  },
  programCard: {
    marginBottom: 8,
    padding: 8,
    border: "1 solid #ddd",
    borderRadius: 4,
  },
  programName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  programDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 1,
  },
  billRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingVertical: 2,
    borderBottom: "1 solid #f0f0f0",
  },
  billNumber: {
    width: "15%",
    fontWeight: "bold",
    fontSize: 9,
  },
  billTitle: {
    width: "45%",
    fontSize: 9,
  },
  billImpact: {
    width: "20%",
    fontSize: 9,
    textAlign: "center",
  },
  billStatus: {
    width: "20%",
    fontSize: 9,
    textAlign: "right",
    color: "#888",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1 solid #ccc",
    paddingTop: 8,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  esActive: {
    color: "#16a34a",
    fontSize: 10,
    fontWeight: "bold",
  },
  esInactive: {
    color: "#dc2626",
    fontSize: 10,
  },
  hr: {
    borderBottom: "1 solid #eee",
    marginVertical: 8,
  },
})

// ── Types for the component props ──────────────────────────────────────

interface Program {
  name: string
  status?: string
  max_award?: string | null
  eligibility?: string | null
  platform?: string | null
  portal_url?: string | null
  application_url?: string | null
  amount?: string | null
  homeschool_eligible?: boolean
  program_type?: string
  url?: string | null
}

interface ComplianceFormData {
  notification_url?: string | null
  notification_form_url?: string | null
  assessment_rules?: string | null
  instruction_days?: string | null
  recordkeeping?: string | null
  immunization_rules?: string | null
}

interface BillData {
  number: string
  title: string
  date: string
  impact: string
  impactSummary: string | null
  statusStep: number
}

interface CompliancePackProps {
  stateName: string
  stateCode: string
  score: number
  level: string
  esaPrograms: Program[]
  nonEsaPrograms: Program[]
  complianceForms: ComplianceFormData | null
  bills: BillData[]
  generatedAt: string
}

// ── Status step labels ─────────────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = {
  0: "Introduced",
  1: "In Committee",
  2: "Passed Chamber",
  3: "Other Chamber",
  4: "Governor",
  5: "Enacted",
}

// ── Main Document Component ────────────────────────────────────────────

export function CompliancePackDocument(props: CompliancePackProps) {
  const {
    stateName,
    stateCode,
    score,
    level,
    esaPrograms,
    nonEsaPrograms,
    complianceForms,
    bills,
    generatedAt,
  } = props

  const genDate = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const hasEsa = esaPrograms.length > 0
  const hasNonEsa = nonEsaPrograms.length > 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{stateName} — Compliance Pack</Text>
          <Text style={styles.subtitle}>
            Homeschool Compass · Generated {genDate}
          </Text>
        </View>

        {/* Score Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulation Profile</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.label}>Freedom Score:</Text>
            <Text style={styles.value}>{score}/100</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.label}>Regulation Level:</Text>
            <Text style={styles.value}>{level}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.label}>ESA Available:</Text>
            <Text style={hasEsa ? styles.esActive : styles.esInactive}>
              {hasEsa ? "Yes" : "No"}
            </Text>
          </View>
        </View>

        {/* ESA Programs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ESA Programs ({esaPrograms.length})
          </Text>
          {hasEsa ? (
            esaPrograms.map((p, i) => (
              <View key={i} style={styles.programCard}>
                <Text style={styles.programName}>{p.name}</Text>
                {p.platform && (
                  <Text style={styles.programDetail}>Platform: {p.platform}</Text>
                )}
                {p.max_award && (
                  <Text style={styles.programDetail}>
                    Max Award: {p.max_award}
                  </Text>
                )}
                {p.eligibility && (
                  <Text style={styles.programDetail}>
                    Eligibility: {p.eligibility}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: "#888" }}>
              No ESA programs available in {stateName}.
            </Text>
          )}
        </View>

        {/* Non-ESA Programs */}
        {hasNonEsa && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Alternative Funding Programs ({nonEsaPrograms.length})
            </Text>
            {nonEsaPrograms.map((p, i) => (
              <View key={i} style={styles.programCard}>
                <Text style={styles.programName}>{p.name}</Text>
                {p.program_type && (
                  <Text style={styles.programDetail}>
                    Type: {p.program_type.replace(/_/g, " ")}
                  </Text>
                )}
                {p.amount && (
                  <Text style={styles.programDetail}>Amount: {p.amount}</Text>
                )}
                {p.homeschool_eligible !== undefined && (
                  <Text style={styles.programDetail}>
                    Homeschool Eligible: {p.homeschool_eligible ? "Yes" : "Check details"}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Compliance Forms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Requirements</Text>
          {complianceForms?.notification_url && (
            <View style={styles.scoreRow}>
              <Text style={styles.label}>Notification:</Text>
              <Text style={[styles.value, { fontSize: 8 }]}>
                {complianceForms.notification_url}
              </Text>
            </View>
          )}
          {complianceForms?.instruction_days && (
            <View style={styles.scoreRow}>
              <Text style={styles.label}>Instruction Days:</Text>
              <Text style={styles.value}>{complianceForms.instruction_days}</Text>
            </View>
          )}
          {complianceForms?.assessment_rules && (
            <View style={styles.scoreRow}>
              <Text style={styles.label}>Assessment:</Text>
              <Text style={[styles.value, { fontSize: 8 }]}>
                {complianceForms.assessment_rules}
              </Text>
            </View>
          )}
          {complianceForms?.recordkeeping && (
            <View style={styles.scoreRow}>
              <Text style={styles.label}>Recordkeeping:</Text>
              <Text style={[styles.value, { fontSize: 8 }]}>
                {complianceForms.recordkeeping}
              </Text>
            </View>
          )}
        </View>

        {/* Recent Bills */}
        {bills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tracked Bills ({bills.length})
            </Text>
            {/* Header row */}
            <View style={[styles.billRow, { borderBottom: "1 solid #ccc", marginBottom: 4 }]}>
              <Text style={[styles.billNumber, { fontSize: 9, color: "#888" }]}>
                Bill
              </Text>
              <Text style={[styles.billTitle, { fontSize: 9, color: "#888" }]}>
                Title
              </Text>
              <Text style={[styles.billImpact, { fontSize: 9, color: "#888" }]}>
                Impact
              </Text>
              <Text style={[styles.billStatus, { fontSize: 9, color: "#888" }]}>
                Status
              </Text>
            </View>
            {bills.map((b, i) => (
              <View key={i} style={styles.billRow}>
                <Text style={styles.billNumber}>{b.number}</Text>
                <Text style={styles.billTitle}>{b.title}</Text>
                <Text style={styles.billImpact}>{b.impact}</Text>
                <Text style={styles.billStatus}>
                  {STATUS_LABELS[b.statusStep] ?? "Unknown"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Homeschool Compass · {stateName} Compliance Pack · Generated {genDate} ·
          Data updates daily from official state sources.
        </Text>
      </Page>
    </Document>
  )
}
