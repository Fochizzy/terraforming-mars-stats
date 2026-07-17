'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** The browser-only fragment compatibility bridge for the former insights anchor. */
export function LegacyInsightsHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.location.hash !== '#global-statistics') {
      return;
    }

    router.replace(`/insights/global${window.location.search}`);
  }, [router]);

  return null;
}
