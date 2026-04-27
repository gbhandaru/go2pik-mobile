import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Notice, Page, SectionTitle } from '@/components/mobile-ui';
import { consumeAuthNotice } from '@/lib/auth-storage';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { pushRoute, replaceRoute } from '@/lib/navigation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error, isAuthenticated, continueAsGuest } = useCustomerAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    setSessionNotice(consumeAuthNotice());
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      replaceRoute(router, '/home');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit() {
    setLocalError('');
    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
      replaceRoute(router, '/home');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  }

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Customer access" title="Sign in" subtitle="Track orders and reorder faster from your phone." />
        {sessionNotice ? <Notice label={sessionNotice} tone="warning" /> : null}
        <Field
          label="Email"
          value={form.email}
          onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
        />
        {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}
        <Button title={loading ? 'Signing in…' : 'Sign in'} onPress={() => void handleSubmit()} loading={loading} />
        <Button
          title="Continue as guest"
          variant="ghost"
          onPress={() => {
            continueAsGuest();
            replaceRoute(router, '/home');
          }}
        />
        <View style={styles.linksRow}>
          <Button title="Forgot password" variant="secondary" compact onPress={() => pushRoute(router, '/password-update')} />
          <Button title="Create account" variant="ghost" compact onPress={() => pushRoute(router, '/signup')} />
        </View>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#ef4444',
    fontWeight: '700',
  },
  linksRow: {
    gap: 10,
  },
});
