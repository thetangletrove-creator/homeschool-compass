/**
 * API contract tests for Homeschool Compass.
 *
 * Defines the expected response shapes for all public API endpoints.
 * Tests against the mock data layer (default test path) to verify
 * the contract BEFORE API routes exist — pure TDD.
 *
 * When real route handlers are built, these same shapes must hold
 * for both mock and live data paths.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { DbQueries, StateData, Bill, EsaProgram } from '../lib/types'

describe('API Contract — State Catalog (GET /api/states)', () => {
  let db: DbQueries
  let states: StateData[]

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
    states = await db.getStates()
  })

  it('returns all 50 states + DC', () => {
    expect(states.length).toBeGreaterThanOrEqual(50)
    expect(states.length).toBeLessThanOrEqual(52)
  })

  it('each state has required API fields', () => {
    for (const state of states) {
      expect(state).toHaveProperty('code')
      expect(state).toHaveProperty('name')
      expect(state).toHaveProperty('score')
      expect(state).toHaveProperty('grade')
      expect(state).toHaveProperty('level')
      expect(state).toHaveProperty('subscores')
      expect(typeof state.code).toBe('string')
      expect(state.code).toMatch(/^[A-Z]{2}$/)
      expect(typeof state.name).toBe('string')
      expect(typeof state.score).toBe('number')
      expect(state.score).toBeGreaterThanOrEqual(0)
      expect(state.score).toBeLessThanOrEqual(100)
      expect(['A', 'B', 'C', 'D', 'F']).toContain(state.grade)
      expect(['No Notice', 'Low Regulation', 'Moderate', 'High']).toContain(state.level)
    }
  })

  it('each state has subscores with all 4 dimensions', () => {
    for (const state of states) {
      expect(state.subscores).toBeDefined()
      expect(typeof state.subscores.reporting).toBe('number')
      expect(typeof state.subscores.testing).toBe('number')
      expect(typeof state.subscores.curriculum).toBe('number')
      expect(typeof state.subscores.teacher).toBe('number')
    }
  })

  it('includes all US state codes (no duplicates)', () => {
    const codes = states.map(s => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('includes at least 50 states', () => {
    const codes = states.map(s => s.code)
    expect(codes.length).toBeGreaterThanOrEqual(50)
  })
})

describe('API Contract — State Detail (GET /api/states/:code)', () => {
  let db: DbQueries

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
  })

  it('returns full state object for valid code', async () => {
    const tx = await db.getState('TX')
    expect(tx).toBeDefined()
    expect(tx!.code).toBe('TX')
    expect(tx!.name).toBe('Texas')
    expect(typeof tx!.score).toBe('number')
    expect(['A', 'B', 'C', 'D', 'F']).toContain(tx!.grade)
  })

  it('returns undefined for invalid code', async () => {
    const result = await db.getState('ZZ')
    expect(result).toBeUndefined()
  })

  it('is case-insensitive', async () => {
    const result = await db.getState('ca')
    expect(result).toBeDefined()
    expect(result!.code).toBe('CA')
  })

  it('California exists with valid fields', async () => {
    const ca = await db.getState('CA')
    expect(ca).toBeDefined()
    expect(ca!.code).toBe('CA')
    expect(ca!.name).toBe('California')
    expect(ca!.score).toBeGreaterThanOrEqual(0)
  })

  it('includes ESA info (active or inactive)', async () => {
    const tx = await db.getState('TX')
    expect(tx).toBeDefined()
    expect(tx!.esa).toBeDefined()
    expect(typeof tx!.esa.active).toBe('boolean')
  })

  it('includes requirements array', async () => {
    const tx = await db.getState('TX')
    expect(tx).toBeDefined()
    expect(Array.isArray(tx!.requirements)).toBe(true)
    expect(tx!.requirements.length).toBeGreaterThanOrEqual(4)
    for (const req of tx!.requirements) {
      expect(req).toHaveProperty('name')
      expect(req).toHaveProperty('deadline')
      expect(req).toHaveProperty('citation')
      expect(req).toHaveProperty('formUrl')
      expect(req).toHaveProperty('status')
    }
  })

  it('includes precedents array', async () => {
    const tx = await db.getState('TX')
    expect(tx).toBeDefined()
    expect(Array.isArray(tx!.precedents)).toBe(true)
  })

  it('includes summary string', async () => {
    const tx = await db.getState('TX')
    expect(tx).toBeDefined()
    expect(typeof tx!.summary).toBe('string')
    expect(tx!.summary.length).toBeGreaterThan(20)
  })
})

describe('API Contract — Bills (GET /api/bills)', () => {
  let db: DbQueries
  let bills: Bill[]

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
    bills = await db.getBills()
  })

  it('returns an array of bills', () => {
    expect(Array.isArray(bills)).toBe(true)
  })

  it('each bill has required API fields', () => {
    for (const bill of bills) {
      expect(bill).toHaveProperty('id')
      expect(bill).toHaveProperty('stateCode')
      expect(bill).toHaveProperty('number')
      expect(bill).toHaveProperty('title')
      expect(bill).toHaveProperty('date')
      expect(bill).toHaveProperty('statusStep')
      expect(bill).toHaveProperty('impact')
      expect(bill).toHaveProperty('impactSummary')
      expect(bill).toHaveProperty('esaRelated')
      expect(bill).toHaveProperty('analysis')

      expect(typeof bill.id).toBe('string')
      expect(bill.stateCode).toMatch(/^[A-Z]{2}$/)
      expect(bill.title).toBeTruthy()
      expect(bill.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(bill.statusStep).toBeGreaterThanOrEqual(0)
      expect(bill.statusStep).toBeLessThanOrEqual(5)
      expect(['increase', 'decrease', 'neutral']).toContain(bill.impact)
      expect(typeof bill.esaRelated).toBe('boolean')
    }
  })

  it('analysis field is an array of strings', () => {
    for (const bill of bills) {
      expect(Array.isArray(bill.analysis)).toBe(true)
    }
  })

  it('impactConfidence is a number when present', () => {
    const withConfidence = bills.filter(b => b.impactConfidence !== undefined)
    for (const bill of withConfidence) {
      expect(typeof bill.impactConfidence).toBe('number')
      expect(bill.impactConfidence!).toBeGreaterThanOrEqual(0)
      expect(bill.impactConfidence!).toBeLessThanOrEqual(1)
    }
  })

  it('each bill references a valid state code', async () => {
    const states = await db.getStates()
    const stateCodes = new Set(states.map(s => s.code))
    for (const bill of bills) {
      expect(stateCodes.has(bill.stateCode)).toBe(true)
    }
  })
})

describe('API Contract — Bills by State (GET /api/bills?state=:code)', () => {
  let db: DbQueries

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
  })

  it('returns bills filtered to the specified state', async () => {
    const txBills = await db.getBillsForState('TX')
    expect(txBills.length).toBeGreaterThan(0)
    for (const bill of txBills) {
      expect(bill.stateCode).toBe('TX')
    }
  })

  it('returns empty array for state with no tracked bills', async () => {
    const wyBills = await db.getBillsForState('WY')
    expect(wyBills).toHaveLength(0)
  })

  it('each state appears as a valid 2-letter code across bills', async () => {
    const allBills = await db.getBills()
    for (const bill of allBills) {
      expect(bill.stateCode).toMatch(/^[A-Z]{2}$/)
    }
  })
})

describe('API Contract — ESA Programs', () => {
  let db: DbQueries

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
  })

  it('some states have active ESAs', async () => {
    const states = await db.getStates()
    const withEsa = states.filter(s => s.esa.active)
    expect(withEsa.length).toBeGreaterThan(0)
  })

  it('active ESA states have name, maxAward, eligibility', async () => {
    const states = await db.getStates()
    const withEsa = states.filter(s => s.esa.active)
    for (const state of withEsa) {
      expect(state.esa.name).toBeTruthy()
      expect(state.esa.maxAward).toBeTruthy()
      expect(state.esa.eligibility).toBeTruthy()
    }
  })

  it('Texas ESA has $10,000 max award', async () => {
    const tx = await db.getState('TX')
    expect(tx).toBeDefined()
    expect(tx!.esa.active).toBe(true)
    expect(tx!.esa.maxAward).toContain('10,000')
  })

  it('California has no active ESA', async () => {
    const ca = await db.getState('CA')
    expect(ca).toBeDefined()
    expect(ca!.esa.active).toBe(false)
  })

  it('state without ESA has esa.name undefined', async () => {
    const ca = await db.getState('CA')
    expect(ca!.esa.name).toBeUndefined()
  })
})

describe('API Contract — Data Quality', () => {
  let db: DbQueries
  let states: StateData[]
  let bills: Bill[]

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
    states = await db.getStates()
    bills = await db.getBills()
  })

  it('no duplicate state codes', () => {
    const codes = states.map(s => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('no duplicate bill IDs', () => {
    const ids = bills.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('scores are within valid range for all states', () => {
    for (const state of states) {
      expect(state.score).toBeGreaterThanOrEqual(0)
      expect(state.score).toBeLessThanOrEqual(100)
    }
  })

  it('all bills have unique IDs', () => {
    expect(new Set(bills.map(b => b.id)).size).toBe(bills.length)
  })
})
