import { PrismaClient } from '@prisma/client';
import { ensureDemoDatabase } from './demo-bootstrap';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  demoReady?: Promise<void>;
  demoState?: 'idle' | 'ensuring';
};

// Resolution order mirrors scripts/prepare-db.mjs: an explicit DATABASE_URL,
// then the variables a Vercel-attached Postgres database provides, then the
// self-seeding demo database on the only writable serverless path (/tmp).
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  'file:/tmp/nextus-demo.db';

const isSqlite = databaseUrl.startsWith('file:');

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// First-query bootstrap: create the SQLite schema when needed (Postgres tables
// are created at build time by prepare-db), and seed demo data if the
// database is empty so a fresh deployment is immediately usable.
globalForPrisma.demoState ??= 'idle';

db.$use(async (params, next) => {
  if (globalForPrisma.demoState === 'ensuring') {
    return next(params);
  }

  globalForPrisma.demoReady ??= (async () => {
    globalForPrisma.demoState = 'ensuring';
    try {
      await ensureDemoDatabase(db, { createSqliteSchema: isSqlite });
    } finally {
      globalForPrisma.demoState = 'idle';
    }
  })();

  await globalForPrisma.demoReady;
  return next(params);
});
