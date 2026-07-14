'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { pinSchema } from './username-auth';

export function ResetPinForm() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      const parsedPin = pinSchema.parse(pin);
      if (parsedPin !== confirmPin) {
        throw new Error('PIN entries must match.');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Open the secure reset link from your email before changing your PIN.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: parsedPin,
      });
      if (updateError) {
        throw updateError;
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          credential_reset_required: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userData.user.id);
      if (profileError) {
        throw profileError;
      }

      setMessage('Your 6-digit PIN has been updated. Redirecting to your profile...');
      window.setTimeout(() => window.location.assign('/profile'), 800);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Could not update your PIN.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">New 6-Digit PIN</span>
        <input
          aria-label="New 6-Digit PIN"
          autoComplete="new-password"
          className="tm-input"
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          required
          type="password"
          value={pin}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Confirm 6-Digit PIN</span>
        <input
          aria-label="Confirm 6-Digit PIN"
          autoComplete="new-password"
          className="tm-input"
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
          required
          type="password"
          value={confirmPin}
        />
      </label>
      <button className="tm-button-primary disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Updating...' : 'Update PIN'}
      </button>
      {message ? (
        <p className={isError ? 'text-sm text-red-300' : 'text-sm text-green-300'}>{message}</p>
      ) : null}
    </form>
  );
}
