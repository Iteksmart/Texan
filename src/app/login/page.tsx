import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'ULSS Login' };

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>ULSS</h1>
        <div className="sub">Sign in to your secure firm portal</div>
        <LoginForm />
        <div className="demo-creds">
          <Link href="https://www.united-lss.com">Back to United Legal Support Services</Link>
        </div>
      </div>
    </div>
  );
}
