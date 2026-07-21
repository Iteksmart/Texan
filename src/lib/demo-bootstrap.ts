import 'server-only';
import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sourceCases from '../../prisma/seed-data/source-cases.json';
import { CHECKLIST_TEMPLATE, PROVIDER_TYPES, SOL_YEARS_BY_STATE, STATES } from './constants';

const DEMO_PASSWORD = 'Demo123!';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function rand(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function pick<T>(key: string, options: readonly T[]): T {
  return options[Math.floor(rand(key) * options.length)];
}

function checklistValue(caseNumber: string, key: string): string {
  const r = rand(`${caseNumber}:${key}`);
  if (r < 0.45) return 'Yes';
  if (r < 0.7) return 'No';
  if (r < 0.9) return 'Pending';
  return 'N/A';
}

const FIRST_NAMES = ['Maria', 'James', 'Ashley', 'David', 'Sonia', 'Marcus', 'Elena', 'Robert', 'Tina', 'Carlos', 'Angela', 'Derek', 'Priya', 'Hector', 'Naomi', 'Luis', 'Grace', 'Omar', 'Katie', 'Victor'];
const LAST_NAMES = ['Gonzalez', 'Smith', 'Johnson', 'Nguyen', 'Brown', 'Garcia', 'Lee', 'Martinez', 'Davis', 'Lopez', 'Wilson', 'Clark', 'Patel', 'Ramirez', 'Turner', 'Flores', 'Hall', 'Reyes', 'Bell', 'Cruz'];

export async function ensureDemoDatabase(db: PrismaClient, opts: { createSqliteSchema: boolean }) {
  if (opts.createSqliteSchema) await createSqliteSchema(db);

  const users = await db.user.count();
  if (users > 0) return;

  await seedDemoData(db);
}

async function createSqliteSchema(db: PrismaClient) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "Tenant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "contactName" TEXT,
      "contactEmail" TEXT,
      "phone" TEXT,
      "state" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "perCaseRate" REAL NOT NULL DEFAULT 250,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug")`,
    `CREATE TABLE IF NOT EXISTS "Connector" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
      "baseUrl" TEXT,
      "credentials" TEXT,
      "webhookSecret" TEXT NOT NULL,
      "lastSyncAt" DATETIME,
      "lastSyncResult" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "Connector_tenantId_idx" ON "Connector"("tenantId")`,
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "tenantId" TEXT,
      "title" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "lastLoginAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
    `CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId")`,
    `CREATE TABLE IF NOT EXISTS "Case" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "caseNumber" TEXT NOT NULL,
      "tenantId" TEXT NOT NULL,
      "clientName" TEXT NOT NULL,
      "clientPhone" TEXT,
      "clientEmail" TEXT,
      "caseManagerId" TEXT,
      "stage" TEXT NOT NULL DEFAULT 'Intake',
      "status" TEXT NOT NULL DEFAULT 'New',
      "priority" TEXT NOT NULL DEFAULT 'Normal',
      "openDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "nextDue" DATETIME,
      "slaDays" INTEGER NOT NULL DEFAULT 7,
      "qcScore" REAL,
      "revenueForecast" REAL NOT NULL DEFAULT 0,
      "settlementValue" REAL,
      "openIssues" INTEGER NOT NULL DEFAULT 0,
      "lienStatus" TEXT,
      "lastClientContact" DATETIME,
      "dateOfIncident" DATETIME,
      "solDate" DATETIME,
      "state" TEXT,
      "notes" TEXT,
      "closedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Case_tenantId_caseNumber_key" ON "Case"("tenantId", "caseNumber")`,
    `CREATE INDEX IF NOT EXISTS "Case_tenantId_stage_idx" ON "Case"("tenantId", "stage")`,
    `CREATE INDEX IF NOT EXISTS "Case_caseManagerId_idx" ON "Case"("caseManagerId")`,
    `CREATE TABLE IF NOT EXISTS "ChecklistItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "caseId" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "value" TEXT NOT NULL DEFAULT 'No',
      "critical" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ChecklistItem_caseId_key_key" ON "ChecklistItem"("caseId", "key")`,
    `CREATE INDEX IF NOT EXISTS "ChecklistItem_caseId_category_idx" ON "ChecklistItem"("caseId", "category")`,
    `CREATE TABLE IF NOT EXISTS "TreatmentEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "caseId" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerType" TEXT NOT NULL,
      "dosDate" DATETIME,
      "billReceived" TEXT NOT NULL DEFAULT 'No',
      "recordReceived" TEXT NOT NULL DEFAULT 'No',
      "nextApptDate" DATETIME,
      "attended" TEXT NOT NULL DEFAULT 'Pending',
      "mri" TEXT NOT NULL DEFAULT 'N/A',
      "surgeryConsult" TEXT NOT NULL DEFAULT 'N/A',
      "doneTreating" BOOLEAN NOT NULL DEFAULT false,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "TreatmentEntry_caseId_idx" ON "TreatmentEntry"("caseId")`,
    `CREATE TABLE IF NOT EXISTS "Note" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "caseId" TEXT NOT NULL,
      "authorId" TEXT,
      "authorName" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "Note_caseId_idx" ON "Note"("caseId")`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "userEmail" TEXT NOT NULL,
      "tenantId" TEXT,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entityId" TEXT,
      "details" TEXT,
      "ip" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_userEmail_createdAt_idx" ON "AuditLog"("userEmail", "createdAt")`,
  ];

  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
}

