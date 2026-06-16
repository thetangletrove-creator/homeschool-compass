/**
 * Shared types for Homeschool Compass.
 *
 * Types are extracted from lib/data.ts for use across mock-data.ts and db.ts.
 * lib/data.ts re-exports these so existing imports from "@/lib/data" still work.
 */

export type RegulationLevel =
  | "No Notice"
  | "Low Regulation"
  | "Moderate"
  | "High"

export type Grade = "A" | "B" | "C" | "D" | "F"

export type Subscores = {
  reporting: number
  testing: number
  curriculum: number
  teacher: number
}

export type Requirement = {
  name: string
  deadline: string
  citation: string
  formUrl: string
  status: "compliant" | "pending" | "not-applicable"
}

export type EsaProgram = {
  active: boolean
  name?: string
  maxAward?: string
  eligibility?: string
  documentation?: string[]
  deadline?: string
}

export type LegalCase = {
  name: string
  citation: string
  date: string
  impact: string
}

export type StateData = {
  code: string
  name: string
  grade: Grade
  score: number
  level: RegulationLevel
  subscores: Subscores
  summary: string
  requirements: Requirement[]
  esa: EsaProgram
  precedents: LegalCase[]
}

export type BillStatus =
  | "Introduced"
  | "In Committee"
  | "Passed Chamber"
  | "Other Chamber"
  | "Governor"
  | "Enacted"

export type Bill = {
  id: string
  stateCode: string
  number: string
  title: string
  date: string
  statusStep: number
  impact: Impact
  impactSummary: string
  delta: string
  actionRequired: string
  esaRelated: boolean
  fullText: string
  analysis: string[]
}

export type Impact = "increase" | "decrease" | "neutral"

/**
 * Async query interface that both mock and live DB layers implement.
 * Callers use `await getDb().getStates()` and the router picks the source.
 */
export interface DbQueries {
  getStates(): Promise<StateData[]>
  getState(code: string): Promise<StateData | undefined>
  getBills(): Promise<Bill[]>
  getBill(id: string): Promise<Bill | undefined>
  getBillsForState(code: string): Promise<Bill[]>
}
