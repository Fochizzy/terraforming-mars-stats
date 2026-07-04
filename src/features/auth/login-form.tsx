'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  buildSyntheticAuthEmail,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
} from './username-auth';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginForm({ nextPath = '/log-game/import' }: { nextPath?: string }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'idle';
  }>({
    message: '',
    state: 'idle',
  });
  const [username, setUsername] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus({ message: '', state: 'idle' });

    try {
      const normalizedUsername = normalizeUsername(username);
      const parsedPin = pinSchema.parse(pin);
      const supabase = createSupabaseBrowserClient();

      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: buildSyntheticAuthEmail(normalizedUsername),
          password: parsedPin,
        });

        if (error) {
          setStatus({
            message: 'Unknown username or incorrect PIN.',
            state: 'error',
          });
          return;
        }

        window.location.assign(nextPath);
        return;
      }

      const parsedFullName = signupFullNameSchema.parse(fullName);
      const { data, error } = await supabase.auth.signUp({
        email: buildSyntheticAuthEmail(normalizedUsername),
        options: {
          data: {
            full_name: parsedFullName,
          },
        },
        password: parsedPin,
      });

      if (error || !data.user) {
        setStatus({
          message: 'That username is unavailable right now.',
          state: 'error',
        });
        return;
      }

      const { error: profileError } = await supabase.from('user_profiles').insert({
        full_name: parsedFullName,
        user_id: data.user.id,
        username: normalizedUsername,
      });

      if (profileError) {
        setStatus({
          message: 'Could not finish creating that account.',
          state: 'error',
        });
        return;
      }

      window.location.assign(nextPath);
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : 'Could not complete authentication right now.',
        state: 'error',
      });
    }
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex gap-3">
        <button
          className={
            mode === 'sign-in' ? 'tm-button-primary flex-1' : 'tm-button-secondary flex-1'
          }
          onClick={() => setMode('sign-in')}
          type="button"
        >
          Use Sign In
        </button>
        <button
          className={
            mode === 'sign-up' ? 'tm-button-primary flex-1' : 'tm-button-secondary flex-1'
          }
          onClick={() => setMode('sign-up')}
          type="button"
        >
          Use Create Account
        </button>
      </div>
      {mode === 'sign-up' ? (
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Full Name</span>
          <input
            aria-label="Full Name"
            className="tm-input"
            onChange={(event) => setFullName(event.target.value)}
            placeholder="First Name Last Name"
            required
            type="text"
            value={fullName}
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Username</span>
        <input
          aria-label="Username"
          autoCapitalize="none"
          autoCorrect="off"
          className="tm-input"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="friday-mars"
          required
          type="text"
          value={username}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">4-Digit PIN</span>
        <input
          aria-label="4-Digit PIN"
          className="tm-input"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setPin(event.target.value)}
          placeholder="1234"
          required
          type="password"
          value={pin}
        />
      </label>
      <button className="tm-button-primary" type="submit">
        {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
      </button>
      {status.state === 'error' ? (
        <p className="text-sm text-red-300">{status.message}</p>
      ) : null}
    </form>
  );
}
