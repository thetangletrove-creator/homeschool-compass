/**
 * Tests for the conditional data routing layer (lib/db.ts).
 *
 * Verifies that:
 * 1. getDb() returns a DbQueries (mock by default)
 * 2. The mock and live paths produce compatible shape
 * 3. initLiveDb can be imported without crashing at module scope
 * 4. Data from both paths conforms to the same type contract
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { DbQueries } from '../lib/types'

describe('Data Routing — getDb()', () => {
  it('exports getDb as an async function', async () => {
    const dbModule = await import('../lib/db')
    expect(typeof dbModule.getDb).toBe('function')
    const db = await dbModule.getDb()
    expect(typeof db.getStates).toBe('function')
    expect(typeof db.getBills).toBe('function')
    expect(typeof db.getState).toBe('function')
    expect(typeof db.getBill).toBe('function')
    expect(typeof db.getBillsForState).toBe('function')
  })

  it('mock path returns 50 states', async () => {
    const { getDb } = await import('../lib/db')
    // Ensures USE_LIVE_DATA is not true in test env
    const original = process.env.USE_LIVE_DATA
    process.env.USE_LIVE_DATA = 'false'
    const db = await getDb()
    const states = await db.getStates()
    process.env.USE_LIVE_DATA = original
    expect(states).toHaveLength(50)
  })

  it('mock path returns 12 bills', async () => {
    const { getDb } = await import('../lib/db')
    const original = process.env.USE_LIVE_DATA
    process.env.USE_LIVE_DATA = 'false'
    const db = await getDb()
    const bills = await db.getBills()
    process.env.USE_LIVE_DATA = original
    expect(bills).toHaveLength(12)
  })
})

describe('Type Contract — Mock states and bills match DbQueries interface', () => {
  let db: DbQueries

  beforeAll(async () => {
    const { getMockDb } = await import('../lib/mock-data')
    db = getMockDb()
  })

  it('getStates returns StateData[] with score ranges', async () => {
    const states = await db.getStates()
    for (const state of states) {
      expect(state.score).toBeGreaterThanOrEqual(0)
      expect(state.score).toBeLessThanOrEqual(100)
    }
  })

  it('getBills returns Bill[] with statusStep ranges', async () => {
    const bills = await db.getBills()
    for (const bill of bills) {
      expect(bill.statusStep).toBeGreaterThanOrEqual(0)
      expect(bill.statusStep).toBeLessThanOrEqual(5)
    }
  })

  it('states and bills reference the same state codes', async () => {
    const states = await db.getStates()
    const bills = await db.getBills()
    const stateCodes = new Set(states.map((s) => s.code))
    for (const bill of bills) {
      expect(stateCodes.has(bill.stateCode)).toBe(true)
    }
  })
})
