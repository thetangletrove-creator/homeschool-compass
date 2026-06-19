/**
 * Standalone mock-data provider for Homeschool Compass.
 *
 * Extracted from lib/data.ts so the data layer can switch between mock and live
 * without touching the mock data definitions. Returns a DbQueries implementation
 * that wraps the original synchronous arrays in Promise-based accessors.
 */

import type { DbQueries, EsaProgram, Grade, Requirement, Subscores, RegulationLevel } from "./types"
import type { Bill, StateData } from "./types"

// Real esa_programs from B4 enrichment — 19 ESA states with portal URLs, platforms, deadlines
const REAL_ESA_PROGRAMS: Record<string, any[]> = {
  "AL": [{"application_url": "https://chooseact.alabama.gov/", "compliance_burden": "medium", "deadline": "2026-27 portal closed March 31, 2026", "deadlines": [{"description": "CHOOSE Act Alabama — active; 2026-27 application window closed", "due": "2026-27 portal closed March 31, 2026", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K5-12 Alabama residents; universal by 2027-28, income/priority phase-in earlier", "forms": [], "max_award": "$7,000 participating-school student; $2,000 home education student, capped at $4,000 per family", "name": "CHOOSE Act Alabama", "notes": "State tax-credit ESA administered by ALDOR. Private school and home education have different award levels.", "platform": "ClassWallet", "portal_url": "https://chooseact.alabama.gov/", "status": "active; 2026-27 application window closed"}],
  "AR": [{"application_url": "https://dese.ade.arkansas.gov/Offices/office-of-school-choice-and-parent-empowerment/education-freedom-accounts/information-for-families", "compliance_burden": "medium", "deadline": "2026-27 application/renewal period: March 9-June 1, 2026", "deadlines": [{"description": "Arkansas Education Freedom Account — active; universal phase-in reached", "due": "2026-27 application/renewal period: March 9-June 1, 2026", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 Arkansas students meeting program criteria; by 2025-26 broadly/universally eligible", "forms": [], "max_award": "Up to 90% of prior-year state foundation funding; about $6,800-$7,000 range depending year", "name": "Arkansas Education Freedom Account", "notes": "Families apply/renew annually for each student. Reimbursements submitted through ClassWallet.", "platform": "ClassWallet", "portal_url": "https://dese.ade.arkansas.gov/offices/office-of-school-choice-and-parent-empowerment/education-freedom-accounts", "status": "active; universal phase-in reached"}],
  "AZ": [{"application_url": "https://www.azed.gov/esa/eligibility-requirements", "compliance_burden": "medium", "deadline": "Rolling / applications accepted for 2026-2027; ADE says processing within 30 days", "deadlines": [{"description": "Arizona Empowerment Scholarship Account — active; rolling applications", "due": "Rolling / applications accepted for 2026-2027; ADE says processing within 30 days", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 universal eligibility", "forms": [], "max_award": "Varies by student/grade/weights; funded quarterly; approximate amount chart maintained by ADE", "name": "Arizona Empowerment Scholarship Account", "notes": "ClassWallet is the financial management platform. ESA can support education at home but families sign ESA contract and spending rules apply.", "platform": "ClassWallet", "portal_url": "https://www.azed.gov/esa", "status": "active; rolling applications"}],
  "FL": [{"application_url": "https://www.stepupforstudents.org/scholarships/personalized-education-program/", "compliance_burden": "medium", "deadline": "Open until program caps/funding limits; PEP 2026-27 cap noted at 140,000 students", "deadlines": [{"description": "Family Empowerment Scholarship / Personalized Education Program — active; multiple scholarship branches", "due": "Open until program caps/funding limits; PEP 2026-27 cap noted at 140,000 students", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Florida residents eligible for K-12 public school; FES-UA includes eligible students with unique abilities, including some pre-K ages", "forms": [], "max_award": "Average private school scholarship about $8,000; PEP/FES-UA values vary by grade, county and disability matrix", "name": "Family Empowerment Scholarship / Personalized Education Program", "notes": "Florida has multiple K-12 scholarship paths. PEP is the ESA-style option for students not enrolled full-time in public/private school; FES-UA is ESA-style for students with qualifying disabilities.", "platform": "Step Up For Students EMA / MyScholarShop; AAA Scholarship systems", "portal_url": "https://www.stepupforstudents.org/scholarships/", "status": "active; multiple scholarship branches"}],
  "GA": [{"application_url": "https://mygeorgiapromise.org/", "compliance_burden": "medium", "deadline": "2026-27 remaining windows: August 1-31 and November 1-30", "deadlines": [{"description": "Georgia Promise Scholarship — active; launched 2025", "due": "2026-27 remaining windows: August 1-31 and November 1-30", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 students meeting low-performing attendance-zone and other statutory criteria; includes private school and home study use cases", "forms": [], "max_award": "Up to $6,500 per eligible student, paid quarterly", "name": "Georgia Promise Scholarship", "notes": "Eligibility is not universal; student must be zoned for an eligible/low-performing public school and meet program rules.", "platform": "Odyssey", "portal_url": "https://mygeorgiapromise.org/", "status": "active; launched 2025"}],
  "IA": [{"application_url": "https://educate.iowa.gov/pk-12/educational-choice/education-savings-accounts", "compliance_burden": "medium", "deadline": "2026-27 application period April 16-June 30, 2026", "deadlines": [{"description": "Students First Education Savings Account — active; universal K-12 for accredited nonpublic enrollment", "due": "2026-27 application period April 16-June 30, 2026", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 Iowa resident students attending accredited nonpublic schools", "forms": [], "max_award": "Anticipated $8,148 per eligible student for 2026-27", "name": "Students First Education Savings Account", "notes": "Not a pure independent homeschool reimbursement program; funds are tied to accredited nonpublic school enrollment and qualified expenses.", "platform": "Odyssey", "portal_url": "https://educate.iowa.gov/pk-12/educational-choice/education-savings-accounts", "status": "active; universal K-12 for accredited nonpublic enrollment"}],
  "IN": [{"application_url": "https://www.in.gov/tos/inesa/", "compliance_burden": "medium", "deadline": "Program cycle opens annually; verify current priority window on INESA portal", "deadlines": [{"description": "Indiana Education Scholarship Account — active; targeted special-needs/siblings", "due": "Program cycle opens annually; verify current priority window on INESA portal", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 students with disabilities and, since 2024, eligible siblings; income cap applies", "forms": [], "max_award": "Varies; up to $20,000 for students with disabilities and up to $8,000 for eligible siblings", "name": "Indiana Education Scholarship Account", "notes": "Cannot combine with Indiana Choice Scholarship voucher; ClassWallet partnership expanded for ESA management.", "platform": "ClassWallet", "portal_url": "https://www.in.gov/tos/inesa/", "status": "active; targeted special-needs/siblings"}],
  "LA": [{"application_url": "https://doe.louisiana.gov/topic-pages/louisiana-school-choice/la-gator", "compliance_burden": "medium", "deadline": "2026-27 application window opened March 1 and closed March 16, 2026", "deadlines": [{"description": "LA GATOR Scholarship Program — active/implementation; 2026-27 awards depend on appropriation", "due": "2026-27 application window opened March 1 and closed March 16, 2026", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 Louisiana students; universal phased/priority rules apply", "forms": [], "max_award": "2025-26 tiers cited by Odyssey: $5,243 / $7,626 / up to $15,253 depending income/disability; 2026-27 appropriation pending at search time", "name": "LA GATOR Scholarship Program", "notes": "State noted April-June 2026 legislature would decide 2026-27 funding; award notifications estimated June/July 2026 via Odyssey.", "platform": "Odyssey", "portal_url": "https://doe.louisiana.gov/topic-pages/louisiana-school-choice/la-gator", "status": "active/implementation; 2026-27 awards depend on appropriation"}],
  "MO": [{"application_url": "https://treasurer.mo.gov/MOScholars/ParentsStudents", "compliance_burden": "medium", "deadline": "2026-27 first application deadline reported April 3, 2026; summer window also reported", "deadlines": [{"description": "MOScholars — active tax-credit ESA; not state-funded universal ESA", "due": "2026-27 first application deadline reported April 3, 2026; summer window also reported", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 eligible Missouri students under program priority/eligibility rules", "forms": [], "max_award": "Awards may reach up to 175% of state adequacy target depending need and EAO funding", "name": "MOScholars", "notes": "Tax-credit ESA funded through donations to EAOs, not the same operating model as direct state ESA wallets.", "platform": "Odyssey", "portal_url": "https://treasurer.mo.gov/MOScholars/ParentsStudents", "status": "active tax-credit ESA; not state-funded universal ESA"}],
  "MS": [{"application_url": "https://mdek12.org/specialeducation/esa/", "compliance_burden": "medium", "deadline": "Verify annual MDE application window", "deadlines": [{"description": "Education Scholarship Account — Special Education — active; targeted special-needs ESA", "due": "Verify annual MDE application window", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Students with special needs meeting ESA criteria", "forms": [], "max_award": "Varies annually; 2024-25 maximum reimbursement source cited $7,829", "name": "Education Scholarship Account — Special Education", "notes": "Special-needs-only ESA; 2024 PEER review found 90% of funds disbursed in FY2023-FY2024.", "platform": "Mississippi Special Needs Scholarship portal", "portal_url": "https://mdek12.org/specialeducation/esa/", "status": "active; targeted special-needs ESA"}],
  "MT": [{"application_url": "https://opi.mt.gov/Families-Students/Parent-Resources/Education-Savings-Account", "compliance_burden": "medium", "deadline": "Blocked/uncertain; verify current court status and OPI notice", "deadlines": [{"description": "Special Needs Equal Opportunity Education Savings Account — established but litigation-blocked as of Dec 2025 reporting; verify before productizing", "due": "Blocked/uncertain; verify current court status and OPI notice", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Students with disabilities under IDEA meeting additional criteria", "forms": [], "max_award": "95% of eligible calculated amount deposited for allowable education resources under statute; exact award varies", "name": "Special Needs Equal Opportunity Education Savings Account", "notes": "Watchlist: Montana Free Press reported a district judge blocked HB393 program in December 2025.", "platform": "OPI reimbursement process", "portal_url": "https://opi.mt.gov/Families-Students/Parent-Resources/Education-Savings-Account", "status": "established but litigation-blocked as of Dec 2025 reporting; verify before productizing"}],
  "NC": [{"application_url": "https://k12.ncseaa.edu/the-education-student-accounts/how-to-apply/", "compliance_burden": "medium", "deadline": "Annual application cycle; 2025-26 opened February 1, 2026 per NCSEAA page", "deadlines": [{"description": "Education Student Accounts / ESA+ — active; targeted ESA+ special-needs", "due": "Annual application cycle; 2025-26 opened February 1, 2026 per NCSEAA page", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Students with qualifying disabilities; private school, home school and co-enrollment options", "forms": [], "max_award": "Base $9,000 annual award; $17,000 for certain designated disabilities", "name": "Education Student Accounts / ESA+", "notes": "Prompt's NC Opportunity Scholarship is a voucher, but NC's ESA-style program is ESA+ for children with disabilities.", "platform": "NCSEAA portal / ESA+ DirectPay/provider payment processes", "portal_url": "https://k12.ncseaa.edu/the-education-student-accounts/", "status": "active; targeted ESA+ special-needs"}],
  "NH": [{"application_url": "https://nh.scholarshipfund.org/apply/nh-education-freedom-accounts/", "compliance_burden": "medium", "deadline": "Applications for 2026-27 open; submit one application per family", "deadlines": [{"description": "New Hampshire Education Freedom Accounts — active; applications open for 2026-27", "due": "Applications for 2026-27 open; submit one application per family", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "NH resident students ages 5-20 entering K-12; universal with priority/cap rules", "forms": [], "max_award": "Average account value reported around $4,795 for 2025-26; amount varies", "name": "New Hampshire Education Freedom Accounts", "notes": "Priority access for current EFA recipients, siblings, special-needs students, and families at/below 350% FPL; others may waitlist if demand exceeds cap.", "platform": "ScholaVia application system / CSF NH", "portal_url": "https://nh.scholarshipfund.org/apply/nh-education-freedom-accounts/", "status": "active; applications open for 2026-27"}],
  "SC": [{"application_url": "https://sc-estf-program.com/en", "compliance_burden": "medium", "deadline": "2026-27 application closed; statutory limit of 15,000 students reached", "deadlines": [{"description": "Education Scholarship Trust Fund — active; 2026-27 statutory cap reached", "due": "2026-27 application closed; statutory limit of 15,000 students reached", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Qualifying K-12 South Carolina families; income-based eligibility/caps", "forms": [], "max_award": "$7,634 for 2026-27", "name": "Education Scholarship Trust Fund", "notes": "ClassWallet digital wallet; watch caps/waitlist.", "platform": "ClassWallet", "portal_url": "https://sc-estf-program.com/en", "status": "active; 2026-27 statutory cap reached"}],
  "TN": [{"application_url": "https://app.efs.tnedu.gov/", "compliance_burden": "medium", "deadline": "EFS 2026-27 application closed February 6, 2026; ESA school/provider reopening May 29-June 12, 2026 noted for schools/providers", "deadlines": [{"description": "Education Freedom Scholarship / Education Savings Account Program — active; EFS statewide plus ESA pilot/IEA programs", "due": "EFS 2026-27 application closed February 6, 2026; ESA school/provider reopening May 29-June 12, 2026 noted for schools/providers", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 Tennessee students under EFS; ESA pilot specific zones include Memphis-Shelby, Metro Nashville, Hamilton; IEA special education program exists separately", "forms": [], "max_award": "EFS 2025-26 amount cited $7,295; ESA pilot 2026-27 estimate $10,148.88 in ESA zones; final amounts may change", "name": "Education Freedom Scholarship / Education Savings Account Program", "notes": "Do not collapse Tennessee into one program. NCSL lists EFS, ESA Pilot, and IEA. The prompt's '3 counties expanding' maps to ESA pilot zones, while EFS is broader/newer.", "platform": "Theodore / Student First Technologies portal", "portal_url": "https://www.tn.gov/education/efs.html", "status": "active; EFS statewide plus ESA pilot/IEA programs"}],
  "TX": [{"application_url": "https://educationfreedom.texas.gov/", "compliance_burden": "medium", "deadline": "Parent application window ran February 4-March 31, 2026", "deadlines": [{"description": "Texas Education Freedom Accounts — active/launching 2026-27; high demand/waitlist", "due": "Parent application window ran February 4-March 31, 2026", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Texas children outside public system including private school or homeschool; priority tiers by disability/income", "forms": [], "max_award": "2026-27: $10,474 private school; up to $30,000 IEP private school; $2,000 homeschool/other", "name": "Texas Education Freedom Accounts", "notes": "Official FAQ lists common ineligibility/rejection reasons: pre-K criteria, income verification, citizenship/lawful presence, Texas residency. Massive application volume and waitlist should be assumed.", "platform": "Odyssey", "portal_url": "https://educationfreedom.texas.gov/", "status": "active/launching 2026-27; high demand/waitlist"}],
  "UT": [{"application_url": "https://www.utaheducationfitsall.org/", "compliance_burden": "medium", "deadline": "2026-27 applications closed", "deadlines": [{"description": "Utah Fits All Scholarship — active; 2026-27 applications closed", "due": "2026-27 applications closed", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "All Utah resident K-12 students; funding cap/waitlist", "forms": [], "max_award": "Private school $8,000; home-based ages 5-11 $4,000; home-based ages 12-18 $6,000", "name": "Utah Fits All Scholarship", "notes": "Amounts differ for home-based vs private-school students starting 2025-26. Odyssey appears in current support/marketplace materials.", "platform": "Odyssey", "portal_url": "https://www.utaheducationfitsall.org/", "status": "active; 2026-27 applications closed"}],
  "WV": [{"application_url": "https://app.hopescholarshipwv.com/", "compliance_burden": "medium", "deadline": "Full-funding deadline for new 2026-27 students: June 15, 2026", "deadlines": [{"description": "Hope Scholarship — active; universal eligibility beginning 2026-27", "due": "Full-funding deadline for new 2026-27 students: June 15, 2026", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "K-12 West Virginia students; universal eligibility starts 2026-27", "forms": [], "max_award": "Expected $5,435.62 for 2026-27 reported by West Virginia Watch; program amount tied to state funding formula", "name": "Hope Scholarship", "notes": "Litigation history exists, but program is operating. Academic reporting and accepted tests are a recurring parent confusion point.", "platform": "Student First Technologies Theodore portal", "portal_url": "https://hopescholarshipwv.gov/", "status": "active; universal eligibility beginning 2026-27"}],
  "WY": [{"application_url": "https://edu.wyoming.gov/parents/education-savings-accounts/", "compliance_burden": "medium", "deadline": "2026-27 timelines being finalized in May 2026 WDE update; verify current portal", "deadlines": [{"description": "Steamboat Legacy Scholarship / Wyoming Education Savings Account — active; Steamboat Legacy expansion moving forward for 2026-27", "due": "2026-27 timelines being finalized in May 2026 WDE update; verify current portal", "type": "application_window"}], "documents_required": ["Verify program requirements — see portal for details"], "eligibility": "Universal eligibility beginning 2025-26/2026-27 implementation; pre-K eligibility has income limits under expansion notes", "forms": [], "max_award": "$7,000 annually per eligible student", "name": "Steamboat Legacy Scholarship / Wyoming Education Savings Account", "notes": "Renamed/expanded by Steamboat Legacy Scholarship Act. WDE GovDelivery noted 2026-27 program moving forward, but application timeline still being finalized.", "platform": "Odyssey", "portal_url": "https://edu.wyoming.gov/parents/education-savings-accounts/", "status": "active; Steamboat Legacy expansion moving forward for 2026-27"}],
}

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

function buildRequirements(code: string, level: RegulationLevel): Requirement[] {
  return [
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
}

function buildPrecedents(name: string) {
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

/** Small set of mock non-ESA programs for UI-testing states w/o ESA. */
import type { NonEsaProgram } from "./db/schema"

const MOCK_NON_ESA: Record<string, NonEsaProgram[]> = {
  AK: [
    {
        "name": "Correspondence School Allotment Program (CSAP)",
        "program_type": "allotment",
        "amount": "$1,500-$4,500 per student (varies by district/program)",
        "income_cap": "None",
        "homeschool_eligible": true,
        "url": "https://education.alaska.gov/correspondence",
        "application_url": null,
        "short_description": "Public school correspondence programs that fund homeschool curriculum, materials, and services. Students are technically public school enrollees learning at home.",
        "application_method": "enroll_in_correspondence_program",
        "application_window": "annual_enrollment",
        "stacks_with": "Alaska Permanent Fund Dividend; Coverdell ESA (federal)",
        "notes": "NOT true independent homeschooling. Must work with certified teacher, create learning plan, meet state standards. Allotment varies dramatically by program: IDEA=$2,700; Family Partnership=$3,953-$4,500; Frontier=$3,082; Denali PEAK=$3,200. FY24 total allotment spending: $47.2M across ~23,000 students. Private school tuition use is restricted and under litigation.",
        "status": "active"
    }
  ],
  AZ: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.azleg.gov/",
        "application_url": null,
        "short_description": "Arizona has existing ESA (covered separately). EFTC opt-in bills vetoed by Governor Hobbs (D).",
        "application_method": "apply_through_SGO",
        "application_window": "uncurrent",
        "stacks_with": "Arizona ESA (ClassWallet)",
        "notes": "Arizona already has robust ESA program via ClassWallet. EFTC bills (SB 1106, SB 1142, HB 4152) were all vetoed by Governor Hobbs. AZ homeschoolers already have better options through state ESA.",
        "status": "blocked"
    }
  ],
  CO: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.commonsenseinstituteus.org/colorado/research/education/the-economic-impact-from-colorados-choice-to-participate-in-the-education-freedom-tax-credit-provision-in-the-one-big-beautiful-bill-act",
        "application_url": null,
        "short_description": "Colorado opted into federal EFTC Jan 29, 2026. Scholarships for K-12 expenses including homeschool costs.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "None",
        "notes": "Colorado has no state-level ESA or voucher. EFTC is the first meaningful school choice funding for CO. Governor Polis (D) announced opt-in. Potential impact: $164M-$493M in first year depending on participation rate (5-15%). SGOs must be established and approved. Homeschoolers ARE eligible under federal EFTC rules.",
        "status": "active"
    }
  ],
  DC: [
    {
        "name": "DC Opportunity Scholarship Program",
        "program_type": "voucher",
        "amount": "$10,713-$16,070 (K-8 vs 9-12), CPI-adjusted annually",
        "income_cap": "185% FPL initial entry; up to 300% FPL for renewal",
        "homeschool_eligible": false,
        "url": "https://sboe.dc.gov/page/opportunity-scholarship-program",
        "application_url": null,
        "short_description": "Federal voucher program for low-income DC families to attend private schools. Congressionally appropriated, not state-funded.",
        "application_method": "online_application_through_dcpcsb",
        "application_window": "annual_priority_period",
        "stacks_with": "None (exclusive to private school enrollment)",
        "notes": "NOT available to homeschoolers. Only ~1,300-1,500 students served out of 115,000+ eligible. Returning students get priority; 900+ applicants turned away annually due to $17.5M funding cap. Funds must be used at participating private school IN DC. Cannot be used for a la carte or partial enrollment.",
        "status": "active"
    }
  ],
  DE: [
    {
        "name": "Proposed ESA ($4,000 per student)",
        "program_type": "pending",
        "amount": "$4,000 per student (proposed)",
        "income_cap": "TBD",
        "homeschool_eligible": true,
        "url": "https://legis.delaware.gov/",
        "application_url": null,
        "short_description": "ESA bill introduced but not passed as of June 2026. No active program.",
        "application_method": "N/A",
        "application_window": "N/A",
        "stacks_with": "None",
        "notes": "Delaware ESA bill was introduced but has not become law. No current program available to homeschool families. Monitor legislative session for updates.",
        "status": "proposed"
    }
  ],
  ID: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.idaho.gov/",
        "application_url": null,
        "short_description": "Idaho opted into federal EFTC. HB 731 (2026) requires annual opt-in and SGO approval by Dept of Education.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "None",
        "notes": "Idaho has no state ESA/voucher program. EFTC is the only path. HB 731 enacted March 2026 requires state to opt in annually and DOE to approve SGOs by Jan 1 each year. Applications reviewed on rolling basis. No existing SGO infrastructure — new organizations must form. Homeschoolers eligible.",
        "status": "active"
    }
  ],
  IL: [
    {
        "name": "Invest in Kids Act",
        "program_type": "scholarship",
        "amount": "Varies by SGO; partial private school tuition scholarships",
        "income_cap": "300% FPL",
        "homeschool_eligible": false,
        "url": "https://www.isbe.net/Pages/Invest-in-Kids.aspx",
        "application_url": null,
        "short_description": "Tax-credit scholarship program. Was scheduled to sunset Jan 1, 2025. HB1342/HB2649 introduced to reenact and make permanent.",
        "application_method": "apply_through_approved_SGO",
        "application_window": "varies_by_SGO",
        "stacks_with": "None",
        "notes": "⚠️ STATUS: Sunsetted Jan 1, 2025. HB1342 introduced to reenact and make permanent. HB4194 (Democrat alternative) would lower cap to $50M. As of June 2026, status unclear — bills pending but not confirmed law. If revived, NOT available to homeschoolers (private school only).",
        "status": "expired"
    }
  ],
  KS: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.kansas.gov/",
        "application_url": null,
        "short_description": "Kansas opted into federal EFTC via SB 361 veto override (April 2026). No state ESA program.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "None",
        "notes": "Kansas has no state ESA/voucher. Governor Kelly (D) vetoed opt-in bill; legislature overrode. SB 361 requires annual participation. No existing SGO infrastructure of note. Homeschoolers eligible under federal rules.",
        "status": "blocked"
    }
  ],
  KY: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://whiteboardadvisors.com/kentucky-just-opted-into-education-freedom-tax-credits-without-its-governor/",
        "application_url": null,
        "short_description": "Kentucky opted into federal EFTC via HB 1 veto override (March 2026). Replaces struck-down EOA.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "None",
        "notes": "Kentucky's EOA (Education Opportunity Account) was struck down by KY Supreme Court. EFTC is the replacement path. HB 1 shifted opt-in authority to Secretary of State (litigation risk on this maneuver). Governor Beshear (D) vetoed; Republican supermajority overrode. No existing SGO infrastructure. Homeschoolers eligible.",
        "status": "blocked"
    }
  ],
  MD: [
    {
        "name": "BOOST Scholarship Program",
        "program_type": "voucher",
        "amount": "$2,000-$4,000+ depending on income and school costs",
        "income_cap": "100% FRL (free/reduced lunch) eligibility",
        "homeschool_eligible": false,
        "url": "https://www.marylandpublicschools.org/programs/Pages/BOOST/index.aspx",
        "application_url": null,
        "short_description": "Private school scholarship for low-income families. Limited funding, competitive.",
        "application_method": "online_application_through_MSDE",
        "application_window": "annual",
        "stacks_with": "None",
        "notes": "NOT available to homeschoolers. Student must be enrolled at participating nonpublic school. Only ~2,400-3,000 students served due to $9M budget cap. Priority to prior-year recipients. Must upload 1040 tax return. Check sent to school, parent must sign. Pre-K NOT eligible.",
        "status": "active"
    }
  ],
  ME: [
    {
        "name": "Town Tuitioning Program",
        "program_type": "tuitioning",
        "amount": "Varies by town; up to ~$10,500 (K-8), higher for high school",
        "income_cap": "None",
        "homeschool_eligible": false,
        "url": "https://www.maine.gov/doe/funding/town-tuitioning",
        "application_url": null,
        "short_description": "Towns without public schools pay tuition for students to attend public or approved private schools elsewhere.",
        "application_method": "contact_town_school_department",
        "application_window": "varies_by_town",
        "stacks_with": "None",
        "notes": "NOT available to homeschoolers in practice. Town tuitioning is for students in towns that don't operate schools. Homeschoolers generally don't qualify because they're not enrolled in the town's school system. Process is town-by-town. Some towns send all students to one school; others let parents choose. No statewide portal.",
        "status": "active"
    }
  ],
  MN: [
    {
        "name": "K-12 Education Subtraction",
        "program_type": "deduction",
        "amount": "$1,625 per child (K-6); $2,500 per child (7-12)",
        "income_cap": "None",
        "homeschool_eligible": true,
        "url": "https://www.revenue.state.mn.us/k-12-education-expenses",
        "application_url": null,
        "short_description": "State income tax subtraction for K-12 education expenses including homeschool costs. Reduces taxable income, not a direct payment.",
        "application_method": "state_tax_form_M1",
        "application_window": "annual_during_filing",
        "stacks_with": "K-12 Education Credit (same expenses cannot be used for both)",
        "notes": "CANNOT use same expenses for both subtraction AND credit. Must choose which to apply to each expense. Homeschoolers eligible if they meet compulsory attendance reporting requirements. Qualifying expenses: tutoring by qualified instructor, textbooks, instructional materials, computer hardware/software (up to $200), transportation. Private school tuition qualifies ONLY for subtraction, NOT credit.",
        "status": "active"
    },
    {
        "name": "K-12 Education Credit",
        "program_type": "refundable_tax_credit",
        "amount": "75% of qualifying expenses, up to $1,000 per child (family limit for 2+ children)",
        "income_cap": "Phase-out begins at $77,550 AGI (2026); fully phased out at $83,550 for 1-2 children; extends $3,000 per additional child",
        "homeschool_eligible": true,
        "url": "https://www.revenue.state.mn.us/k-12-education-tax-credit",
        "application_url": null,
        "short_description": "Refundable tax credit covering 75% of homeschool/private school education expenses. Pays out even if tax liability is zero.",
        "application_method": "Schedule_M1ED_with_Form_M1",
        "application_window": "annual_during_filing",
        "stacks_with": "K-12 Education Subtraction (different expenses)",
        "notes": "CRITICAL: Same expenses CANNOT be used for both credit and subtraction. Best strategy: Use expenses for credit first (up to income limits), then remaining expenses for subtraction. Private school tuition does NOT qualify for credit. Homeschoolers must file annual report with district. Computer expenses capped at $200 for credit. Average credit claimed: $249-$386. ~46,000 students participated in 2024.",
        "status": "active"
    }
  ],
  NC: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.ncleg.gov/",
        "application_url": null,
        "short_description": "NC legislature overrode Governor Stein's (D) veto of HB 87 to opt into EFTC (June 2026).",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "NC ESA+ / Opportunity Scholarship (state programs)",
        "notes": "NC already has ESA+ and Opportunity Scholarship (state programs). HB 87 veto override June 3, 2026 adds federal EFTC layer. Homeschoolers eligible for EFTC scholarships in addition to existing state programs.",
        "status": "active"
    }
  ],
  ND: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.nd.gov/",
        "application_url": null,
        "short_description": "North Dakota opted into federal EFTC Jan 26, 2026. No state ESA or voucher program.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "None",
        "notes": "ND has no state-level school choice program. EFTC is the first. Governor Armstrong (R) announced opt-in. No existing SGO infrastructure. Homeschoolers eligible.",
        "status": "active"
    }
  ],
  NE: [
    {
        "name": "Opportunity Scholarships Act (LB 1402)",
        "program_type": "scholarship",
        "amount": "Up to ~$5,000 per student (state-funded scholarships)",
        "income_cap": "Priority tiers: 185% FPL, 213% FPL, 300% FPL",
        "homeschool_eligible": false,
        "url": "https://www.education.ne.gov/choice/opportunity-scholarship/",
        "application_url": null,
        "short_description": "State-funded private school scholarship program. Replaced prior tax-credit scholarship model with direct state appropriation.",
        "application_method": "apply_through_participating_private_school",
        "application_window": "annual_priority_period",
        "stacks_with": "None",
        "notes": "⚠️ STATUS UNCLEAR. LB 1402 repealed prior Opportunity Scholarship Act and replaced with $10M/year state-funded program. However, legal challenges and potential referendum may affect operation. Program is for PRIVATE SCHOOL TUITION ONLY — homeschoolers NOT eligible. Students must be transferring from public school or entering K/1/9. Also: Nebraska opted into federal EFTC; OSN (Opportunity Scholarships of Nebraska) is the SGO for federal EFTC scholarships starting Fall 2027.",
        "status": "pending_launch"
    },
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.nebraskaopportunity.org/",
        "application_url": null,
        "short_description": "Federal tax-credit scholarship program. Nebraska opted in. SGOs will distribute scholarships starting 2027.",
        "application_method": "apply_through_SGO",
        "application_window": "anticipated_Fall_2027",
        "stacks_with": "None",
        "notes": "Nebraska is an EFTC opt-in state. OSN (Opportunity Scholarships of Nebraska) is the primary SGO. Scholarships expected to be available Fall 2027. Eligible students: any K-12 student eligible for public school, household income <= 300% area median income. Homeschoolers ARE eligible for EFTC scholarships (unlike state LB 1402 program). Donors cannot designate specific beneficiary.",
        "status": "active"
    }
  ],
  NV: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.nv.gov/",
        "application_url": null,
        "short_description": "Nevada opted into federal EFTC. Previously had Opportunity Scholarship (tax-credit) program that was defunded.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward",
        "stacks_with": "None",
        "notes": "Nevada's prior Opportunity Scholarship program (tax-credit) was effectively defunded. EFTC is the new path. Governor Lombardo (R) opted in. No existing robust SGO infrastructure. Homeschoolers eligible.",
        "status": "expired"
    }
  ],
  NY: [
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.ny.gov/",
        "application_url": null,
        "short_description": "New York Governor Hochul announced intent to opt into federal EFTC May 2026. Waiting for Treasury regulations before formalizing.",
        "application_method": "apply_through_SGO",
        "application_window": "January_2027_onward (pending formal opt-in)",
        "stacks_with": "None",
        "notes": "NY has no state ESA/voucher. Hochul (D) announced intent May 7, 2026 but waiting for Treasury guidance before formal opt-in. No existing SGO infrastructure. If NY opts in, would be one of the largest markets. Homeschoolers eligible under federal rules.",
        "status": "active"
    }
  ],
  OH: [
    {
        "name": "EdChoice Expansion Scholarship",
        "program_type": "voucher",
        "amount": "$6,166 (K-8); $8,408 (9-12) base; sliding scale by income",
        "income_cap": "450% FPL for max award; prorated above; min $650",
        "homeschool_eligible": false,
        "url": "https://education.ohio.gov/Topics/Ohio-Education-Options/Scholarships",
        "application_url": null,
        "short_description": "Income-based private school voucher. Universal eligibility but award amount varies by income.",
        "application_method": "apply_through_participating_private_school",
        "application_window": "February_1_-_June_30",
        "stacks_with": "None",
        "notes": "NOT available to homeschoolers. Student must be enrolled full-time at participating private school. Income verification via online system. Application submitted BY the school on family's behalf. Year-round window but priority Feb 1-May 1.",
        "status": "active"
    },
    {
        "name": "Jon Peterson Special Needs Scholarship",
        "program_type": "voucher",
        "amount": "$9,585-$32,445 depending on disability category",
        "income_cap": "None",
        "homeschool_eligible": true,
        "url": "https://education.ohio.gov/Topics/Other-Resources/Scholarships/Jon-Peterson-Special-Needs-Scholarship",
        "application_url": null,
        "short_description": "Special-needs voucher for students with IEP. Can be used for private school tuition OR services (including by homeschool families).",
        "application_method": "register_with_participating_provider",
        "application_window": "annual",
        "stacks_with": "None (exclusive to JPSN program)",
        "notes": "HOMESCHOOLERS ELIGIBLE but with restrictions. Student must have IEP from district of residence. Funds can pay for services. As of July 1, 2025, home-educated students lose eligibility after turning 18. ~8,680 participating.",
        "status": "active"
    }
  ],
  OK: [
    {
        "name": "Parental Choice Tax Credit",
        "program_type": "refundable_tax_credit",
        "amount": "$1,000 per homeschool student; $5,000-$7,500 per private school student",
        "income_cap": "Priority for <$150K AGI; credit amount tiers by income",
        "homeschool_eligible": true,
        "url": "https://oklahoma.gov/tax/individuals/parental-choice-tax-credit.html",
        "application_url": null,
        "short_description": "Refundable tax credit for homeschool and private school expenses. Homeschoolers get flat $1,000 per student.",
        "application_method": "Oklahoma_Tax_Commission_online_application",
        "application_window": "March_16_-_June_15_for_upcoming_year",
        "stacks_with": "Oklahoma Equal Opportunity Education Scholarships (TCS); Lindsey Nicole Henry Scholarships",
        "notes": "HOMESCHOOL CREDIT: $1,000 per student, capped at $5M total annually. Refundable = paid even if no tax liability. Application opens March 16 for following school year. HB 3705 increased total cap to $275M for 2026-27. ~2,376 homeschool households claimed $3.3M in 2024.",
        "status": "active"
    }
  ],
  PA: [
    {
        "name": "Educational Improvement Tax Credit (EITC)",
        "program_type": "scholarship",
        "amount": "Varies by SGO; average ~$2,613; max $8,500 (non-special-ed), $15,000 (special-ed)",
        "income_cap": "$116,055 + $20,428 per dependent (2025-26)",
        "homeschool_eligible": false,
        "url": "https://www.education.pa.gov/Teachers%20-%20Administrations/Opportunity%20Scholarship%20Tax%20Credit/Pages/EITC.aspx",
        "application_url": null,
        "short_description": "Tax-credit scholarship funded by business donations. Scholarships for private K-12 school tuition.",
        "application_method": "apply_through_SGO_or_participating_school",
        "application_window": "varies_by_SGO",
        "stacks_with": "OSTC (if eligible for both)",
        "notes": "NOT available to homeschoolers. Student must attend participating private school. Total program cap ~$590M. ~66,000-101,000 students served. Federal EFTC will also operate in PA starting 2027.",
        "status": "pending_launch"
    },
    {
        "name": "Opportunity Scholarship Tax Credit (OSTC)",
        "program_type": "scholarship",
        "amount": "Varies by SGO; same caps as EITC",
        "income_cap": "$116,055 + $20,428 per dependent (2025-26)",
        "homeschool_eligible": false,
        "url": "https://www.education.pa.gov/Teachers%20-%20Administrations/Opportunity%20Scholarship%20Tax%20Credit/Pages/OSTC.aspx",
        "application_url": null,
        "short_description": "Tax-credit scholarship for students in low-achieving school zones. Same structure as EITC but targeted geographically.",
        "application_method": "apply_through_SGO_or_participating_school",
        "application_window": "varies_by_SGO",
        "stacks_with": "EITC (if eligible for both)",
        "notes": "NOT available to homeschoolers. Student must reside in attendance boundary of bottom-15% public school AND attend participating private school. Total cap $50M. ~101,000 students served across EITC+OSTC.",
        "status": "active"
    }
  ],
  SD: [
    {
        "name": "Partners in Education Tax Credit Program",
        "program_type": "scholarship",
        "amount": "Up to ~$5,000 (100% of state per-pupil share as of SB 84)",
        "income_cap": "200% FRL (raised from 150% by SB 84, 2026)",
        "homeschool_eligible": false,
        "url": "https://sdpartnersinedu.org/",
        "application_url": null,
        "short_description": "State tax-credit scholarship funded by insurance company donations. 100% state premium tax credit.",
        "application_method": "apply_through_SD_Partners_in_Education_SGO",
        "application_window": "annual",
        "stacks_with": "Federal EFTC (starting 2027)",
        "notes": "NOT available to homeschoolers. Insurance companies donate; get 100% state premium tax credit. SB 84 raised income cap to 200% FRL. SD also opted into federal EFTC.",
        "status": "active"
    }
  ],
  VA: [
    {
        "name": "Education Improvement Scholarships Tax Credit (EISTC)",
        "program_type": "scholarship",
        "amount": "Varies by SGO; average ~$2,141; capped at state per-pupil spending",
        "income_cap": "300% FPL (or 400% FPL for special needs)",
        "homeschool_eligible": false,
        "url": "https://www.doe.virginia.gov/parents-students/student-services/virginia-education-improvement-scholarship-tax-credit",
        "application_url": null,
        "short_description": "Tax-credit scholarship for low/middle-income students to attend private K-12. 65% state tax credit to donors.",
        "application_method": "apply_through_approved_SGO",
        "application_window": "varies_by_SGO",
        "stacks_with": "Federal EFTC (starting 2027)",
        "notes": "NOT available to homeschoolers. Student must attend participating private school. 36 approved SGOs. Program cap $25M/year. ~5,820 students (2023-24).",
        "status": "pending_launch"
    }
  ],
  VT: [
    {
        "name": "Town Tuitioning Program",
        "program_type": "tuitioning",
        "amount": "Varies; ~$16,488 average (2022-23)",
        "income_cap": "None",
        "homeschool_eligible": false,
        "url": "https://www.edchoice.org/school-choice/programs/vermont-town-tuitioning-program/",
        "application_url": null,
        "short_description": "America's oldest school choice program. Towns without public schools pay tuition at public or approved private schools.",
        "application_method": "town_based_process",
        "application_window": "varies_by_town",
        "stacks_with": "None",
        "notes": "NOT available to homeschoolers. Student must live in 'tuitioning town'. Act 73 added restrictions. Liberty Justice Center filed lawsuit March 2026 challenging Act 73.",
        "status": "active"
    }
  ],
  WI: [
    {
        "name": "Wisconsin Parental Choice Program (WPCP) - Statewide",
        "program_type": "voucher",
        "amount": "$10,877 (K-8); $13,371 (9-12) for 2025-26",
        "income_cap": "220% FPL (minus $7,000 if married)",
        "homeschool_eligible": true,
        "url": "https://dpi.wi.gov/sms/choice-programs",
        "application_url": null,
        "short_description": "Statewide private school voucher. Homeschool students ARE eligible if they were homeschooled the prior year.",
        "application_method": "DPI_online_parent_application",
        "application_window": "February_2-20_annual",
        "stacks_with": "None (must enroll full-time in participating private school)",
        "notes": "HOMESCHOOLERS ELIGIBLE as prior-year attendance option. Must have been homeschooled in previous year OR entering K/1/9. Must reside outside Milwaukee and Racine Unified. ~23,417 participating (2025-26).",
        "status": "active"
    },
    {
        "name": "Milwaukee Parental Choice Program (MPCP)",
        "program_type": "voucher",
        "amount": "Same as WPCP amounts",
        "income_cap": "300% FPL (minus $7,000 if married)",
        "homeschool_eligible": true,
        "url": "https://dpi.wi.gov/sms/choice-programs",
        "application_url": null,
        "short_description": "Nation's largest voucher program. Homeschool students in Milwaukee eligible.",
        "application_method": "DPI_online_parent_application",
        "application_window": "February_2-20_annual",
        "stacks_with": "None",
        "notes": "Same eligibility rules as WPCP but for Milwaukee residents. Higher income cap (300% FPL).",
        "status": "active"
    },
    {
        "name": "Special Needs Scholarship Program (SNSP)",
        "program_type": "voucher",
        "amount": "Up to ~$16,000 depending on disability and services",
        "income_cap": "None",
        "homeschool_eligible": false,
        "url": "https://dpi.wi.gov/sms/special-needs",
        "application_url": null,
        "short_description": "Voucher for students with disabilities to attend participating private schools.",
        "application_method": "apply_through_participating_private_school",
        "application_window": "annual",
        "stacks_with": "None",
        "notes": "NOT available to homeschoolers. Student must have IEP or 504 plan.",
        "status": "active"
    },
    {
        "name": "Education Freedom Tax Credit (Federal EFTC)",
        "program_type": "efct",
        "amount": "Scholarship amount TBD by SGO; donor gets $1,700 federal tax credit",
        "income_cap": "300% of area median gross income",
        "homeschool_eligible": true,
        "url": "https://www.wisconsin.gov/",
        "application_url": null,
        "short_description": "Wisconsin legislature passed AB 602 to opt into EFTC but Governor Evers (D) vetoed. Status uncertain.",
        "application_method": "apply_through_SGO",
        "application_window": "uncertain",
        "stacks_with": "WPCP/MPCP/SNSP (state programs)",
        "notes": "AB 602 was vetoed by Governor Evers March 30, 2026. Legislature did not override. Wisconsin is NOT currently opted into EFTC.",
        "status": "blocked"
    }
  ],
}

export function getMockDb(): DbQueries {
  const mockStates: StateData[] = rawStates
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
        esaPrograms: REAL_ESA_PROGRAMS[s.code] ?? [],
        nonEsaPrograms: MOCK_NON_ESA[s.code] ?? [],
        complianceForms: {
          notification_url: null,
          notification_form_url: null,
          assessment_rules: null,
          assessment_form_url: null,
          immunization_rules: null,
          instruction_days: null,
          recordkeeping: null,
          other_forms: [],
        },
        precedents: buildPrecedents(s.name),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const mockBills: Bill[] = [
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

  return {
    getStates: () => Promise.resolve(mockStates),
    getState: (code: string) => Promise.resolve(mockStates.find((s) => s.code.toLowerCase() === code.toLowerCase())),
    getBills: () => Promise.resolve(mockBills),
    getBill: (id: string) => Promise.resolve(mockBills.find((b) => b.id === id)),
    getBillsForState: (code: string) =>
      Promise.resolve(mockBills.filter((b) => b.stateCode.toLowerCase() === code.toLowerCase())),
  }
}
