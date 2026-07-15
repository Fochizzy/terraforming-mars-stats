'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function LogoutButton({ className }: { className?: string }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    setIsSigningOut(true);

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    window.location.assign('/login');
  }

  return (
    <button
      className={className}
      disabled={isSigningOut}
      onClick={handleLogout}
      type="button"
    >
      {isSigningOut ? 'Logging Out...' : 'Log Out'}
    </button>
  );
}
