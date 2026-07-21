import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// The public marketing site has been retired; the root URL now routes
// straight to the portal.
export default async function RootPage() {
  const session = await getSession();
  redirect(session ? '/app/dashboard' : '/login');
}
