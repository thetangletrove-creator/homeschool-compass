/**
 * Conditional data router for Homeschool Compass.
 *
 * Returns a DbQueries implementation backed by either the live Neon database
 * (via Drizzle ORM) or in-memory mock data. The source is selected by the
 * USE_LIVE_DATA environment variable.
 *
 * Production path: @neondatabase/serverless (WebSocket, supports transactions).
 * Development path: node-postgres (Pool) against the unpooled Neon URL.
 * Mock fallback: wraps the original sync mock arrays in Promise-based accessors.
 *
 * All DB imports are dynamic (inside async init) so this module is safe to
 * import at module scope during Next.js builds.
 *
 * TODO: When the sync pipeline populates the DB with real data, the row→type
 * mapping in this file should be refined to use pipeline-computed fields
 * (grade, summary, requirements) rather than computing them client-side.
 */

import type { DbQueries, StateData, Bill, RegulationLevel, Grade, Impact, Subscores, EsaProgram } from "./types"
import type {
  EsaProgram as DbEsaProgram,
  NonEsaProgram,
  ComplianceForms,
} from "./db/schema"

// ── Live data helpers ────────────────────────────────────────────────────

function isLive(): boolean {
  // Production: live data. Preview: mock data (unless forced).
  // Local dev with USE_LIVE_DATA=true: live data.
  if (process.env.USE_LIVE_DATA !== "true") return false
  if (process.env.VERCEL_ENV === "preview") return false
  return true
}

let liveDbSingleton: DbQueries | null = null

/** Map a raw Drizzle states row to the StateData shape. */
function rowToState(row: {
  code: string
  name: string
  score: number
  subscores: unknown
  level: string
  esaActive: boolean | null
  esaName: string | null
  esaMaxAward: string | null
  esaEligibility: string | null
  esaDocumentation: unknown
  esaDeadline: string | null
  esaPrograms: unknown
  complianceForms: unknown
  nonEsaPrograms: unknown
}): StateData {
  const score = row.score
  const level = row.level as RegulationLevel
  const grade: Grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F"

  // Parse JSONB columns safely
  const esaPrograms = (row.esaPrograms ?? []) as DbEsaProgram[]
  const nonEsaPrograms = (row.nonEsaPrograms ?? []) as NonEsaProgram[]
  const complianceForms = (row.complianceForms ?? {}) as ComplianceForms

  return {
    code: row.code,
    name: row.name,
    score,
    grade,
    level,
    subscores: (row.subscores ?? { reporting: 0, testing: 0, curriculum: 0, teacher: 0 }) as Subscores,
    summary: `${row.name} is classified as ${level.toLowerCase()} for homeschool families, with a composite freedom score of ${score}/100.${
      row.esaActive ? ` An active education savings account program (${row.esaName ?? "ESA"}) is available.` : ""
    }`,
    requirements: [],
    esa: {
      active: row.esaActive ?? false,
      name: row.esaName ?? undefined,
      maxAward: row.esaMaxAward ?? undefined,
      eligibility: row.esaEligibility ?? undefined,
      documentation: Array.isArray(row.esaDocumentation) ? (row.esaDocumentation as string[]) : undefined,
      deadline: row.esaDeadline ?? undefined,
    } as EsaProgram,
    esaPrograms,
    nonEsaPrograms,
    complianceForms,
    precedents: [],
  }
}

/** Map a raw Drizzle bills row to the Bill shape. */
function rowToBill(row: {
  id: string
  stateCode: string
  number: string
  title: string
  date: Date
  statusStep: number
  impact: string
  impactSummary: string | null
  delta: string | null
  actionRequired: string | null
  esaRelated: boolean | null
  analysis: unknown
  impactConfidence?: number | null
  analyzedAt?: Date | string | null
  analysisVersion?: string | null
}): Bill {
  const analysis_raw = row.analysis
  let analysis_points: string[] = []
  if (analysis_raw && typeof analysis_raw === 'object') {
    const obj = analysis_raw as Record<string, unknown>
    if (Array.isArray(obj.analysis_points)) {
      analysis_points = obj.analysis_points as string[]
    }
  }

  return {
    id: row.id,
    stateCode: row.stateCode,
    number: row.number,
    title: row.title,
    date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
    statusStep: row.statusStep,
    impact: row.impact as Impact,
    impactSummary: row.impactSummary ?? "",
    delta: row.delta ?? "",
    actionRequired: row.actionRequired ?? "",
    esaRelated: row.esaRelated ?? false,
    fullText: "",
    analysis: analysis_points,
    impactConfidence: row.impactConfidence ?? undefined,
    analyzedAt: row.analyzedAt instanceof Date
      ? row.analyzedAt.toISOString()
      : (row.analyzedAt ?? undefined),
    analysisVersion: row.analysisVersion ?? undefined,
  }
}

