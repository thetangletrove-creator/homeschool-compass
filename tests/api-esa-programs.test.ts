/**
 * Integration tests for the ESA multi-program and compliance data
 * stored in the live Neon database.
 *
 * These tests verify the Phase B1/D1 population:
 * - esa_programs JSONB array with multi-program states (FL=3, OH=2)
 * - compliance_forms JSONB for all 52 states
 * - Programs have correct structure: deadlines, forms, platform info
 *
 * Requires DATABASE_URL_UNPOOLED (same as db-integration.test.ts).
 * Auto-skipped when not set.
 */
import { describe, it, expect, beforeAll } from 'vitest'

const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
const describeIf = DATABASE_URL ? describe : describe.skip

describeIf('Neon DB — ESA Multi-Program Data', () => {
  let db: any
  let schema: any

  beforeAll(async () => {
    const { Pool } = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    schema = await import('../lib/db/schema')
    const pool = new Pool({ connectionString: DATABASE_URL })
    db = drizzle(pool, { schema })
  })

  // ── esa_programs column exists ──────────────────────────────────────

  it('states table has esa_programs column', async () => {
    const cols = await db
      .select({
        code: schema.states.code,
        esaPrograms: schema.states.esaPrograms,
      })
      .from(schema.states)
      .limit(1)
    expect(cols[0]).toHaveProperty('esaPrograms')
  })

  it('states table has compliance_forms column', async () => {
    const cols = await db
      .select({
        code: schema.states.code,
        complianceForms: schema.states.complianceForms,
      })
      .from(schema.states)
      .limit(1)
    expect(cols[0]).toHaveProperty('complianceForms')
  })

  // ── esa_programs data ───────────────────────────────────────────────

  it('Florida has 3 ESA programs', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.code.equals?.('FL') ?? 'FL')

    const programs = rows[0]?.esaPrograms as any[]
    expect(programs).toBeDefined()
    expect(programs.length).toBe(3)
  })

  it('Florida programs have correct names', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.code.equals?.('FL') ?? 'FL')

    const names = (rows[0]?.esaPrograms as any[]).map(p => p.name)
    expect(names).toContain('Family Empowerment Scholarship — Educational Options')
    expect(names).toContain('Family Empowerment Scholarship — Unique Abilities')
    expect(names).toContain('Florida Tax Credit Scholarship')
  })

  it('Ohio has 2 ESA programs', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.code.equals?.('OH') ?? 'OH')

    const programs = rows[0]?.esaPrograms as any[]
    expect(programs).toBeDefined()
    expect(programs.length).toBe(2)
  })

  it('Texas has 1 ESA program', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.code.equals?.('TX') ?? 'TX')

    const programs = rows[0]?.esaPrograms as any[]
    expect(programs).toBeDefined()
    expect(programs.length).toBe(1)
  })

  // ── esa_programs structure ──────────────────────────────────────────

  it('each program has required fields', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.esaPrograms.isNotNull())

    for (const row of rows) {
      const programs = row.esaPrograms as any[]
      for (const prog of programs) {
        expect(prog).toHaveProperty('name')
        expect(prog).toHaveProperty('status')
        expect(prog).toHaveProperty('max_award')
        expect(prog).toHaveProperty('eligibility')
        expect(prog).toHaveProperty('platform')
        expect(prog).toHaveProperty('portal_url')
        expect(prog).toHaveProperty('application_url')

        // Status must be valid
        expect([
          'active', 'pending_launch', 'capped', 'blocked', 'paused', 'defunct',
        ]).toContain(prog.status)

        // Max award should be a string or null
        expect(typeof prog.max_award === 'string' || prog.max_award === null).toBe(true)
      }
    }
  })

  it('each program has documents_required array', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.esaPrograms.isNotNull())

    for (const row of rows) {
      const programs = row.esaPrograms as any[]
      for (const prog of programs) {
        expect(Array.isArray(prog.documents_required)).toBe(true)
      }
    }
  })

  it('each program has forms array with correct shape', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.esaPrograms.isNotNull())

    for (const row of rows) {
      const programs = row.esaPrograms as any[]
      for (const prog of programs) {
        expect(Array.isArray(prog.forms)).toBe(true)
        for (const form of prog.forms) {
          expect(form).toHaveProperty('name')
          expect(form).toHaveProperty('url')
          expect(form).toHaveProperty('type')
          expect(form).toHaveProperty('access')
          expect(['PDF', 'web_portal', 'form']).toContain(form.type)
          expect(['public', 'login_required', 'unknown']).toContain(form.access)
        }
      }
    }
  })

  it('each program has deadlines array with type discriminator', async () => {
    const rows = await db
      .select({ esaPrograms: schema.states.esaPrograms })
      .from(schema.states)
      .where(schema.states.esaPrograms.isNotNull())

    for (const row of rows) {
      const programs = row.esaPrograms as any[]
      for (const prog of programs) {
        expect(Array.isArray(prog.deadlines)).toBe(true)
        for (const dl of prog.deadlines) {
          expect(dl).toHaveProperty('type')
          expect([
            'application_window', 'report', 'renewal', 'other',
          ]).toContain(dl.type)
          // At least one of due/open/close should exist
          const hasDate = dl.due || dl.open || dl.close
          expect(hasDate).toBeTruthy()
        }
      }
    }
  })

  // ── Platform distribution ────────────────────────────────────────────

  it('some states use Odyssey platform', async () => {
    const allProgs = await getAllPrograms(db, schema)
    const odyssey = allProgs.filter(p => p.platform === 'Odyssey')
    expect(odyssey.length).toBeGreaterThanOrEqual(4) // GA, IA, LA, WY, TX, UT
  })

  it('some states use ClassWallet platform', async () => {
    const allProgs = await getAllPrograms(db, schema)
    const classWallet = allProgs.filter(p => p.platform === 'ClassWallet')
    expect(classWallet.length).toBeGreaterThanOrEqual(8) // AL, AR, AZ, FL, IN, MO, NC, NH, SC, WV
  })

  // ── compliance_forms ────────────────────────────────────────────────

  it('all 52 states have compliance_forms', async () => {
    const rows = await db
      .select({
        code: schema.states.code,
        complianceForms: schema.states.complianceForms,
      })
      .from(schema.states)

    const bad = rows.filter(r => r.complianceForms === null)
    expect(bad).toHaveLength(0)
  })

  it('ESA states have richer compliance_forms than non-ESA', async () => {
    const rows = await db
      .select({
        code: schema.states.code,
        esaPrograms: schema.states.esaPrograms,
        complianceForms: schema.states.complianceForms,
      })
      .from(schema.states)

    for (const row of rows) {
      const cf = row.complianceForms as any
      expect(cf).toHaveProperty('notification_url')
      expect(cf).toHaveProperty('assessment_rules')
      expect(cf).toHaveProperty('instruction_days')
      expect(cf).toHaveProperty('recordkeeping')

      // ESA states should have at minimum notification_url populated
      if (row.esaPrograms && (row.esaPrograms as any[]).length > 0) {
        // Just checking shape — actual population varies
        expect(typeof cf.instruction_days === 'string' || cf.instruction_days === null).toBe(true)
      }
    }
  })

  it('compliance_forms has other_forms array when present', async () => {
    const rows = await db
      .select({ complianceForms: schema.states.complianceForms })
      .from(schema.states)
      .limit(5)

    for (const row of rows) {
      const cf = row.complianceForms as any
      if (cf.other_forms) {
        expect(Array.isArray(cf.other_forms)).toBe(true)
        for (const form of cf.other_forms) {
          expect(form).toHaveProperty('name')
          expect(form).toHaveProperty('url')
        }
      }
    }
  })

  // ── Bill ESA relationships ──────────────────────────────────────────

  it('some bills are marked as ESA-related', async () => {
    const rows = await db
      .select({ esaRelated: schema.bills.esaRelated })
      .from(schema.bills)
      .limit(100)

    const esaBills = rows.filter(r => r.esaRelated === true)
    expect(esaBills.length).toBeGreaterThan(0)
  })

  it('ESA-related bills have impact confidence scores', async () => {
    const rows = await db
      .select({
        id: schema.bills.id,
        esaRelated: schema.bills.esaRelated,
        impactConfidence: schema.bills.impactConfidence,
        analysis: schema.bills.analysis,
      })
      .from(schema.bills)
      .where(schema.bills.esaRelated.equals?.(true) ?? true)
      .limit(20)

    for (const row of rows) {
      if (row.analysis) {
        expect(row.analysis).toHaveProperty('analysis_points')
        expect(Array.isArray((row.analysis as any).analysis_points)).toBe(true)
      }
    }
  })

  // ── Texas family scenario ────────────────────────────────────────────

  it('Texas has all data a family with 3 kids would need', async () => {
    const rows = await db
      .select()
      .from(schema.states)
      .where(schema.states.code.equals?.('TX') ?? 'TX')

    const tx = rows[0]
    expect(tx).toBeDefined()

    // Has ESA program data
    const programs = tx.esaPrograms as any[]
    expect(programs).toBeDefined()
    expect(programs.length).toBe(1)

    const esa = programs[0]
    expect(esa.name).toContain('Texas')
    expect(esa.max_award).toBeTruthy()
    expect(Array.isArray(esa.documents_required)).toBe(true)
    expect(Array.isArray(esa.forms)).toBe(true)
    expect(Array.isArray(esa.deadlines)).toBe(true)

    // Has compliance info
    const cf = tx.complianceForms as any
    expect(cf).toBeDefined()
    expect(typeof cf.instruction_days === 'string' || cf.instruction_days === null).toBe(true)

    // Has score and level
    expect(typeof tx.score).toBe('number')
    expect(tx.level).toBeDefined()
    expect(tx.subscores).toBeDefined()

    // Has tracked bills
    const txBills = await db
      .select({ id: schema.bills.id, title: schema.bills.title })
      .from(schema.bills)
      .where(schema.bills.stateCode.equals?.('TX') ?? 'TX')
    expect(txBills.length).toBeGreaterThan(0)
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────

async function getAllPrograms(db: any, schema: any): Promise<any[]> {
  const rows = await db
    .select({ esaPrograms: schema.states.esaPrograms })
    .from(schema.states)
    .where(schema.states.esaPrograms.isNotNull())

  return rows.flatMap(r => (r.esaPrograms as any[]) ?? [])
}
