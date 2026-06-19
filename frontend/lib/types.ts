/**
 * Shared types for Homeschool Compass.
 *
 * Types are extracted from lib/data.ts for use across mock-data.ts and db.ts.
 * lib/data.ts re-exports these so existing imports from "@/lib/data" still work.
 *
 * Phase B1/B4/B5 types are imported from the DB schema for consistency.
 * The frontend consumer types (EsaProgram, StateData) extend what the DB returns.
 */

import type {
  EsaProgram as DbEsaProgram,
  NonEsaProgram,
  ComplianceForms,
} from "./db/schema"

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

/**
 * Legacy flat ESA program type — backward compat with mock data.
 * New code should use esaPrograms[] for multi-program support.
 */
export type EsaProgram = {
  active: boolean
  name?: string
  maxAward?: string
  eligibility?: string
  documentation?: string[]
  deadline?: string
}

/** Re-export DB schema types so consumers can import from "@/lib/types". */
export type { DbEsaProgram, NonEsaProgram, ComplianceForms }

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
  /** Legacy flat ESA — one program per state. Superseded by esaPrograms[]. */
  esa: EsaProgram
  /** Multi-program ESA data from DB esa_programs JSONB. */
  esaPrograms: DbEsaProgram[]
  /** Non-ESA funding programs (tax credits, vouchers, scholarships, EFTC). */
  nonEsaPrograms: NonEsaProgram[]
  /** Compliance form URLs and assessment rules per state. */
  complianceForms: ComplianceForms
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
  impactConfidence?: number
  analyzedAt?: string
  analysisVersion?: string
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
