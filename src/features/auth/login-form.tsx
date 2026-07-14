'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { buildAuthCallbackUrl } from './build-auth-callback-url';
import {
  emailSchema,
  passwordSchema,
  resolveSignInEmail,
  signupFullNameSchema,
  signupUsernameSchema,
} from './username-auth';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginForm({ nextPath = '/log-game/import' }: { nextPath?: string }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'idle' | 'success';
  }>({ message: '', state: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ message: '', state: 'idle' });
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === 'sign-in') {
        const signInEmail = resolveSignInEmail(identifier);
        const { error } = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password,
        });

        if (error) {
          setStatus({
            message: 'The email/username or password/PIN was not recognized.',
            state: 'error',
          });
          return;
        }

        window.location.assign(nextPath);
        return;
      }

      const parsedFullName = signupFullNameSchema.parse(fullName);
      const parsedUsername = signupUsernameSchema.parse(username);
      const parsedEmail = emailSchema.parse(email);
      const parsedPassword = passwordSchema.parse(password);
      const emailRedirectTo = buildAuthCallbackUrl(window.location.origin, nextPath);

      const { data, error } = await supabase.auth.signUp({
        email: parsedEmail,
        options: {
          data: {
            full_name: parsedFullName,
            username: parsedUsername,
          },
          emailRedirectTo,
        },
        password: parsedPassword,
      });

      if (error || !data.user) {
        setStatus({
          message: error?.message ?? 'Could not create that account.',
          state: 'error',
        });
        return;
      }

      setStatus({
        message: `Confirmation sent to ${parsedEmail}. Open the email to activate your account.`,
        state: 'success',
      });
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : 'Could not complete authentication right now.',
        state: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex gap-3">
        <button
          className={
            mode === 'sign-in' ? 'tm-button-primary flex-1' : 'tm-button-secondary flex-1'
          }
          onClick={() => {
            setMode('sign-in');
            setStatus({ message: '', state: 'idle' });
          }}
          type="button"
        >
          Sign In
        </button>
        <button
          className={
            mode === 'sign-up' ? 'tm-button-primary flex-1' : 'tm-button-secondary flex-1'
          }
          onClick={() => {
            setMode('sign-up');
            setStatus({ message: '', state: 'idle' });
          }}
          type="button"
        >
          Create Account
        </button>
      </div>

      {mode === 'sign-up' ? (
        <>
          <label className="flex flex-col gap-2 text-sm">
            <span className="tm-data-label">Full Name</span>
            <input
              aria-label="Full Name"
              autoComplete="name"
              className="tm-input"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="First Name Last Name"
              required
              type="text"
              value={fullName}
            />
          </label>
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
            <span className="tm-data-label">Email</span>
            <input
              aria-label="Email"
              autoComplete="email"
              className="tm-input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Email or Legacy Username</span>
          <input
            aria-label="Email or Legacy Username"
            autoCapitalize="none"
            autoCorrect="off"
            className="tm-input"
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com or friday-mars"
            required
            type="text"
            value={identifier}
          />
        </label>
      )}

      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">{mode === 'sign-in' ? 'Password or Legacy PIN' : 'Password'}</span>
        <input
          aria-label={mode === 'sign-in' ? 'Password or Legacy PIN' : 'Password'}
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          className="tm-input"
          minLength={mode === 'sign-up' ? 8 : undefined}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={mode === 'sign-in' ? 'Password or 4-digit PIN' : 'At least 8 characters'}
          required
          type="password"
          value={password}
        />
      </label>

      <button className="tm-button-primary disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Processing...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
      </button>

      {mode === 'sign-in' ? (
        <a className="text-center text-sm text-sky-200 underline-offset-4 hover:underline" href="/forgot-password">
          Forgot your password?
        </a>
      ) : null}

      {status.state !== 'idle' ? (
        <p className={status.state === 'error' ? 'text-sm text-red-300' : 'text-sm text-green-300'}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
