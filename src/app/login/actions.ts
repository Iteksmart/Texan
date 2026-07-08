'use server';

import { redirect } from 'next/navigation';
import { authenticate, createSession, clearSession, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Email and password are required.' };

  const session = await authenticate(email, password);
  if (!session) {
    await audit(null, 'LOGIN_FAILED', 'User', null, { email });
    return { error: 'Invalid credentials or inactive account.' };
  }
  await createSession(session);
  await audit(session, 'LOGIN', 'User', session.userId);
  redirect('/app/dashboard');
}

export async function logoutAction() {
  const session = await getSession();
  if (session) await audit(session, 'LOGOUT', 'User', session.userId);
  clearSession();
  redirect('/login');
}
