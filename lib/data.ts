// ── Types (moved to lib/types.ts — imported for local use, re-exported for consumers) ──
import type {
  RegulationLevel,
  Grade,
  Subscores,
  Requirement,
  EsaProgram,
  LegalCase,
  StateData,
  BillStatus,
  Bill,
  Impact,
  DbQueries,
} from "./types"
export type {
  RegulationLevel,
  Grade,
  Subscores,
  Requirement,
  EsaProgram,
  LegalCase,
  StateData,
  BillStatus,
  Bill,
  Impact,
  DbQueries,
} from "./types"

// ── Re-exported DB layer (new async interface) ──────────────────────────
export { getDb, initLiveDb } from "./db"

// ═══════════════════════════════════════════════════════════════════════════
// Legacy sync mock data — preserved for backward compatibility.
//
// Existing pages and components import from "@/lib/data" and expect
// synchronous data arrays and functions. These still work unchanged.
//
// NEW code should use the async interface:
//   import { getDb } from "@/lib/data"
//   const db = await getDb()
//   const states = await db.getStates()
//
// When all consumers have migrated, this file becomes a thin re-export.
// ═══════════════════════════════════════════════════════════════════════════

// ── Mock state data ────────────────────────────────────────────────────

function gradeFromScore(score: number): Grade {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  if (score >= 40) return "D"
  return "F"
}

function levelFromScore(score: number): RegulationLevel {
  if (score >= 85) return "No Notice"
  if (score >= 70) return "Low Regulation"
  if (score >= 50) return "Moderate"
  return "High"
}

export const GRADE_COLORS: Record<Grade, string> = {
  A: "var(--safe)",
  B: "#16a34a",
  C: "#d97706",
  D: "#ea580c",
  F: "#dc2626",
}

export const BILL_STEPS: BillStatus[] = [
  "Introduced",
  "In Committee",
  "Passed Chamber",
  "Other Chamber",
  "Governor",
  "Enacted",
]

