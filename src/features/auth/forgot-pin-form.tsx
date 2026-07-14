'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { emailSchema } from './username-auth';

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
      const parsedEmail = emailSchema.parse(email);
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL('/reset-pin', window.location.origin).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setMessage('Check your email for a secure PIN reset link.');
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Could not send the reset email.');
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
          autoComplete="email"
          className="tm-input"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      <button className="tm-button-primary disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Sending...' : 'Send Reset Email'}
      </button>
      {message ? (
        <p className={isError ? 'text-sm text-red-300' : 'text-sm text-green-300'}>{message}</p>
      ) : null}
    </form>
  );
}
