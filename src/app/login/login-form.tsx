'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ width: '100%', marginTop: 6 }}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, undefined);
  return (
    <form action={formAction}>
      {state?.error ? <div className="error-box">{state.error}</div> : null}
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <SubmitButton />
    </form>
  );
}
