import type { Role } from './constants';
import type { Session } from './auth';

const DEMO_CREDENTIALS: Record<string, { password: string; session: Omit<Session, 'email'> }> = {
  'admin@nextup.demo': {
    password: 'Demo123!',
    session: {
      userId: 'demo-platform-admin',
      name: 'Platform Admin',
      role: 'SUPER_ADMIN' as Role,
      tenantId: null,
      tenantName: null,
    },
  },
  'admin@nextus.demo': {
    password: 'Demo123!',
    session: {
      userId: 'demo-platform-admin',
      name: 'Platform Admin',
      role: 'SUPER_ADMIN' as Role,
      tenantId: null,
      tenantName: null,
    },
  },
};

export function getDemoFallbackSession(email: string, password: string): Session | null {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = DEMO_CREDENTIALS[normalizedEmail];
  if (!entry || entry.password !== password) return null;
  return { email: normalizedEmail, ...entry.session };
}
