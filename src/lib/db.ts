import { PrismaClient } from '@prisma/client';
import { ensureSqliteDemoDatabase } from './demo-bootstrap';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  sqliteDemoReady?: Promise<void>;
  sqliteDemoState?: 'idle' | 'ensuring';
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

if ((process.env.DATABASE_URL ?? '').startsWith('file:')) {
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
