'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { buildAuthCallbackUrl } from './build-auth-callback-url';

type LoginStatus = 'idle' | 'sent' | 'error';

export function LoginForm({ nextPath = '/profile' }: { nextPath?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(
          window.location.origin,
          nextPath,
        ),
      },
    });

    setStatus(error ? 'error' : 'sent');
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <input
        required
        className="tm-input"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
      />
      <button
        className="tm-button-primary"
        type="submit"
      >
        Email me a sign-in link
      </button>
      {status === 'sent' ? (
        <p className="text-sm text-emerald-300">
          Check your email for a magic link.
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="text-sm text-red-300">Could not send sign-in link.</p>
      ) : null}
    </form>
  );
}
