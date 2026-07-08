import { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nativeSupabase } from '@/lib/supabase/native';
import {
  submitUsernameAuth,
  type UsernameAuthMode,
  type UsernameAuthStatus,
} from './submit-username-auth';

const REMEMBERED_EMAIL_KEY = 'tm-stats/remembered-email';

export function NativeAuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<UsernameAuthMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<UsernameAuthStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).then((storedEmail) => {
      if (storedEmail) {
        setEmail(storedEmail);
        setRememberMe(true);
      }
    });
  }, []);

  async function onSubmit() {
    setSubmitting(true);
    setStatus(null);

    const result = await submitUsernameAuth({
      client: nativeSupabase,
      email,
      fullName,
      mode,
      pin,
      username,
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.nextMode) {
        setMode(result.nextMode);
      }

      setStatus(result.status);
      return;
    }

    if (rememberMe) {
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    if (result.action === 'awaiting-email') {
      setStatus(result.status);
      return;
    }

    router.replace('/ready');
  }

  const submitLabel = submitting
    ? mode === 'sign-in'
      ? 'Signing In...'
      : 'Creating Account...'
    : mode === 'sign-in'
      ? 'Sign In'
      : 'Create Account';

  return (
    <ImageBackground
      resizeMode="cover"
      source={require('../../../assets/mars.png')}
      style={styles.background}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardShell}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.logoWrap}>
                <Image
                  resizeMode="cover"
                  source={require('../../../assets/text.png')}
                  style={styles.logo}
                />
              </View>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setMode('sign-in')}
                  style={[
                    styles.toggleButton,
                    mode === 'sign-in'
                      ? styles.toggleButtonMuted
                      : styles.toggleButtonAccent,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      mode === 'sign-in'
                        ? styles.toggleButtonTextLight
                        : styles.toggleButtonTextDark,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('sign-up')}
                  style={[
                    styles.toggleButton,
                    mode === 'sign-up'
                      ? styles.toggleButtonAccent
                      : styles.toggleButtonMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      mode === 'sign-up'
                        ? styles.toggleButtonTextDark
                        : styles.toggleButtonTextLight,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={email}
                />
              </View>
              {mode === 'sign-up' ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    onChangeText={setFullName}
                    placeholder="First Name Last Name"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                    value={fullName}
                  />
                </View>
              ) : null}
              {mode === 'sign-up' ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setUsername}
                    placeholder="friday-mars"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                    value={username}
                  />
                </View>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>6-Digit PIN</Text>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={setPin}
                  placeholder="123456"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  style={styles.input}
                  value={pin}
                />
              </View>
              <Pressable
                onPress={() => setRememberMe((current) => !current)}
                style={styles.rememberRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe ? styles.checkboxChecked : null,
                  ]}
                />
                <Text style={styles.rememberLabel}>Remember Me</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={onSubmit}
                style={[
                  styles.submitButton,
                  submitting ? styles.submitButtonDisabled : null,
                ]}
              >
                <Text style={styles.submitButtonText}>{submitLabel}</Text>
              </Pressable>
              {status ? (
                <Text
                  style={[
                    styles.status,
                    status.state === 'error'
                      ? styles.statusError
                      : styles.statusSuccess,
                  ]}
                >
                  {status.message}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#08101d',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardShell: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: 'rgba(22, 35, 52, 0.88)',
    borderColor: '#27364d',
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  logoWrap: {
    alignSelf: 'center',
    aspectRatio: 1536 / 480,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  logo: {
    height: '100%',
    width: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  toggleButtonMuted: {
    backgroundColor: '#364255',
  },
  toggleButtonAccent: {
    backgroundColor: '#f59e0b',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButtonTextLight: {
    color: '#f8fafc',
  },
  toggleButtonTextDark: {
    color: '#08101d',
  },
  field: {
    gap: 10,
  },
  label: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#08101d',
    borderColor: '#3a475d',
    borderRadius: 18,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 18,
    minHeight: 64,
    paddingHorizontal: 18,
  },
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  checkbox: {
    backgroundColor: '#08101d',
    borderColor: '#3a475d',
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  rememberLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#08101d',
    fontSize: 18,
    fontWeight: '700',
  },
  status: {
    fontSize: 16,
    lineHeight: 24,
  },
  statusError: {
    color: '#fda4af',
  },
  statusSuccess: {
    color: '#86efac',
  },
});
