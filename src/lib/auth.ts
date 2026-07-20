import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { Role } from './constants';
import { resolveLoginEmailCandidates } from './login-email';

const COOKIE_NAME = 'nextus_session';

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? 'dev-only-secret-change-me-in-production');
}

export function idleMinutes() {
  return Number(process.env.SESSION_IDLE_MINUTES ?? 30);
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${idleMinutes()}m`)
    .sign(secret());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: idleMinutes() * 60,
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
      tenantId: (payload.tenantId as string | null) ?? null,
      tenantName: (payload.tenantName as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Use in every /app page & action. Redirects to /login when unauthenticated. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export function clientIp(): string | null {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip');
}

export async function authenticate(email: string, password: string): Promise<Session | null> {
  const candidates = resolveLoginEmailCandidates(email);

  type AuthUser = {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    tenantId: string | null;
    title: string | null;
    active: boolean;
    lastLoginAt: Date | null;
    tenant: { status: string; name: string } | null;
  };
  let user: AuthUser | null = null;

  for (const candidate of candidates) {
    user = await db.user.findUnique({
      where: { email: candidate },
      include: { tenant: true },
    });
    if (user) break;
  }

  if (!user || !user.active) return null;
  const tenant = user.tenant;
  if (tenant && tenant.status === 'SUSPENDED') return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name ?? null,
  };
}
