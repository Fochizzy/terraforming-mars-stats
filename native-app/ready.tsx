import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeDashboardScreen } from '@/features/native/native-dashboard-screen';
import {
  loadNativeDashboard,
  type NativeDashboardData,
} from '@/features/native/load-native-dashboard';
import { nativeSupabase } from '@/lib/supabase/native';

type ReadyState =
  | {
      state: 'error';
      message: string;
    }
  | {
      state: 'loading';
    }
  | {
      state: 'ready';
      dashboard: NativeDashboardData;
    };

export default function ReadyRoute() {
  const router = useRouter();
  const [readyState, setReadyState] = useState<ReadyState>({
    state: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const dashboard = await loadNativeDashboard();

        if (!isActive) {
          return;
        }

        if (!dashboard) {
          router.replace('/auth');
          return;
        }

        setReadyState({
          dashboard,
          state: 'ready',
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'We could not load this native dashboard right now.';

        setReadyState({
          message,
          state: 'error',
        });
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function onSignOut() {
    await nativeSupabase.auth.signOut();
    router.replace('/auth');
  }

  if (readyState.state === 'loading') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingShell}>
          <ActivityIndicator color="#f59e0b" size="large" />
          <Text style={styles.loadingTitle}>Opening your Terraforming Mars command board...</Text>
          <Text style={styles.loadingCopy}>
            Pulling personal, comparative, and global dashboards onto this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (readyState.state === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.errorShell}>
          <Text style={styles.errorEyebrow}>Dashboard Offline</Text>
          <Text style={styles.errorTitle}>Terraforming Mars native analytics hit a snag.</Text>
          <Text style={styles.errorCopy}>{readyState.message}</Text>
          <Text onPress={() => router.replace('/auth')} style={styles.errorLink}>
            Return to sign in
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <NativeDashboardScreen
        dashboard={readyState.dashboard}
        onSignOut={onSignOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorCopy: {
    color: '#d6dde8',
    fontSize: 16,
    lineHeight: 24,
  },
  errorEyebrow: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  errorLink: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
  },
  errorShell: {
    backgroundColor: '#152233',
    borderColor: '#7c2d12',
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    marginHorizontal: 24,
    marginTop: 48,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  errorTitle: {
    color: '#fff7ed',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  loadingCopy: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  loadingShell: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: '#fff7ed',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: '#070d17',
    flex: 1,
  },
});
