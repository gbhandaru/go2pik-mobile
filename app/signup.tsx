import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Field, Page, SectionTitle } from '@/components/mobile-ui';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { pushRoute, replaceRoute } from '@/lib/navigation';

export default function SignupScreen() {
  const router = useRouter();
  const { signup, loading, error } = useCustomerAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [localError, setLocalError] = useState('');

  async function handleSubmit() {
    setLocalError('');
    try {
      await signup({
        full_name: form.fullName,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      });
      replaceRoute(router, '/home');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to create account');
    }
  }

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Customer access" title="Create account" subtitle="Register once and reuse the app for future pickup orders." />
        <Field label="Full name" value={form.fullName} onChangeText={(fullName) => setForm((prev) => ({ ...prev, fullName }))} placeholder="Jane Doe" />
        <Field label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={form.password} onChangeText={(password) => setForm((prev) => ({ ...prev, password }))} placeholder="Create a password" secureTextEntry />
        <Field label="Phone (optional)" value={form.phone} onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))} placeholder="(555) 123-4567" keyboardType="phone-pad" />
        {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}
        <Button title={loading ? 'Creating account…' : 'Create account'} onPress={() => void handleSubmit()} loading={loading} />
        <Button title="Back to login" variant="ghost" onPress={() => pushRoute(router, '/login')} />
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
