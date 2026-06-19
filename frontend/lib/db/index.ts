import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

/**
 * Shared pg Pool for app queries via Drizzle. Managed Neon Auth owns the
 * `neon_auth` schema and its own connection; our app tables live in `public`
 * and are queried here. There is no RLS — every user-data query MUST be scoped
 * by userId (see lib/auth.ts getUserId()).
 */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })
