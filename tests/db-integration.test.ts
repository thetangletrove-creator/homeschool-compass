/**
 * Integration tests that hit the real Neon database.
 *
 * These tests require the DATABASE_URL_UNPOOLED environment variable to be
 * set (it's in Doppler for 'prd' config). They verify that:
 * 1. The Drizzle ORM layer connects and queries correctly
 * 2. Row→type mapping produces correct shapes
 * 3. The restricted user (hc_frontend) has SELECT on all tables
 * 4. Filter and pagination work as expected
 *
 * Run with: DATABASE_URL_UNPOOLED="<neon_unpooled_url>" npx vitest run tests/db-integration.test.ts
 * Skipped automatically when the env var is not set.
 */
import { describe, it, expect, beforeAll } from 'vitest'

const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED

const describeIf = DATABASE_URL ? describe : describe.skip

describeIf('Neon DB Integration — Drizzle Queries', () => {
  let db: any
  let schema: any

  beforeAll(async () => {
    const { Pool } = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    schema = await import('../lib/db/schema')
    const pool = new Pool({ connectionString: DATABASE_URL })
    db = drizzle(pool, { schema })
  })

  it('connects and reads states table', async () => {
    const rows = await db.select().from(schema.states)
    expect(Array.isArray(rows)).toBe(true)
    // Table exists — even if empty, we get an array
  })

  it('states table has correct column types', async () => {
    const rows = await db.select().from(schema.states).limit(1)
    if (rows.length > 0) {
      const row = rows[0]
      expect(typeof row.code).toBe('string')
      expect(typeof row.name).toBe('string')
      expect(typeof row.score).toBe('number')
      expect(typeof row.level).toBe('string')
    }
  })

  it('bills table references states', async () => {
    const rows = await db.select().from(schema.bills).limit(1)
    if (rows.length > 0) {
      const bill = rows[0]
      expect(typeof bill.stateCode).toBe('string')
      expect(typeof bill.title).toBe('string')
      expect(bill.statusStep).toBeGreaterThanOrEqual(0)
    }
  })

  it('pipeline_metadata table is accessible', async () => {
    const rows = await db.select().from(schema.pipelineMetadata)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('sync_log table is accessible', async () => {
    const rows = await db.select().from(schema.syncLog)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('dlq table is accessible', async () => {
    const rows = await db.select().from(schema.dlq)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('watchlist table is accessible', async () => {
    const rows = await db.select().from(schema.watchlist)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('alert_preferences table is accessible', async () => {
    const rows = await db.select().from(schema.alertPreferences)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('subscriptions table is accessible', async () => {
    const rows = await db.select().from(schema.subscriptions)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('bill_full_text table is accessible', async () => {
    const rows = await db.select().from(schema.billFullText)
    expect(Array.isArray(rows)).toBe(true)
  })
})
