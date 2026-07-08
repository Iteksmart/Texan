'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { canManageConnectors } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { providerMeta } from '@/lib/connectors/registry';
import { encryptJson, newWebhookSecret } from '@/lib/connectors/crypto';
import { fetchExternalCases } from '@/lib/connectors/adapters';
import { upsertNormalizedCases } from '@/lib/connectors/normalize';

async function guard() {
  const session = await requireSession();
  if (!canManageConnectors(session)) throw new Error('Not permitted.');
  return session;
}

async function scopedConnector(session: Awaited<ReturnType<typeof guard>>, id: string) {
  const connector = await db.connector.findUnique({ where: { id } });
  if (!connector) throw new Error('Connector not found.');
  if (session.tenantId && connector.tenantId !== session.tenantId) throw new Error('Not permitted.');
  return connector;
}

export async function createConnectorAction(formData: FormData) {
  const session = await guard();
  const provider = String(formData.get('provider') ?? '');
  const meta = providerMeta(provider);
  if (!meta) throw new Error('Unknown provider.');

  const tenantId = session.tenantId ?? String(formData.get('tenantId') ?? '');
  if (!tenantId) throw new Error('A firm is required.');

  const credentials: Record<string, string> = {};
  for (const f of meta.credentialFields) {
    const v = String(formData.get(`cred_${f.key}`) ?? '').trim();
    if (v) credentials[f.key] = v;
  }

  const connector = await db.connector.create({
    data: {
      tenantId,
      provider,
      name: String(formData.get('name') ?? '') || meta.label,
      baseUrl: credentials.baseUrl ?? credentials.instanceUrl ?? null,
      credentials: Object.keys(credentials).length ? encryptJson(credentials) : null,
      webhookSecret: newWebhookSecret(),
      status: 'CONFIGURED',
    },
  });
  await audit(session, 'CONNECTOR_CREATE', 'Connector', connector.id, { provider, name: connector.name }, tenantId);
  revalidatePath('/app/admin/connectors');
}

export async function syncConnectorAction(formData: FormData) {
  const session = await guard();
  const connector = await scopedConnector(session, String(formData.get('connectorId')));

  let result: string;
  let status: string;
  try {
    const items = await fetchExternalCases(connector);
    const summary = await upsertNormalizedCases(connector.tenantId, items);
    result = `Sync: ${items.length} fetched — ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`;
    status = 'ACTIVE';
  } catch (e) {
    result = `Sync failed: ${e instanceof Error ? e.message : 'unknown error'}`.slice(0, 500);
    status = 'ERROR';
  }
  await db.connector.update({
    where: { id: connector.id },
    data: { lastSyncAt: new Date(), lastSyncResult: result, status },
  });
  await audit(session, 'CONNECTOR_SYNC', 'Connector', connector.id, { result }, connector.tenantId);
  revalidatePath('/app/admin/connectors');
}

export async function toggleConnectorAction(formData: FormData) {
  const session = await guard();
  const connector = await scopedConnector(session, String(formData.get('connectorId')));
  const next = connector.status === 'DISABLED' ? 'CONFIGURED' : 'DISABLED';
  await db.connector.update({ where: { id: connector.id }, data: { status: next } });
  await audit(session, next === 'DISABLED' ? 'CONNECTOR_DISABLE' : 'CONNECTOR_ENABLE', 'Connector', connector.id, null, connector.tenantId);
  revalidatePath('/app/admin/connectors');
}

export async function deleteConnectorAction(formData: FormData) {
  const session = await guard();
  const connector = await scopedConnector(session, String(formData.get('connectorId')));
  await db.connector.delete({ where: { id: connector.id } });
  await audit(session, 'CONNECTOR_DELETE', 'Connector', connector.id, { provider: connector.provider }, connector.tenantId);
  revalidatePath('/app/admin/connectors');
}
