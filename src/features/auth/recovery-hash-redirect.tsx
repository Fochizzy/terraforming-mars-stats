'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function RecoveryHashRedirect() {
  useEffect(() => {
    async function recoverSession() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;

      if (!hash) {
        return;
      }

      const params = new URLSearchParams(hash);
      const recoveryType = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const errorDescription = params.get('error_description');

      if (errorDescription) {
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('error', errorDescription);
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
        window.location.replace(loginUrl.toString());
        return;
      }

      if (recoveryType !== 'recovery' || !accessToken || !refreshToken) {
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      window.history.replaceState({}, '', window.location.pathname + window.location.search);

      if (error) {
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('error', 'recovery_session');
        window.location.replace(loginUrl.toString());
        return;
      }

      window.location.replace('/reset-pin');
    }

    void recoverSession();
  }, []);

  return null;
}
