'use client';

import { useState } from 'react';

type PinResetEndpointResult = {
  ok: boolean;
  status?: {
    message: string;
    state: 'error' | 'success';
  };
};

const GENERIC_SUCCESS_MESSAGE =
  'If that username or email is registered, a recovery link has been sent.';

export function ForgotPinForm() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/auth/request-pin-reset', {
        body: JSON.stringify({
          nextPath: '/profile',
          username,
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });
      const result = (await response.json()) as PinResetEndpointResult;

      if (!response.ok || !result.ok) {
        setIsError(true);
        setMessage(result.status?.message ?? 'Could not request a PIN reset.');
        return;
      }

      setIsError(result.status?.state === 'error');
      setMessage(result.status?.message ?? GENERIC_SUCCESS_MESSAGE);
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
        <span className="tm-data-label">Username or Email</span>
        <input
          aria-label="Username or Email"
          autoCapitalize="none"
          autoCorrect="off"
          className="tm-input"
          onChange={(event) => setUsername(event.target.value)}
          required
          type="text"
          value={username}
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
        <p
          className={
            isError ? 'text-sm tm-text-danger' : 'text-sm text-green-300'
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
