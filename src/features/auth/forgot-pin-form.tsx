'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { buildAuthCallbackUrl } from './build-auth-callback-url';
import { authEmailSchema } from './username-auth';

export function ForgotPinForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      const parsedEmail = authEmailSchema.parse(email);
      const supabase = createSupabaseBrowserClient();
      const redirectTo = buildAuthCallbackUrl(
        window.location.origin,
        '/reset-pin',
      );

      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setMessage('Check your email for a secure PIN reset link.');
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not request a PIN reset.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Email</span>
        <input
          aria-label="Email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect="off"
          className="tm-input"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <button
        className="tm-button-primary disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Sending...' : 'Send PIN Reset Link'}
      </button>

      {message ? (
        <p className={isError ? 'text-sm tm-text-danger' : 'text-sm text-green-300'}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
