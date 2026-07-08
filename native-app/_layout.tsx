import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useEffect(() => {
    console.log('[native] RootLayout mounted; hiding splash screen');
    SplashScreen.hideAsync().catch((error) => {
      console.warn('[native] Failed to hide splash screen', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#08101d' },
          headerShown: false,
        }}
      />
    </SafeAreaProvider>
  );
}
