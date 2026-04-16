import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { updateCustomerPassword } from '@/lib/api/auth';
import { Button, Card, Field, Page, SectionTitle } from '@/components/mobile-ui';
import { pushRoute } from '@/lib/navigation';

export default function PasswordUpdateScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await updateCustomerPassword({
        email: form.email,
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      setMessage('Password updated. You can return to sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Account" title="Update password" subtitle="Use this screen to keep the customer account current." />
        <Field label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Current password" value={form.currentPassword} onChangeText={(currentPassword) => setForm((prev) => ({ ...prev, currentPassword }))} placeholder="Current password" secureTextEntry />
        <Field label="New password" value={form.newPassword} onChangeText={(newPassword) => setForm((prev) => ({ ...prev, newPassword }))} placeholder="New password" secureTextEntry />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={loading ? 'Updating…' : 'Update password'} onPress={() => void handleSubmit()} loading={loading} />
        <Button title="Back to login" variant="ghost" onPress={() => pushRoute(router, '/login')} />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  success: {
    color: '#22c55e',
    fontWeight: '700',
  },
  error: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
