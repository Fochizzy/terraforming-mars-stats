'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type LoginStatus = 'idle' | 'sent' | 'error';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });

    setStatus(error ? 'error' : 'sent');
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <input
        required
        className="rounded-xl border border-stone-600 bg-stone-950 px-4 py-3"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
      />
      <button
        className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950"
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
