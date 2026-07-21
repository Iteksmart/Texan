import { LoginForm } from './login-form';

export const metadata = { title: 'United Legal Support Services Login' };

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>United Legal Support Services</h1>
        <div className="sub">Sign in to your secure firm portal</div>
        <LoginForm />
      </div>
    </div>
  );
}
