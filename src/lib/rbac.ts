import 'server-only';
import { redirect } from 'next/navigation';
import type { Session } from './auth';
import type { Role } from './constants';

/** Platform users (tenantId null) work across all firms; tenant users see one firm. */
export function isPlatform(session: Session) {
  return session.tenantId === null;
}

export function canManageTenants(session: Session) {
  return session.role === 'SUPER_ADMIN' && isPlatform(session);
}

export function canManageUsers(session: Session) {
  return session.role === 'SUPER_ADMIN' || session.role === 'FIRM_ADMIN';
}

export function canEditCases(session: Session) {
  return (['SUPER_ADMIN', 'FIRM_ADMIN', 'ATTORNEY', 'CASE_MANAGER', 'STAFF'] as Role[]).includes(session.role);
}

export function canViewBilling(session: Session) {
  return (['SUPER_ADMIN', 'EXECUTIVE', 'ACCOUNTING', 'FIRM_ADMIN'] as Role[]).includes(session.role);
}

export function canViewRevenueForecast(session: Session) {
  return session.role === 'SUPER_ADMIN';
}

export function canViewAudit(session: Session) {
  return (['SUPER_ADMIN', 'EXECUTIVE', 'FIRM_ADMIN'] as Role[]).includes(session.role);
}

export function canImport(session: Session) {
  return session.role === 'SUPER_ADMIN';
}

export function canManageConnectors(session: Session) {
  return session.role === 'SUPER_ADMIN' || session.role === 'FIRM_ADMIN';
}

/**
 * Tenant isolation: the WHERE fragment every case/tenant-data query must
 * include. Platform users may optionally narrow to one tenant; tenant users
 * are always pinned to their own tenant regardless of what was requested.
 */
export function tenantScope(session: Session, requestedTenantId?: string | null) {
  if (isPlatform(session)) {
    return requestedTenantId ? { tenantId: requestedTenantId } : {};
  }
  return { tenantId: session.tenantId! };
}

/** Guard a page behind a permission; redirects home when denied. */
export function requirePermission(session: Session, allowed: boolean) {
  if (!allowed) redirect('/app/dashboard');
}