async function initLiveDb(): Promise<DbQueries> {
  if (liveDbSingleton) return liveDbSingleton

  const isProd = process.env.NODE_ENV === "production"
  const schema = await import("./db/schema")

  // Dynamic imports to avoid top-level await during builds.
  const { eq } = await import("drizzle-orm")

  if (isProd) {
    const { Pool } = await import("@neondatabase/serverless")
    const { drizzle } = await import("drizzle-orm/neon-serverless")
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    const db = drizzle(pool, { schema })

    liveDbSingleton = {
      getStates: async () => {
        const rows = await db.select().from(schema.states)
        return rows.map(rowToState)
      },
      getState: async (code: string) => {
        const rows = await db.select().from(schema.states).where(eq(schema.states.code, code))
        return rows[0] ? rowToState(rows[0]) : undefined
      },
      getBills: async () => {
        const rows = await db.select().from(schema.bills)
        return rows.map(rowToBill)
      },
      getBill: async (id: string) => {
        const rows = await db.select().from(schema.bills).where(eq(schema.bills.id, id))
        return rows[0] ? rowToBill(rows[0]) : undefined
      },
      getBillsForState: async (code: string) => {
        const rows = await db.select().from(schema.bills).where(eq(schema.bills.stateCode, code))
        return rows.map(rowToBill)
      },
    }
  } else {
    const { Pool } = await import("pg")
    const { drizzle } = await import("drizzle-orm/node-postgres")
    const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
    const db = drizzle(pool, { schema })

    liveDbSingleton = {
      getStates: async () => {
        const rows = await db.select().from(schema.states)
        return rows.map(rowToState)
      },
      getState: async (code: string) => {
        const rows = await db.select().from(schema.states).where(eq(schema.states.code, code))
        return rows[0] ? rowToState(rows[0]) : undefined
      },
      getBills: async () => {
        const rows = await db.select().from(schema.bills)
        return rows.map(rowToBill)
      },
      getBill: async (id: string) => {
        const rows = await db.select().from(schema.bills).where(eq(schema.bills.id, id))
        return rows[0] ? rowToBill(rows[0]) : undefined
      },
      getBillsForState: async (code: string) => {
        const rows = await db.select().from(schema.bills).where(eq(schema.bills.stateCode, code))
        return rows.map(rowToBill)
      },
    }
  }

  return liveDbSingleton
}

// ── Mock data helpers ────────────────────────────────────────────────────

import { getMockDb as buildMockDb } from "./mock-data"

let mockDbSingleton: DbQueries | null = null

function getMockDb(): DbQueries {
  if (!mockDbSingleton) {
    mockDbSingleton = buildMockDb()
  }
  return mockDbSingleton
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Returns a DbQueries implementation.
 *
 * - USE_LIVE_DATA=true + not preview → live Neon database
 * - Everything else → in-memory mock data
 *
 * The caller is responsible for awaiting the result:
 *   const db = await getDb()
 *   const states = await db.getStates()
 */
export async function getDb(): Promise<DbQueries> {
  if (isLive()) {
    console.log("[DB] Data source: live — Neon")
    return initLiveDb()
  }

  if (process.env.VERCEL_ENV === "preview") {
    console.log("[DB] Preview environment — using mock data. Set USE_LIVE_DATA=true to override.")
  } else {
    console.log("[DB] Data source: mock")
  }

  return getMockDb()
}

/**
 * Force-init the live DB connection outside getDb().
 * Used for admin-only operations like data freshness checks.
 */
export { initLiveDb }
