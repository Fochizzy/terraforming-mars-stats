'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { normalizeNextPath } from './build-auth-callback-url';
import { pinSchema } from './username-auth';

export function ResetPinForm({ nextPath = '/profile' }: { nextPath?: string }) {
  const [confirmPin, setConfirmPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'idle';
  }>({
    message: '',
    state: 'idle',
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus({ message: '', state: 'idle' });

    try {
      const parsedPin = pinSchema.parse(newPin);

      if (parsedPin !== confirmPin) {
        setStatus({
          message: 'PIN values must match.',
          state: 'error',
        });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: parsedPin,
      });

      if (error) {
        setStatus({
          message: error.message?.trim() || 'Could not update your PIN right now.',
          state: 'error',
        });
        return;
      }

      window.location.assign(normalizeNextPath(nextPath));
    } catch (error) {
      setStatus({
        message:
          error instanceof Error ? error.message : 'Could not update your PIN right now.',
        state: 'error',
      });
    }
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">New 6-Digit PIN</span>
        <input
          aria-label="New 6-Digit PIN"
          className="tm-input"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setNewPin(event.target.value)}
          placeholder="123456"
          required
          type="password"
          value={newPin}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Confirm 6-Digit PIN</span>
        <input
          aria-label="Confirm 6-Digit PIN"
          className="tm-input"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setConfirmPin(event.target.value)}
          placeholder="123456"
          required
          type="password"
          value={confirmPin}
        />
      </label>
      <button className="tm-button-primary" type="submit">
        Update PIN
      </button>
      {status.state === 'error' ? (
        <p className="text-sm tm-text-danger">{status.message}</p>
      ) : null}
    </form>
  );
}