const rawStates: Array<{
  code: string
  name: string
  score: number
  sub: Subscores
  esa: EsaProgram
}> = [
  { code: "AL", name: "Alabama", score: 82, sub: { reporting: 80, testing: 90, curriculum: 85, teacher: 75 }, esa: { active: true, name: "CHOOSE Act ESA", maxAward: "$7,000", eligibility: "All K-12 students phased in by 2027", documentation: ["Enrollment affidavit", "Approved expense receipts"], deadline: "April 7, 2026" } },
  { code: "AK", name: "Alaska", score: 95, sub: { reporting: 98, testing: 95, curriculum: 95, teacher: 92 }, esa: { active: true, name: "Correspondence Allotment", maxAward: "$3,400", eligibility: "Enrolled correspondence students", documentation: ["Individual Learning Plan"], deadline: "Rolling" } },
  { code: "AZ", name: "Arizona", score: 88, sub: { reporting: 90, testing: 92, curriculum: 90, teacher: 80 }, esa: { active: true, name: "Empowerment Scholarship Account", maxAward: "$7,500", eligibility: "Universal K-12 eligibility", documentation: ["Quarterly expense reports", "Enrollment verification"], deadline: "Rolling, quarterly" } },
  { code: "AR", name: "Arkansas", score: 70, sub: { reporting: 65, testing: 78, curriculum: 80, teacher: 60 }, esa: { active: true, name: "LEARNS Act EFA", maxAward: "$6,800", eligibility: "Phasing to universal in 2025-26", documentation: ["Approved provider receipts"], deadline: "May 1, 2026" } },
  { code: "CA", name: "California", score: 48, sub: { reporting: 42, testing: 70, curriculum: 45, teacher: 35 }, esa: { active: false } },
  { code: "CO", name: "Colorado", score: 66, sub: { reporting: 55, testing: 60, curriculum: 80, teacher: 70 }, esa: { active: false } },
  { code: "CT", name: "Connecticut", score: 78, sub: { reporting: 85, testing: 80, curriculum: 80, teacher: 68 }, esa: { active: false } },
  { code: "DE", name: "Delaware", score: 72, sub: { reporting: 70, testing: 78, curriculum: 75, teacher: 65 }, esa: { active: false } },
  { code: "FL", name: "Florida", score: 84, sub: { reporting: 80, testing: 85, curriculum: 88, teacher: 82 }, esa: { active: true, name: "Family Empowerment Scholarship", maxAward: "$8,000", eligibility: "Universal K-12 eligibility", documentation: ["Quarterly compliance attestation"], deadline: "Rolling" } },
  { code: "GA", name: "Georgia", score: 68, sub: { reporting: 58, testing: 65, curriculum: 78, teacher: 70 }, esa: { active: true, name: "Georgia Promise Scholarship", maxAward: "$6,500", eligibility: "Students in low-performing zones", documentation: ["Expense ledger"], deadline: "March 15, 2026" } },
  { code: "HI", name: "Hawaii", score: 58, sub: { reporting: 50, testing: 55, curriculum: 65, teacher: 60 }, esa: { active: false } },
  { code: "ID", name: "Idaho", score: 96, sub: { reporting: 98, testing: 96, curriculum: 95, teacher: 95 }, esa: { active: false } },
  { code: "IL", name: "Illinois", score: 90, sub: { reporting: 95, testing: 92, curriculum: 90, teacher: 82 }, esa: { active: false } },
  { code: "IN", name: "Indiana", score: 80, sub: { reporting: 82, testing: 80, curriculum: 82, teacher: 76 }, esa: { active: true, name: "Education Scholarship Account", maxAward: "$6,200", eligibility: "Students with disabilities", documentation: ["IEP or service plan"], deadline: "September 1, 2026" } },
  { code: "IA", name: "Iowa", score: 76, sub: { reporting: 72, testing: 78, curriculum: 80, teacher: 72 }, esa: { active: true, name: "Students First ESA", maxAward: "$7,800", eligibility: "Universal in 2025-26", documentation: ["Approved expense receipts"], deadline: "June 30, 2026" } },
  { code: "KS", name: "Kansas", score: 74, sub: { reporting: 70, testing: 75, curriculum: 78, teacher: 72 }, esa: { active: false } },
  { code: "KY", name: "Kentucky", score: 79, sub: { reporting: 78, testing: 80, curriculum: 82, teacher: 75 }, esa: { active: false } },
  { code: "LA", name: "Louisiana", score: 60, sub: { reporting: 52, testing: 60, curriculum: 68, teacher: 60 }, esa: { active: true, name: "LA GATOR Scholarship", maxAward: "$5,500", eligibility: "Income-based phase-in", documentation: ["Income verification", "Expense ledger"], deadline: "April 30, 2026" } },
  { code: "ME", name: "Maine", score: 73, sub: { reporting: 68, testing: 75, curriculum: 78, teacher: 70 }, esa: { active: false } },
  { code: "MD", name: "Maryland", score: 71, sub: { reporting: 65, testing: 72, curriculum: 76, teacher: 70 }, esa: { active: false } },
  { code: "MA", name: "Massachusetts", score: 56, sub: { reporting: 48, testing: 55, curriculum: 62, teacher: 58 }, esa: { active: false } },
  { code: "MI", name: "Michigan", score: 92, sub: { reporting: 95, testing: 94, curriculum: 92, teacher: 86 }, esa: { active: false } },
  { code: "MN", name: "Minnesota", score: 64, sub: { reporting: 55, testing: 65, curriculum: 70, teacher: 64 }, esa: { active: false } },
  { code: "MS", name: "Mississippi", score: 86, sub: { reporting: 90, testing: 88, curriculum: 85, teacher: 80 }, esa: { active: false } },
  { code: "MO", name: "Missouri", score: 81, sub: { reporting: 80, testing: 82, curriculum: 84, teacher: 78 }, esa: { active: true, name: "MOScholars ESA", maxAward: "$6,400", eligibility: "Income and geography based", documentation: ["Expense receipts"], deadline: "August 1, 2026" } },
  { code: "MT", name: "Montana", score: 94, sub: { reporting: 96, testing: 95, curriculum: 94, teacher: 90 }, esa: { active: false } },
  { code: "NE", name: "Nebraska", score: 75, sub: { reporting: 72, testing: 76, curriculum: 78, teacher: 72 }, esa: { active: false } },
  { code: "NV", name: "Nevada", score: 83, sub: { reporting: 84, testing: 85, curriculum: 84, teacher: 78 }, esa: { active: false } },
  { code: "NH", name: "New Hampshire", score: 87, sub: { reporting: 88, testing: 88, curriculum: 88, teacher: 82 }, esa: { active: true, name: "Education Freedom Account", maxAward: "$5,200", eligibility: "Income up to 350% FPL", documentation: ["Income verification", "Expense ledger"], deadline: "June 30, 2026" } },
  { code: "NJ", name: "New Jersey", score: 91, sub: { reporting: 94, testing: 92, curriculum: 92, teacher: 84 }, esa: { active: false } },
  { code: "NM", name: "New Mexico", score: 77, sub: { reporting: 74, testing: 78, curriculum: 80, teacher: 74 }, esa: { active: false } },
  { code: "NY", name: "New York", score: 38, sub: { reporting: 30, testing: 45, curriculum: 40, teacher: 35 }, esa: { active: false } },
  { code: "NC", name: "North Carolina", score: 69, sub: { reporting: 62, testing: 68, curriculum: 76, teacher: 70 }, esa: { active: true, name: "Opportunity Scholarship", maxAward: "$7,200", eligibility: "Universal with income tiers", documentation: ["Enrollment verification"], deadline: "March 1, 2026" } },
  { code: "ND", name: "North Dakota", score: 72, sub: { reporting: 68, testing: 74, curriculum: 76, teacher: 70 }, esa: { active: false } },
  { code: "OH", name: "Ohio", score: 80, sub: { reporting: 82, testing: 80, curriculum: 82, teacher: 76 }, esa: { active: true, name: "EdChoice Scholarship", maxAward: "$6,000", eligibility: "Universal income-scaled", documentation: ["Income verification"], deadline: "April 15, 2026" } },
  { code: "OK", name: "Oklahoma", score: 85, sub: { reporting: 86, testing: 86, curriculum: 86, teacher: 80 }, esa: { active: true, name: "Parental Choice Tax Credit", maxAward: "$7,500", eligibility: "Income-prioritized credit", documentation: ["Tax credit application", "Receipts"], deadline: "February 5, 2026" } },
  { code: "OR", name: "Oregon", score: 67, sub: { reporting: 58, testing: 64, curriculum: 75, teacher: 70 }, esa: { active: false } },
  { code: "PA", name: "Pennsylvania", score: 52, sub: { reporting: 44, testing: 55, curriculum: 58, teacher: 50 }, esa: { active: false } },
  { code: "RI", name: "Rhode Island", score: 62, sub: { reporting: 55, testing: 62, curriculum: 68, teacher: 62 }, esa: { active: false } },
  { code: "SC", name: "South Carolina", score: 70, sub: { reporting: 64, testing: 70, curriculum: 76, teacher: 70 }, esa: { active: true, name: "Education Scholarship Trust Fund", maxAward: "$6,000", eligibility: "Income up to 300% FPL", documentation: ["Income verification", "Receipts"], deadline: "January 31, 2026" } },
  { code: "SD", name: "South Dakota", score: 88, sub: { reporting: 90, testing: 90, curriculum: 88, teacher: 82 }, esa: { active: false } },
  { code: "TN", name: "Tennessee", score: 78, sub: { reporting: 76, testing: 78, curriculum: 82, teacher: 74 }, esa: { active: true, name: "Education Freedom Scholarship", maxAward: "$7,300", eligibility: "Universal in 2025-26", documentation: ["Enrollment verification"], deadline: "May 15, 2026" } },
  { code: "TX", name: "Texas", score: 89, sub: { reporting: 92, testing: 90, curriculum: 90, teacher: 82 }, esa: { active: true, name: "Texas ESA Program", maxAward: "$10,000", eligibility: "Universal, launching 2026-27", documentation: ["Enrollment verification", "Receipts"], deadline: "June 1, 2026" } },
  { code: "UT", name: "Utah", score: 84, sub: { reporting: 84, testing: 85, curriculum: 86, teacher: 80 }, esa: { active: true, name: "Utah Fits All Scholarship", maxAward: "$8,000", eligibility: "Universal K-12 eligibility", documentation: ["Expense ledger", "Annual assessment"], deadline: "February 28, 2026" } },
  { code: "VT", name: "Vermont", score: 76, sub: { reporting: 72, testing: 78, curriculum: 80, teacher: 72 }, esa: { active: false } },
  { code: "VA", name: "Virginia", score: 80, sub: { reporting: 82, testing: 80, curriculum: 82, teacher: 76 }, esa: { active: false } },
  { code: "WA", name: "Washington", score: 65, sub: { reporting: 56, testing: 64, curriculum: 74, teacher: 66 }, esa: { active: false } },
  { code: "WV", name: "West Virginia", score: 83, sub: { reporting: 82, testing: 84, curriculum: 86, teacher: 80 }, esa: { active: true, name: "Hope Scholarship", maxAward: "$5,000", eligibility: "Universal K-12 eligibility", documentation: ["Expense receipts"], deadline: "May 15, 2026" } },
  { code: "WI", name: "Wisconsin", score: 82, sub: { reporting: 84, testing: 82, curriculum: 84, teacher: 78 }, esa: { active: false } },
  { code: "WY", name: "Wyoming", score: 85, sub: { reporting: 86, testing: 86, curriculum: 86, teacher: 80 }, esa: { active: true, name: "Steamboat Legacy Scholarship", maxAward: "$6,000", eligibility: "Income up to 250% FPL", documentation: ["Income verification"], deadline: "April 1, 2026" } },
]

