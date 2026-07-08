import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secretsMatch } from '@/lib/connectors/crypto';
import { coerceNormalizedCase, upsertNormalizedCases } from '@/lib/connectors/normalize';

export const dynamic = 'force-dynamic';

// Universal inbound webhook: the external system (Clio webhook, Salesforce
// flow, CASEpeer automation, Zapier/Make, custom script) POSTs JSON here.
//
//   POST /api/connectors/<connectorId>
//   Header: X-NextUS-Token: <webhook secret>
//   Body:   { "cases": [ { caseNumber, clientName, status, ... }, ... ] }
//           or a single case object.
//
// Data always lands in the connector's own tenant — a webhook can never
// write into another firm.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const connector = await db.connector.findUnique({ where: { id: params.id } });
  if (!connector) return NextResponse.json({ error: 'Unknown connector' }, { status: 404 });
  if (connector.status === 'DISABLED') return NextResponse.json({ error: 'Connector disabled' }, { status: 403 });

  const token = req.headers.get('x-nextus-token') ?? '';
  if (!token || !secretsMatch(token, connector.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const rawList = Array.isArray(body)
    ? body
    : Array.isArray((body as Record<string, unknown>)?.cases)
      ? ((body as Record<string, unknown>).cases as unknown[])
      : [body];
  if (rawList.length > 1000) return NextResponse.json({ error: 'Max 1000 cases per request' }, { status: 413 });

  const items = rawList.map(coerceNormalizedCase).filter((x): x is NonNullable<typeof x> => x !== null);
  const summary = await upsertNormalizedCases(connector.tenantId, items);
  const result = `Webhook: ${summary.created} created, ${summary.updated} updated, ${rawList.length - items.length + summary.skipped} skipped`;

  await db.connector.update({
    where: { id: connector.id },
    data: { lastSyncAt: new Date(), lastSyncResult: result, status: 'ACTIVE' },
  });
  await db.auditLog.create({
    data: {
      userEmail: `connector:${connector.provider}`,
      tenantId: connector.tenantId,
      action: 'CONNECTOR_INGEST',
      entity: 'Connector',
      entityId: connector.id,
      details: JSON.stringify({ name: connector.name, ...summary }),
    },
  });

  return NextResponse.json({ ok: true, ...summary });
}

// Health probe for the integration partner
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const connector = await db.connector.findUnique({ where: { id: params.id }, select: { provider: true, status: true } });
  if (!connector) return NextResponse.json({ error: 'Unknown connector' }, { status: 404 });
  return NextResponse.json({ ok: true, provider: connector.provider, status: connector.status });
}
