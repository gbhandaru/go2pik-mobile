import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Notice, Page, SectionTitle } from '@/components/mobile-ui';
import { createRestaurantUser } from '@/lib/api/auth';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { replaceRoute } from '@/lib/navigation';

const INITIAL_FORM = {
  restaurantId: '',
  full_name: '',
  email: '',
  password: '',
  phone: '',
};

export default function KitchenCreateUserScreen() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { data: restaurantsData, loading: restaurantsLoading, error: restaurantsError } = useAsyncFetch(fetchRestaurants, [reloadKey]);

  const restaurants = useMemo(() => (Array.isArray(restaurantsData) ? restaurantsData : []), [restaurantsData]);
  const filteredRestaurants = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return restaurants;
    return restaurants.filter((restaurant) =>
      [restaurant.id, restaurant.name, restaurant.cuisine, restaurant.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [restaurants, search]);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await createRestaurantUser(form.restaurantId.trim(), {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role: 'staff',
      });
      setSuccess('Restaurant user created. They can sign in now.');
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create restaurant user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Kitchen access" title="Create restaurant user" subtitle="Add a staff account for kitchen access." />
        <Field label="Search restaurants" value={search} onChangeText={setSearch} placeholder="Name or ID" />
        <Field label="Selected restaurant ID" value={form.restaurantId} onChangeText={(restaurantId) => setForm((prev) => ({ ...prev, restaurantId }))} placeholder="Select a restaurant below" />
        {restaurantsError ? <Notice label={String(restaurantsError)} tone="danger" /> : null}
        {success ? <Notice label={success} tone="success" /> : null}
        {error ? <Notice label={error} tone="danger" /> : null}
        <FlatList
          data={filteredRestaurants}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable style={[styles.restaurantChoice, form.restaurantId === String(item.id) && styles.restaurantChoiceActive]} onPress={() => setForm((prev) => ({ ...prev, restaurantId: String(item.id) }))}>
              <Text style={styles.restaurantChoiceTitle}>#{item.id} {item.name}</Text>
              <Text style={styles.restaurantChoiceMeta}>{item.cuisine}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.muted}>{restaurantsLoading ? 'Loading restaurants…' : 'No restaurants matched the search.'}</Text>}
        />
        <Field label="Full name" value={form.full_name} onChangeText={(full_name) => setForm((prev) => ({ ...prev, full_name }))} placeholder="Sushi Manager" />
        <Field label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} placeholder="manager@sushi.com" keyboardType="email-address" />
        <Field label="Password" value={form.password} onChangeText={(password) => setForm((prev) => ({ ...prev, password }))} placeholder="••••••••" secureTextEntry />
        <Field label="Phone" value={form.phone} onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))} placeholder="555-123-4567" keyboardType="phone-pad" />
        <Button title={loading ? 'Creating…' : 'Create user'} onPress={() => void handleSubmit()} loading={loading} />
        <Button title="Back to kitchen login" variant="ghost" onPress={() => replaceRoute(router, '/kitchen/login')} />
        <Button title="Retry restaurants" variant="secondary" onPress={() => setReloadKey((value) => value + 1)} />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  restaurantChoice: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#172338',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.14)',
  },
  restaurantChoiceActive: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  restaurantChoiceTitle: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  restaurantChoiceMeta: {
    color: '#9fb1ca',
    marginTop: 2,
  },
  muted: {
    color: '#9fb1ca',
  },
});
