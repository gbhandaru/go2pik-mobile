import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Field, Notice, Page, SectionTitle } from '@/components/mobile-ui';
import { consumeKitchenAuthNotice, storeKitchenAuthTokens } from '@/lib/auth-storage';
import { restaurantUserLogin } from '@/lib/api/auth';
import { pushRoute, replaceRoute } from '@/lib/navigation';

export default function KitchenLoginScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    setSessionNotice(consumeKitchenAuthNotice());
  }, []);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const response = await restaurantUserLogin(form);
      storeKitchenAuthTokens({
        accessToken: response?.access_token,
        refreshToken: response?.refresh_token,
        profile: response?.user,
      });
      replaceRoute(router, '/kitchen/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Kitchen access" title="Sign in" subtitle="For restaurant teams managing pickup orders." />
        {sessionNotice ? <Notice label={sessionNotice} tone="warning" /> : null}
        <Field label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} placeholder="chef@restaurant.com" keyboardType="email-address" />
        <Field label="Password" value={form.password} onChangeText={(password) => setForm((prev) => ({ ...prev, password }))} placeholder="••••••••" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={loading ? 'Signing in…' : 'Sign in'} onPress={() => void handleSubmit()} loading={loading} />
        <Button title="Create restaurant user" variant="ghost" onPress={() => pushRoute(router, '/kitchen/users/new')} />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
