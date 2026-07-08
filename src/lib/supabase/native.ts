import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

const publicEnv = getPublicEnv();

export const nativeSupabase = createClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
      persistSession: true,
    },
  },
);

let didRegisterAppStateListener = false;

export function ensureNativeSupabaseAutoRefresh() {
  if (Platform.OS === 'web' || didRegisterAppStateListener) {
    return;
  }

  didRegisterAppStateListener = true;

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      nativeSupabase.auth.startAutoRefresh();
      return;
    }

    nativeSupabase.auth.stopAutoRefresh();
  });
}

ensureNativeSupabaseAutoRefresh();
