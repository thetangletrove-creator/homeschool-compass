import React from "react"
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer"

// Register a monospace font for the invoice-style layout
Font.register({
  family: "Courier",
  fonts: [
    { src: "https://fonts.cdnfonts.com/s/14982/Courier.woff", fontWeight: "normal" },
    { src: "https://fonts.cdnfonts.com/s/14982/Courier Bold.woff", fontWeight: "bold" },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Courier",
    fontSize: 9,
    lineHeight: 1.4,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #1a1a1a",
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 12,
  },
  box: {
    border: "1 solid #333",
    padding: 10,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #333",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #ccc",
    paddingVertical: 3,
  },
  colDate: { width: "15%" },
  colTime: { width: "20%" },
  colSubject: { width: "40%" },
  colAmount: { width: "15%", textAlign: "right" },
  footer: {
    marginTop: 20,
    borderTop: "2 solid #1a1a1a",
    paddingTop: 12,
  },
  stamp: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 8,
    padding: 6,
    border: "2 solid #1a1a1a",
    textAlign: "center",
  },
  bold: {
    fontWeight: "bold",
  },
})

type PdfInvoiceData = {
  invoiceNumber: string
  date: string
  providerName: string
  providerAddress: string
  providerCredentials: string
  parentName: string
  studentName: string
  sessions: {
    serviceDate: string
    startTime: string
    endTime: string
    subject: string
    amount: string
  }[]
  totalDue: string
  isPaidInFull: boolean
  paymentMethod: string
  paymentLastFour: string | null
}

export function InvoiceDocument({
  invoiceNumber,
  date,
  providerName,
  providerAddress,
  providerCredentials,
  parentName,
  studentName,
  sessions,
  totalDue,
  isPaidInFull,
  paymentMethod,
  paymentLastFour,
}: PdfInvoiceData) {
  const documentTitle = isPaidInFull ? "INVOICE & RECEIPT" : "INVOICE"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header: Provider + Invoice Metadata ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text>
              PROVIDER: {providerName}
            </Text>
            <Text>
              {documentTitle} #: {invoiceNumber}
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text>ADDRESS: {providerAddress}</Text>
            <Text>DATE: {date}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text>CREDENTIALS: {providerCredentials}</Text>
          </View>
        </View>

        {/* ── Client Billing Info ── */}
        <Text style={styles.sectionLabel}>Client Billing Information</Text>
        <View style={styles.box}>
          <Text>Parent Legal Name: {parentName}</Text>
          <Text>Student Legal Name: {studentName}</Text>
        </View>

        {/* ── Itemized Services ── */}
        <Text style={styles.sectionLabel}>Itemized Services Rendered</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colTime}>Time</Text>
            <Text style={styles.colSubject}>Subject</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {sessions.map((s, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colDate}>{s.serviceDate}</Text>
              <Text style={styles.colTime}>
                {s.startTime} - {s.endTime}
              </Text>
              <Text style={styles.colSubject}>{s.subject}</Text>
              <Text style={styles.colAmount}>${s.amount}</Text>
            </View>
          ))}
        </View>

        {/* ── Total + Status ── */}
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text style={styles.bold}>TOTAL DUE:</Text>
            <Text style={styles.bold}>${totalDue}</Text>
          </View>
          {isPaidInFull ? (
            <Text style={styles.stamp}>
              PAID IN FULL — BALANCE ZERO
              {paymentLastFour ? ` (${paymentMethod.toUpperCase()} ...${paymentLastFour})` : ""}
            </Text>
          ) : (
            <Text>
              STATUS: PENDING — {paymentMethod?.toUpperCase() ?? "UNPAID"}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}
