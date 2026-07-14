'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { buildAuthCallbackUrl } from './build-auth-callback-url';
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
