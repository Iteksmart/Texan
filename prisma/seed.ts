// Seeds the database from the TCS Nexus OMS spreadsheet extract:
// 5 law-firm tenants, platform + firm users, 50 cases with checklists and
// treatment entries. Idempotent-ish: wipes and re-creates demo data.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sourceCases from './seed-data/source-cases.json';
import { CHECKLIST_TEMPLATE, PROVIDER_TYPES, SOL_YEARS_BY_STATE, STATES } from '../src/lib/constants';

const db = new PrismaClient();

const DEMO_PASSWORD = 'Demo123!';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// deterministic pseudo-random 0..1 from a string (keeps seeds stable)
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

async function main() {
  console.log('Seeding NextUS CSM demo data...');

  // wipe (dev/demo only)
  await db.auditLog.deleteMany();
  await db.note.deleteMany();
  await db.treatmentEntry.deleteMany();
  await db.checklistItem.deleteMany();
  await db.case.deleteMany();
  await db.connector.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ---- tenants (law firms) ----
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

  // ---- platform users (case management company staff) ----
  await db.user.create({
    data: { email: 'admin@nextus.demo', name: 'Platform Admin', role: 'SUPER_ADMIN', passwordHash },
  });
  await db.user.create({
    data: { email: 'exec@nextus.demo', name: 'Alex Rivera', role: 'EXECUTIVE', title: 'COO', passwordHash },
  });
  await db.user.create({
    data: { email: 'accounting@nextus.demo', name: 'Dana Wu', role: 'ACCOUNTING', title: 'Controller', passwordHash },
  });

  const managerNames = ['Richelle Bauman', 'Jacqueline Maldonado', 'Annette Soto', 'Rafael Ortiz', 'Oscar Pena'];
  const managerByFirst = new Map<string, { id: string }>();
  for (const name of managerNames) {
    const first = name.split(' ')[0].toLowerCase();
    const user = await db.user.create({
      data: { email: `${first}@nextus.demo`, name, role: 'CASE_MANAGER', title: 'Case Manager', passwordHash },
    });
    managerByFirst.set(name.split(' ')[0], user);
  }

  // ---- firm users (one admin + one attorney per firm) ----
  for (const [name, tenant] of tenants) {
    const slug = slugify(name);
    await db.user.create({
      data: {
        email: `admin@${slug}.demo`, name: `${name} Admin`, role: 'FIRM_ADMIN',
        tenantId: tenant.id, passwordHash,
      },
    });
    await db.user.create({
      data: {
        email: `attorney@${slug}.demo`, name: `${name} Attorney`, role: 'ATTORNEY',
        tenantId: tenant.id, passwordHash,
      },
    });
  }

  // ---- cases from the spreadsheet Source Data ----
  let i = 0;
  for (const src of sourceCases as Record<string, any>[]) {
    i++;
    const caseNumber = src['Case ID'] as string;
    const tenant = tenants.get(src['Client'])!;
    const managerFirst = (src['Case Manager'] as string)?.split(' ')[0];
    const manager = managerByFirst.get(managerFirst);
    const state = pick(`st:${caseNumber}`, STATES.slice(0, 8));
    const openDate = src['Open Date'] ? new Date(src['Open Date']) : new Date();

    // ~85% of cases get an incident date + SOL; the rest trigger "Missing SOL" alerts
    let dateOfIncident: Date | null = null;
    let solDate: Date | null = null;
    if (rand(`sol:${caseNumber}`) < 0.85) {
      dateOfIncident = new Date(openDate.getTime() - Math.floor(rand(`doi:${caseNumber}`) * 45 + 5) * 86400000);
      solDate = new Date(dateOfIncident);
      solDate.setFullYear(solDate.getFullYear() + (SOL_YEARS_BY_STATE[state] ?? 2));
      // pull a few SOLs close-in so the SOL risk dashboard has data
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
        settlementValue: src['Settlement Value'] != null ? Number(src['Settlement Value']) : null,
        openIssues: Number(src['Open Issues'] ?? 0),
        lienStatus: src['Lien Status'] ?? null,
        lastClientContact: src['Client Contact'] ? new Date(src['Client Contact']) : null,
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

    // treatment entries for ~half the cases
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

    // a welcome note
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
      details: JSON.stringify({ tenants: tenants.size, cases: i }),
    },
  });

  console.log(`Seeded ${tenants.size} tenants, ${i} cases.`);
  console.log(`\nDemo logins (password: ${DEMO_PASSWORD})`);
  console.log('  Platform admin:  admin@nextus.demo');
  console.log('  Executive:       exec@nextus.demo');
  console.log('  Case manager:    richelle@nextus.demo');
  console.log('  Accounting:      accounting@nextus.demo');
  console.log('  Firm admin:      admin@carlson-law-firm.demo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
