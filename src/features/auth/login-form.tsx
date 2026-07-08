'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  buildAuthCallbackUrl,
  buildAuthCompletePath,
  buildAuthResetPinPath,
} from './build-auth-callback-url';
import { requestPinReset } from './request-pin-reset';
import { submitUsernameAuth } from './submit-username-auth';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginForm({ nextPath = '/log-game/import' }: { nextPath?: string }) {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'idle' | 'success';
  }>({
    message: '',
    state: 'idle',
  });
  const [username, setUsername] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus({ message: '', state: 'idle' });

    try {
      const supabase = createSupabaseBrowserClient();
      const completionPath = buildAuthCompletePath(nextPath);
      const result = await submitUsernameAuth({
        client: supabase,
        email,
        emailRedirectTo: buildAuthCallbackUrl(window.location.origin, nextPath),
        fullName,
        mode,
        pin,
        username,
      });

      if (!result.ok) {
        if (result.nextMode) {
          setMode(result.nextMode);
        }

        setStatus(result.status);
        return;
      }

      if (result.action === 'awaiting-email') {
        setStatus(result.status);
        return;
      }

      window.location.assign(completionPath);
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

  async function onResetPin() {
    setStatus({ message: '', state: 'idle' });

    try {
      const supabase = createSupabaseBrowserClient();
      const result = await requestPinReset({
        client: supabase,
        email,
        emailRedirectTo: buildAuthCallbackUrl(
          window.location.origin,
          buildAuthResetPinPath(nextPath),
        ),
      });

      setStatus(result.status);
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : 'Could not send a PIN reset link right now.',
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
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Email</span>
        <input
          aria-label="Email"
          autoCapitalize="none"
          autoCorrect="off"
          className="tm-input"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      {mode === 'sign-up' ? (
        <>
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
          <p className="tm-body-copy text-xs text-stone-300">
            Your email is used for sign in and PIN recovery.
          </p>
        </>
      ) : null}
      {mode === 'sign-up' ? (
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
      ) : null}
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">6-Digit PIN</span>
        <input
          aria-label="6-Digit PIN"
          className="tm-input"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setPin(event.target.value)}
          placeholder="123456"
          required
          type="password"
          value={pin}
        />
      </label>
      <button className="tm-button-primary" type="submit">
        {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
      </button>
      {mode === 'sign-in' ? (
        <button className="tm-button-secondary" onClick={onResetPin} type="button">
          Reset PIN
        </button>
      ) : null}
      {status.state !== 'idle' ? (
        <p
          className={
            status.state === 'error' ? 'text-sm tm-text-danger' : 'text-sm tm-text-success'
          }
        >
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