function buildRequirements(code: string, level: RegulationLevel): Requirement[] {
  const base: Requirement[] = [
    {
      name: "File notice of intent to homeschool",
      deadline: level === "No Notice" ? "Not required" : "Within 30 days of withdrawal",
      citation: `${code} Ed Code §48222`,
      formUrl: "#",
      status: level === "No Notice" ? "not-applicable" : "compliant",
    },
    {
      name: "Maintain attendance records",
      deadline: "Ongoing — 180 instructional days",
      citation: `${code} Ed Code §51210`,
      formUrl: "#",
      status: "compliant",
    },
    {
      name: "Standardized testing or portfolio review",
      deadline: level === "High" ? "Annually by July 1" : "Not required",
      citation: `${code} Ed Code §48223`,
      formUrl: "#",
      status: level === "High" ? "pending" : "not-applicable",
    },
    {
      name: "Immunization records on file",
      deadline: "On enrollment",
      citation: `${code} Health Code §120335`,
      formUrl: "#",
      status: "compliant",
    },
  ]
  return base
}

function buildPrecedents(name: string): LegalCase[] {
  return [
    {
      name: `${name} v. State Board of Education`,
      citation: "412 U.S. 218 (2019)",
      date: "2019-06-12",
      impact: "Affirmed parental right to direct education absent compelling state interest.",
    },
    {
      name: `In re ${name} Compulsory Attendance`,
      citation: "88 St. 3d 441 (2021)",
      date: "2021-03-04",
      impact: "Clarified that portfolio review may not require pre-approval of curriculum.",
    },
  ]
}

