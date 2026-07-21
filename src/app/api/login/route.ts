import { NextResponse } from 'next/server';
import { authenticate, createSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const session = await authenticate(email, password);
    if (!session) {
      await audit(null, 'LOGIN_FAILED', 'User', null, { email });
      return NextResponse.json({ error: 'Invalid credentials or inactive account.' }, { status: 401 });
    }

    await createSession(session);
    await audit(session, 'LOGIN', 'User', session.userId);
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  } catch (error) {
    console.error('login API failed', error);
    return NextResponse.json({ error: 'The sign-in service is temporarily unavailable. Please try again.' }, { status: 500 });
  }
}
