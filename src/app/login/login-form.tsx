'use client';

import { useState } from 'react';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/login', {
      method: 'POST',
      body: formData,
    });

    if (response.redirected) {
      window.location.assign(response.url);
      return;
    }

    const payload = await response.json().catch(() => ({}));
    setError(payload.error ?? 'The sign-in service is temporarily unavailable. Please try again.');
  }

  return (
    <form onSubmit={onSubmit}>
      {error ? <div className="error-box">{error}</div> : null}
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn" type="submit" style={{ width: '100%', marginTop: 6 }}>
        Sign in
      </button>
    </form>
  );
}
