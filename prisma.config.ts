




// prisma.config.ts

import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  earlyAccess: true,
  schema: path.join('src', 'prisma', 'schema.prisma'),

  datasource: {
    url: process.env.DIRECT_URL!,   // ← direct URL for db pull
  },

  migrate: {
    async adapter() {
      const pool: any = new pg.Pool({
        connectionString: process.env.DATABASE_URL!,  // ← pooler for runtime
      })
      return new PrismaPg(pool)
    }
  }
})