import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nativeSupabase } from '@/lib/supabase/native';

type ReadyState =
  | {
      sessionEmail: string;
      state: 'ready';
    }
  | {
      state: 'loading';
    };

export default function ReadyRoute() {
  const router = useRouter();
  const [readyState, setReadyState] = useState<ReadyState>({
    state: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      const {
        data: { session },
      } = await nativeSupabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (!session?.user) {
        router.replace('/auth');
        return;
      }

      setReadyState({
        sessionEmail: session.user.email ?? 'your account',
        state: 'ready',
      });
    }

    loadSession();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function onSignOut() {
    await nativeSupabase.auth.signOut();
    router.replace('/auth');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Native Shell Ready</Text>
          <Text style={styles.title}>Terraforming Mars Stats</Text>
          <Text style={styles.body}>
            {readyState.state === 'ready'
              ? `Signed in on this device as ${readyState.sessionEmail}. Native feature routes can branch from here next.`
              : 'Checking this device session...'}
          </Text>
          <Pressable onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#08101d',
    flex: 1,
  },
  shell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#162334',
    borderColor: '#27364d',
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  eyebrow: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 18,
    lineHeight: 28,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#364255',
    borderRadius: 22,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
});
