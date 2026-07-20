'use server';

import { redirect } from 'next/navigation';
import { authenticate, createSession, clearSession, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

function toSafeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected server error.';
}

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Email and password are required.' };

  try {
    console.log('loginAction:start', { email });
    const session = await authenticate(email, password);
    console.log('loginAction:authenticated', { email, hasSession: Boolean(session) });
    if (!session) {
      await audit(null, 'LOGIN_FAILED', 'User', null, { email });
      return { error: 'Invalid credentials or inactive account.' };
    }
    await createSession(session);
    console.log('loginAction:sessionCreated', { email, userId: session.userId });
    await audit(session, 'LOGIN', 'User', session.userId);
    redirect('/app/dashboard');
  } catch (error) {
    console.error('loginAction failed', error);
    await audit(null, 'LOGIN_FAILED', 'User', null, { email, error: toSafeError(error) });
    return { error: 'The sign-in service is temporarily unavailable. Please try again.' };
  }
}

export async function logoutAction() {
  const session = await getSession();
  if (session) await audit(session, 'LOGOUT', 'User', session.userId);
  clearSession();
  redirect('/login');
}
