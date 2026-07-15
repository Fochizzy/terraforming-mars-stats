'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { normalizeNextPath } from './build-auth-callback-url';
import { pinSchema } from './username-auth';

type RecoveryState = 'checking' | 'error' | 'ready';

function describeRecoveryError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return 'This recovery link is invalid or has expired. Request a new PIN reset email.';
}

export function ResetPinForm({ nextPath = '/profile' }: { nextPath?: string }) {
  const supabase = useMemo(
    () => createSupabaseBrowserClient({ detectSessionInUrl: false }),
    [],
  );
  const [confirmPin, setConfirmPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recoveryState, setRecoveryState] =
    useState<RecoveryState>('checking');
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'idle';
  }>({
    message: '',
    state: 'idle',
  });

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      try {
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash,
        );

        const errorDescription = hashParams.get('error_description');

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}`,
          );
        } else {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (!data.session) {
            throw new Error(
              'This recovery link is invalid or has expired. Request a new PIN reset email.',
            );
          }
        }

        if (active) {
          setRecoveryState('ready');
        }
      } catch (error) {
        if (active) {
          setRecoveryState('error');
          setStatus({
            message: describeRecoveryError(error),
            state: 'error',
          });
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (recoveryState !== 'ready') {
      return;
    }

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

      const { error } = await supabase.auth.updateUser({
        password: parsedPin,
      });

      if (error) {
        setStatus({
          message:
            error.message?.trim() || 'Could not update your PIN right now.',
          state: 'error',
        });
        return;
      }

      window.location.assign(normalizeNextPath(nextPath));
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : 'Could not update your PIN right now.',
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

      <button
        className="tm-button-primary"
        disabled={recoveryState !== 'ready'}
        type="submit"
      >
        {recoveryState === 'checking' ? 'Verifying Link…' : 'Update PIN'}
      </button>

      {status.state === 'error' ? (
        <p className="text-sm tm-text-danger">{status.message}</p>
      ) : null}
    </form>
  );
}