export const states: StateData[] = rawStates
  .map((s) => {
    const level = levelFromScore(s.score)
    return {
      code: s.code,
      name: s.name,
      score: s.score,
      grade: gradeFromScore(s.score),
      level,
      subscores: s.sub,
      summary: `${s.name} is classified as ${level.toLowerCase()} for homeschool families, with a composite freedom score of ${s.score}/100. ${
        s.esa.active
          ? `An active education savings account program (${s.esa.name}) is available.`
          : "No education savings account program is currently available."
      }`,
      requirements: buildRequirements(s.code, level),
      esa: s.esa,
      precedents: buildPrecedents(s.name),
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

export function getState(code: string): StateData | undefined {
  return states.find((s) => s.code.toLowerCase() === code.toLowerCase())
}

// ── Mock bill data ──────────────────────────────────────────────────────

export const bills: Bill[] = [
  {
    id: "ca-sb-1234",
    stateCode: "CA",
    number: "SB 1234",
    title: "Adds Annual Portfolio Review Requirement",
    date: "2026-05-28",
    statusStep: 2,
    impact: "increase",
    impactSummary: "Adds annual portfolio review requirement",
    delta: "No review required → Annual review by certified teacher",
    actionRequired: "If enacted, families must submit portfolios by July 2027.",
    esaRelated: false,
    fullText:
      "An act to add Section 48223 to the Education Code, relating to private home instruction, requiring an annual portfolio review conducted by a credentialed teacher for each homeschooled pupil.",
    analysis: [
      "Establishes a new mandatory annual portfolio review for all home-instructed students.",
      "Reviews must be conducted by a teacher holding a current California credential.",
      "Creates a July 1 submission deadline beginning in the 2027 instruction year.",
      "Estimated to affect approximately 215,000 home-instructed students statewide.",
    ],
  },
  {
    id: "tx-hb-902",
    stateCode: "TX",
    number: "HB 902",
    title: "Establishes Universal Education Savings Accounts",
    date: "2026-05-21",
    statusStep: 5,
    impact: "decrease",
    impactSummary: "Creates universal ESA, reduces filing burden",
    delta: "No state funding → Up to $10,000 per student ESA",
    actionRequired: "Applications open June 1, 2026. Enrollment verification required.",
    esaRelated: true,
    fullText:
      "An act relating to the establishment of an education savings account program administered by the comptroller for eligible children, including home-instructed students.",
    analysis: [
      "Creates a universal ESA available to all K-12 students including home educators.",
      "Maximum award set at $10,000 per student per year.",
      "Removes prior notarized affidavit requirement for participating families.",
      "Program administered by the state comptroller with quarterly expense reporting.",
    ],
  },
  {
    id: "fl-sb-410",
    stateCode: "FL",
    number: "SB 410",
    title: "Streamlines ESA Quarterly Reporting",
    date: "2026-05-18",
    statusStep: 4,
    impact: "decrease",
    impactSummary: "Simplifies ESA compliance reporting",
    delta: "Quarterly itemized receipts → Annual attestation",
    actionRequired: "Annual attestation replaces quarterly filing starting Q1 2027.",
    esaRelated: true,
    fullText:
      "An act relating to the Family Empowerment Scholarship, revising reporting obligations for participating families from quarterly to annual attestation.",
    analysis: [
      "Replaces quarterly itemized receipt submission with a single annual attestation.",
      "Reduces administrative burden for an estimated 84,000 participating families.",
      "Retains audit authority for the Department of Education.",
    ],
  },
  {
    id: "ny-a-5567",
    stateCode: "NY",
    number: "A 5567",
    title: "Expands Quarterly Reporting and Home Visits",
    date: "2026-05-14",
    statusStep: 1,
    impact: "increase",
    impactSummary: "Adds home visit verification requirement",
    delta: "Quarterly reports → Quarterly reports + annual home visit",
    actionRequired: "If enacted, annual in-home verification begins September 2027.",
    esaRelated: false,
    fullText:
      "An act to amend the education law, in relation to instituting annual in-home verification visits for home-instructed students in addition to existing quarterly reporting.",
    analysis: [
      "Adds a mandatory annual in-home verification visit by district officials.",
      "Maintains existing quarterly reporting and IHIP filing requirements.",
      "Provides no opt-out provision for families with privacy objections.",
    ],
  },
  {
    id: "oh-hb-218",
    stateCode: "OH",
    number: "HB 218",
    title: "Reduces Notification Frequency to Annual",
    date: "2026-05-09",
    statusStep: 3,
    impact: "decrease",
    impactSummary: "Reduces notification burden",
    delta: "Annual notification + assessment → Annual notification only",
    actionRequired: "Assessment requirement removed for the 2026-27 year if signed.",
    esaRelated: false,
    fullText:
      "An act to amend section 3321.04 of the Revised Code to eliminate the annual academic assessment requirement for home-educated students.",
    analysis: [
      "Eliminates the annual standardized assessment or portfolio requirement.",
      "Retains the simple annual notification to the superintendent.",
      "Aligns Ohio with neighboring low-regulation states.",
    ],
  },
  {
    id: "pa-hb-1100",
    stateCode: "PA",
    number: "HB 1100",
    title: "Requires Notarized Affidavit and Medical Records",
    date: "2026-05-02",
    statusStep: 2,
    impact: "increase",
    impactSummary: "Adds notarized affidavit requirement",
    delta: "Affidavit → Notarized affidavit + immunization proof",
    actionRequired: "If enacted, notarized filings required by August 2026.",
    esaRelated: false,
    fullText:
      "An act amending the Public School Code, requiring the supervisory affidavit for home education programs to be notarized and accompanied by medical and immunization records.",
    analysis: [
      "Requires the existing supervisory affidavit to be notarized annually.",
      "Adds mandatory submission of immunization and medical records.",
      "Increases filing friction without changing instructional standards.",
    ],
  },
  {
    id: "az-sb-1077",
    stateCode: "AZ",
    number: "SB 1077",
    title: "Expands ESA Allowable Expenses",
    date: "2026-04-26",
    statusStep: 5,
    impact: "decrease",
    impactSummary: "Broadens ESA spending categories",
    delta: "Limited categories → Adds tutoring and therapy services",
    actionRequired: "Expanded categories available for 2026-27 disbursements.",
    esaRelated: true,
    fullText:
      "An act relating to empowerment scholarship accounts, expanding the list of qualified educational expenses to include specialized tutoring and therapeutic services.",
    analysis: [
      "Adds specialized tutoring and occupational/speech therapy as qualified expenses.",
      "Applies to all ESA participants beginning in the 2026-27 funding cycle.",
      "Maintains existing quarterly expense reporting framework.",
    ],
  },
  {
    id: "co-hb-1303",
    stateCode: "CO",
    number: "HB 1303",
    title: "Clarifies Notice of Intent Filing Window",
    date: "2026-04-19",
    statusStep: 3,
    impact: "neutral",
    impactSummary: "Procedural clarification, no burden change",
    delta: "Ambiguous window → Defined 14-day filing window",
    actionRequired: "No new obligations; clarifies existing deadline.",
    esaRelated: false,
    fullText:
      "An act concerning home-based education, clarifying the timeframe within which a notice of intent must be filed with the local school district.",
    analysis: [
      "Defines a clear 14-day window for filing the notice of intent.",
      "Does not add or remove any substantive requirement.",
      "Reduces ambiguity that previously led to inconsistent district enforcement.",
    ],
  },
  {
    id: "ga-sb-233",
    stateCode: "GA",
    number: "SB 233",
    title: "Adds Income Verification to Promise Scholarship",
    date: "2026-04-11",
    statusStep: 4,
    impact: "increase",
    impactSummary: "Adds ESA eligibility documentation",
    delta: "Self-attestation → Annual income verification required",
    actionRequired: "Income documentation due by March 15, 2026 for renewals.",
    esaRelated: true,
    fullText:
      "An act to amend the Georgia Promise Scholarship Act, requiring annual income verification for continued program eligibility.",
    analysis: [
      "Replaces income self-attestation with documented annual verification.",
      "Applies to all renewing Promise Scholarship families.",
      "Adds a March 15 documentation deadline for renewals.",
    ],
  },
  {
    id: "ut-hb-455",
    stateCode: "UT",
    number: "HB 455",
    title: "Removes Annual Assessment for Fits All Scholarship",
    date: "2026-04-03",
    statusStep: 5,
    impact: "decrease",
    impactSummary: "Removes ESA assessment requirement",
    delta: "Annual assessment required → Optional assessment",
    actionRequired: "Assessment now optional for 2026-27 participants.",
    esaRelated: true,
    fullText:
      "An act relating to the Utah Fits All Scholarship, making the annual academic assessment optional rather than mandatory.",
    analysis: [
      "Converts the mandatory annual assessment into an optional choice.",
      "Maintains expense ledger reporting for all participants.",
      "Reduces compliance overhead for roughly 10,000 scholarship families.",
    ],
  },
  {
    id: "nc-hb-87",
    stateCode: "NC",
    number: "HB 87",
    title: "Standardizes Testing Recordkeeping",
    date: "2026-03-27",
    statusStep: 2,
    impact: "neutral",
    impactSummary: "Recordkeeping format change",
    delta: "Any nationally normed test → Approved test list",
    actionRequired: "Choose from the approved test list beginning 2026-27.",
    esaRelated: false,
    fullText:
      "An act to standardize the nationally standardized testing recordkeeping requirement for home schools by establishing an approved list of assessments.",
    analysis: [
      "Establishes an approved list of nationally normed assessments.",
      "Retains the existing requirement to keep test records for one year.",
      "Neither increases nor decreases overall testing burden.",
    ],
  },
  {
    id: "wv-sb-298",
    stateCode: "WV",
    number: "SB 298",
    title: "Expands Hope Scholarship to Part-Time Enrollees",
    date: "2026-03-15",
    statusStep: 4,
    impact: "decrease",
    impactSummary: "Broadens ESA eligibility",
    delta: "Full-time home educators only → Includes part-time enrollees",
    actionRequired: "Part-time families may apply by May 15, 2026.",
    esaRelated: true,
    fullText:
      "An act relating to the Hope Scholarship Program, extending eligibility to students enrolled part-time in public schools.",
    analysis: [
      "Extends Hope Scholarship eligibility to part-time public school enrollees.",
      "Maintains the $5,000 maximum award per student.",
      "Adds an estimated 3,200 newly eligible families.",
    ],
  },
]

export function getBill(id: string): Bill | undefined {
  return bills.find((b) => b.id === id)
}

export function billsForState(code: string): Bill[] {
  return bills.filter((b) => b.stateCode.toLowerCase() === code.toLowerCase())
}

export const IMPACT_META: Record<
  Impact,
  { label: string; color: string; badgeBg: string }
> = {
  increase: { label: "Increases Regulation", color: "var(--reg-up)", badgeBg: "var(--amber)" },
  decrease: { label: "Decreases Regulation", color: "var(--safe)", badgeBg: "var(--safe)" },
  neutral: { label: "Monitoring", color: "var(--reg-neutral)", badgeBg: "var(--reg-neutral)" },
}

export const TRUST_SIGNALS = [
  { label: "50 States Monitored", icon: "Map" },
  { label: "Real-Time Legislative Alerts", icon: "Bell" },
  { label: "HSLDA-Aligned Categorization", icon: "CheckCircle" },
  { label: "30,000+ Bills Analyzed", icon: "FileText" },
  { label: "ESA Compliance Tracking", icon: "DollarSign" },
] as const
