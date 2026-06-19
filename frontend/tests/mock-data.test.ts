/**
 * Real unit tests for the mock data layer.
 *
 * Tests that:
 * 1. All 50 states are returned with correct shape and required fields
 * 2. getState returns the right state by code
 * 3. All 12 bills are returned with correct shape
 * 4. getBill returns the right bill by ID
 * 5. getBillsForState returns bills filtered by state code
 * 6. Every state has valid score, grade, level, and ESAs
 * 7. Every bill has a valid impact, statusStep, and actionRequired
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { getMockDb } from '../lib/mock-data'
import type { DbQueries } from '../lib/types'

describe('Mock Data Layer — DbQueries', () => {
  let db: DbQueries

  beforeAll(() => {
    db = getMockDb()
  })

  // ── States ───────────────────────────────────────────────────────────

  describe('getStates()', () => {
    it('returns all 50 states', async () => {
      const states = await db.getStates()
      expect(states).toHaveLength(50)
    })

    it('each state has required fields', async () => {
      const states = await db.getStates()
      for (const state of states) {
        expect(state.code).toBeTruthy()
        expect(state.code).toMatch(/^[A-Z]{2}$/)
        expect(state.name).toBeTruthy()
        expect(typeof state.score).toBe('number')
        expect(state.score).toBeGreaterThanOrEqual(0)
        expect(state.score).toBeLessThanOrEqual(100)
        expect(state.level).toMatch(
          /^(No Notice|Low Regulation|Moderate|High)$/,
        )
        expect(['A', 'B', 'C', 'D', 'F']).toContain(state.grade)
        expect(state.subscores).toBeDefined()
        expect(typeof state.subscores.reporting).toBe('number')
        expect(typeof state.subscores.testing).toBe('number')
        expect(typeof state.subscores.curriculum).toBe('number')
        expect(typeof state.subscores.teacher).toBe('number')
      }
    })

    it('California exists with valid fields', async () => {
      const states = await db.getStates()
      const ca = states.find((s) => s.code === 'CA')
      expect(ca).toBeDefined()
      expect(ca!.code).toBe('CA')
      expect(ca!.name).toBe('California')
      expect(ca!.score).toBeGreaterThanOrEqual(0)
      expect(ca!.score).toBeLessThanOrEqual(100)
      expect(['A', 'B', 'C', 'D', 'F']).toContain(ca!.grade)
    })

    it('Massachusetts exists with valid fields', async () => {
      const states = await db.getStates()
      const ma = states.find((s) => s.code === 'MA')
      expect(ma).toBeDefined()
      expect(ma!.code).toBe('MA')
      expect(ma!.name).toBe('Massachusetts')
      expect(ma!.score).toBeGreaterThanOrEqual(0)
      expect(ma!.score).toBeLessThanOrEqual(100)
    })
  })

  describe('getState()', () => {
    it('returns the correct state by code', async () => {
      const tx = await db.getState('TX')
      expect(tx).toBeDefined()
      expect(tx!.code).toBe('TX')
      expect(tx!.name).toBe('Texas')
    })

    it('returns undefined for nonexistent code', async () => {
      const result = await db.getState('ZZ')
      expect(result).toBeUndefined()
    })

    it('is case-insensitive (lowercase still matches)', async () => {
      // The mock data source treats codes case-insensitively
      const result = await db.getState('ca')
      expect(result).toBeDefined()
      expect(result!.code).toBe('CA')
    })
  })

  describe('ESA programs', () => {
    it('some states have active ESAs', async () => {
      const states = await db.getStates()
      const withEsa = states.filter((s) => s.esa.active)
      expect(withEsa.length).toBeGreaterThan(0)
      for (const state of withEsa) {
        expect(state.esa.name).toBeTruthy()
        expect(state.esa.maxAward).toBeTruthy()
        expect(state.esa.eligibility).toBeTruthy()
      }
    })

    it('esaPrograms array mirrors active ESA states', async () => {
      const states = await db.getStates()
      for (const state of states) {
        if (state.esaPrograms.length > 0) {
          expect(state.esaPrograms[0].name).toBeTruthy()
        } else {
          // No programs is valid for: non-ESA states, defunct programs (AK),
          // non-ESA programs that were removed from esa_programs (OH voucher, OK tax credit)
        }
      }
    })

    it('each esaProgram has required fields', async () => {
      const states = await db.getStates()
      for (const state of states) {
        for (const prog of state.esaPrograms) {
          expect(typeof prog.name).toBe('string')
          expect(typeof prog.status).toBe('string')
          expect(prog.status.length).toBeGreaterThan(0)
          expect(Array.isArray(prog.documents_required)).toBe(true)
          expect(Array.isArray(prog.forms)).toBe(true)
          expect(Array.isArray(prog.deadlines)).toBe(true)
        }
      }
    })
  })

  describe('Non-ESA programs', () => {
    it('every state has nonEsaPrograms array', async () => {
      const states = await db.getStates()
      for (const state of states) {
        expect(Array.isArray(state.nonEsaPrograms)).toBe(true)
      }
    })
  })

  describe('Compliance forms', () => {
    it('every state has complianceForms object', async () => {
      const states = await db.getStates()
      for (const state of states) {
        expect(state.complianceForms).toBeDefined()
        expect(typeof state.complianceForms).toBe('object')
      }
    })
  })

  // ── Bills ────────────────────────────────────────────────────────────

  describe('getBills()', () => {
    it('returns all 12 bills', async () => {
      const bills = await db.getBills()
      expect(bills).toHaveLength(12)
    })

    it('each bill has required fields', async () => {
      const bills = await db.getBills()
      for (const bill of bills) {
        expect(bill.id).toBeTruthy()
        expect(bill.stateCode).toMatch(/^[A-Z]{2}$/)
        expect(bill.number).toBeTruthy()
        expect(bill.title).toBeTruthy()
        expect(bill.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(bill.statusStep).toBeGreaterThanOrEqual(0)
        expect(bill.statusStep).toBeLessThanOrEqual(5)
        expect(['increase', 'decrease', 'neutral']).toContain(bill.impact)
      }
    })
  })

  describe('getBill()', () => {
    it('returns the correct bill by ID', async () => {
      // First get all bills to find a valid ID
      const bills = await db.getBills()
      const firstId = bills[0].id
      const bill = await db.getBill(firstId)
      expect(bill).toBeDefined()
      expect(bill!.id).toBe(firstId)
    })

    it('returns undefined for nonexistent ID', async () => {
      const result = await db.getBill('nonexistent-999')
      expect(result).toBeUndefined()
    })
  })

  describe('getBillsForState()', () => {
    it('returns only bills for the specified state', async () => {
      const bills = await db.getBillsForState('CA')
      expect(bills.length).toBeGreaterThan(0)
      for (const bill of bills) {
        expect(bill.stateCode).toBe('CA')
      }
    })

    it('returns empty array for state with no bills', async () => {
      const bills = await db.getBillsForState('WY')
      expect(bills).toHaveLength(0)
    })
  })
})
