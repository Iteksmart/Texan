import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE_NAME = 'nextus_session';

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? 'dev-only-secret-change-me-in-production');
}

// Protects /app/*; also implements the HIPAA idle-timeout by sliding the
// short-lived session token on activity.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const loginUrl = new URL('/login', req.url);

  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const { payload } = await jwtVerify(token, secret());
    const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES ?? 30);
    const res = NextResponse.next();
    // Sliding renewal: re-sign when less than half the idle window remains.
    const remaining = (payload.exp ?? 0) * 1000 - Date.now();
    if (remaining < (idleMinutes * 60 * 1000) / 2) {
      const { exp: _exp, iat: _iat, ...claims } = payload;
      const renewed = await new SignJWT(claims)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${idleMinutes}m`)
        .sign(secret());
      res.cookies.set(COOKIE_NAME, renewed, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: idleMinutes * 60,
      });
    }
    return res;
  } catch {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ['/app/:path*'],
};
