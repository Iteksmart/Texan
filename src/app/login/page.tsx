import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'Client/Firm Portal | Texan Core Solutions' };

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>
          Texan <span className="liquid-neon-text">NextUp</span>
        </h1>
        <div className="sub">Sign in to your firm&apos;s secure NextUS portal</div>
        <LoginForm />
        <div className="demo-creds">
          <Link href="/">Back to Texan Core Solutions</Link>
        </div>
      </div>
    </div>
  );
}
