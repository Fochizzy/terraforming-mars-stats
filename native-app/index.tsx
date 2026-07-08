import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { nativeSupabase } from '@/lib/supabase/native';

export default function IndexRoute() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function routeToInitialScreen() {
      const {
        data: { session },
      } = await nativeSupabase.auth.getSession();

      if (!isActive) {
        return;
      }

      router.replace(session ? '/ready' : '/auth');
    }

    routeToInitialScreen();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <View style={styles.shell}>
      <ActivityIndicator color="#f59e0b" size="large" />
      <Text style={styles.label}>Loading native route shell...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: '#08101d',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 16,
  },
});
