// Runs before every build. When a PostgreSQL connection string is configured
// (e.g. a Neon/Postgres database attached to the Vercel project), switch the
// Prisma datasource provider to postgresql and create/update the tables with
// `prisma db push`. Without one, the schema stays on sqlite and the app runs
// in self-seeding demo mode.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  '';

if (/^postgres(ql)?:\/\//i.test(url)) {
  const schemaPath = fileURLToPath(new URL('../prisma/schema.prisma', import.meta.url));
  const schema = readFileSync(schemaPath, 'utf8');
  if (schema.includes('provider = "sqlite"')) {
    writeFileSync(schemaPath, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
    console.log('prepare-db: PostgreSQL detected - Prisma provider set to postgresql');
  }
  console.log('prepare-db: creating/updating tables with prisma db push');
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
} else {
  console.log('prepare-db: no PostgreSQL connection string - keeping sqlite demo mode');
}
