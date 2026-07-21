import { PrismaClient } from '@prisma/client';
import { ensureSqliteDemoDatabase } from './demo-bootstrap';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  sqliteDemoReady?: Promise<void>;
  sqliteDemoState?: 'idle' | 'ensuring';
};

// When no DATABASE_URL is configured (e.g. a fresh Vercel project), fall back
// to a self-seeding demo database on the only writable serverless path (/tmp).
// Real deployments override this with a managed database connection string.
const databaseUrl = process.env.DATABASE_URL || 'file:/tmp/nextus-demo.db';

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

if (databaseUrl.startsWith('file:')) {
  globalForPrisma.sqliteDemoState ??= 'idle';

  db.$use(async (params, next) => {
    if (globalForPrisma.sqliteDemoState === 'ensuring') {
      return next(params);
    }

    globalForPrisma.sqliteDemoReady ??= (async () => {
      globalForPrisma.sqliteDemoState = 'ensuring';
      try {
        await ensureSqliteDemoDatabase(db);
      } finally {
        globalForPrisma.sqliteDemoState = 'idle';
      }
    })();

    await globalForPrisma.sqliteDemoReady;
    return next(params);
  });
}
