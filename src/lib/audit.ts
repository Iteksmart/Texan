import 'server-only';
import { db } from './db';
import { clientIp, type Session } from './auth';

/**
 * Append a HIPAA audit-trail entry. Fire-and-forget from actions; audit
 * failures are logged but never block the user's operation.
 */
export async function audit(
  session: Session | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: unknown,
  tenantId?: string | null,
) {
  try {
    await db.auditLog.create({
      data: {
        userId: session?.userId ?? null,
        userEmail: session?.email ?? 'anonymous',
        tenantId: tenantId ?? session?.tenantId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details).slice(0, 4000) : null,
        ip: clientIp(),
      },
    });
  } catch (err) {
    console.error('audit log write failed', err);
  }
}