async function seedDemoData(db: PrismaClient) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const firmNames = Array.from(new Set(sourceCases.map((c: Record<string, unknown>) => c['Client'] as string)));
  const tenants = new Map<string, { id: string }>();

  for (const name of firmNames) {
    const slug = slugify(name);
    const tenant = await db.tenant.create({
      data: {
        name,
        slug,
        status: 'ACTIVE',
        contactEmail: `admin@${slug}.example.com`,
        state: pick(`state:${name}`, STATES.slice(0, 6)),
        perCaseRate: 200 + Math.floor(rand(`rate:${name}`) * 6) * 25,
      },
    });
    tenants.set(name, tenant);
  }

  await db.user.create({ data: { email: 'admin@nextus.demo', name: 'Platform Admin', role: 'SUPER_ADMIN', passwordHash } });
  await db.user.create({ data: { email: 'exec@nextus.demo', name: 'Alex Rivera', role: 'EXECUTIVE', title: 'COO', passwordHash } });
  await db.user.create({ data: { email: 'accounting@nextus.demo', name: 'Dana Wu', role: 'ACCOUNTING', title: 'Controller', passwordHash } });

  const managerNames = ['Richelle Bauman', 'Jacqueline Maldonado', 'Sofia Martinez', 'Jordan Lee'];
  const managerByFirst = new Map<string, { id: string }>();
  for (const name of managerNames) {
    const first = name.split(' ')[0].toLowerCase();
    const user = await db.user.create({
      data: { email: `${first}@nextus.demo`, name, role: 'CASE_MANAGER', title: 'Case Manager', passwordHash },
    });
    managerByFirst.set(name.split(' ')[0], user);
  }

  for (const [name, tenant] of tenants) {
    const slug = slugify(name);
    await db.user.create({
      data: { email: `admin@${slug}.demo`, name: `${name} Admin`, role: 'FIRM_ADMIN', tenantId: tenant.id, passwordHash },
    });
    await db.user.create({
      data: { email: `attorney@${slug}.demo`, name: `${name} Attorney`, role: 'ATTORNEY', tenantId: tenant.id, passwordHash },
    });
  }

  let seededCases = 0;
  for (const src of sourceCases as Record<string, any>[]) {
    seededCases++;
    const caseNumber = src['Case ID'] as string;
    const tenant = tenants.get(src['Client'])!;
    const managerFirst = (src['Case Manager'] as string)?.split(' ')[0];
    const manager = managerByFirst.get(managerFirst);
    const state = pick(`st:${caseNumber}`, STATES.slice(0, 8));
    const openDate = src['Open Date'] ? new Date(src['Open Date']) : new Date();

    let dateOfIncident: Date | null = null;
    let solDate: Date | null = null;
    if (rand(`sol:${caseNumber}`) < 0.85) {
      dateOfIncident = new Date(openDate.getTime() - Math.floor(rand(`doi:${caseNumber}`) * 45 + 5) * 86400000);
      solDate = new Date(dateOfIncident);
      solDate.setFullYear(solDate.getFullYear() + (SOL_YEARS_BY_STATE[state] ?? 2));
      if (rand(`solrisk:${caseNumber}`) < 0.2) {
        solDate = new Date(Date.now() + Math.floor(rand(`soldays:${caseNumber}`) * 100 - 10) * 86400000);
      }
    }

    const clientName = `${pick(`fn:${caseNumber}`, FIRST_NAMES)} ${pick(`ln:${caseNumber}`, LAST_NAMES)}`;
    const created = await db.case.create({
      data: {
        caseNumber,
        tenantId: tenant.id,
        clientName,
        caseManagerId: manager?.id,
        stage: src['Stage'] ?? 'Intake',
        status: src['Status'] ?? 'New',
        priority: src['Priority'] ?? 'Normal',
        openDate,
        lastActivity: src['Last Activity'] ? new Date(src['Last Activity']) : openDate,
        nextDue: src['Next Due'] ? new Date(src['Next Due']) : null,
        slaDays: Number(src['SLA Days'] ?? 7),
        qcScore: src['QC Score'] != null ? Number(src['QC Score']) : null,
        revenueForecast: Number(src['Revenue Forecast'] ?? 0),
        settlementValue: src['Settlement Value'] ? Number(src['Settlement Value']) : null,
        openIssues: Math.floor(rand(`issues:${caseNumber}`) * 5),
        lienStatus: pick(`lien:${caseNumber}`, ['Pending', 'Verified', 'Negotiating', 'N/A'] as const),
        lastClientContact: rand(`contact:${caseNumber}`) < 0.82 ? new Date(Date.now() - Math.floor(rand(`contactDays:${caseNumber}`) * 20) * 86400000) : null,
        dateOfIncident,
        solDate,
        state,
        notes: 'Imported from TCS Nexus OMS spreadsheet (sample data).',
        checklist: {
          create: CHECKLIST_TEMPLATE.map((t, idx) => ({
            category: t.category,
            key: t.key,
            label: t.label,
            critical: t.critical,
            sortOrder: idx,
            value: checklistValue(caseNumber, t.key),
          })),
        },
      },
    });

    if (rand(`tx:${caseNumber}`) < 0.5) {
      const n = 1 + Math.floor(rand(`txn:${caseNumber}`) * 3);
      for (let t = 0; t < n; t++) {
        const done = rand(`txdone:${caseNumber}:${t}`) < 0.3;
        const dos = new Date(Date.now() - Math.floor(rand(`txdos:${caseNumber}:${t}`) * 60) * 86400000);
        await db.treatmentEntry.create({
          data: {
            caseId: created.id,
            provider: `${pick(`prov:${caseNumber}:${t}`, ['Apex', 'Lakeside', 'Summit', 'Riverside', 'Central'])} ${pick(`provt:${caseNumber}:${t}`, ['Spine & Rehab', 'Medical Group', 'Wellness Center', 'Orthopedics'])}`,
            providerType: pick(`ptype:${caseNumber}:${t}`, PROVIDER_TYPES),
            dosDate: dos,
            billReceived: pick(`bill:${caseNumber}:${t}`, ['Yes', 'No', 'Pending'] as const),
            recordReceived: pick(`rec:${caseNumber}:${t}`, ['Yes', 'No', 'Pending'] as const),
            nextApptDate: done ? null : new Date(Date.now() + Math.floor(rand(`next:${caseNumber}:${t}`) * 14) * 86400000),
            attended: pick(`att:${caseNumber}:${t}`, ['Yes', 'No', 'Pending'] as const),
            mri: pick(`mri:${caseNumber}:${t}`, ['Yes', 'No', 'N/A'] as const),
            surgeryConsult: pick(`surg:${caseNumber}:${t}`, ['Yes', 'No', 'N/A'] as const),
            doneTreating: done,
          },
        });
      }
    }

    await db.note.create({
      data: {
        caseId: created.id,
        authorName: manager ? managerNames.find((m) => m.startsWith(managerFirst))! : 'System',
        authorId: manager?.id,
        body: 'File opened and imported from spreadsheet. Initial review pending.',
      },
    });
  }

  await db.auditLog.create({
    data: {
      userEmail: 'system',
      action: 'SEED',
      entity: 'Database',
      details: JSON.stringify({ tenants: tenants.size, cases: seededCases, runtime: 'vercel-sqlite-demo' }),
    },
  });
}
