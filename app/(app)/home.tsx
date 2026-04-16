import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Page, SectionTitle } from '@/components/mobile-ui';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { formatCurrency } from '@/lib/format';
import { formatRestaurantAddress } from '@/lib/restaurant';
import { pushRoute } from '@/lib/navigation';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { logout, user } = useCustomerAuth();
  const { data: restaurants = [], loading } = useAsyncFetch(fetchRestaurants, []);
  const visibleRestaurants = useMemo(() => (Array.isArray(restaurants) ? restaurants : []), [restaurants]);

  return (
    <Page>
      <Card style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.eyebrow}>Available near you</Text>
            <Text style={styles.title}>Order ahead from nearby restaurants.</Text>
          </View>
          <Chip label={user ? 'Signed in' : 'Guest'} />
        </View>
        <Text style={styles.subtitle}>Pickup only. No hidden fees. Built for the phone you already have in your hand.</Text>
        <View style={styles.heroActions}>
          <Button title="Browse Restaurants" onPress={() => pushRoute(router, '/home')} />
          <Button title="Sign out" variant="ghost" onPress={() => void logout()} />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Nearby" title="Open now" subtitle="Tap a restaurant to open its menu." />
        {loading ? <Text style={styles.muted}>Loading restaurants...</Text> : null}
        <FlatList
          data={visibleRestaurants}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => pushRoute(router, `/restaurants/${item.id}`)} style={styles.restaurantCard}>
              <Image source={{ uri: item.heroImage }} style={styles.restaurantImage} />
              <View style={styles.restaurantBody}>
                <View style={styles.restaurantHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.restaurantName}>{item.name}</Text>
                    <Text style={styles.restaurantMeta}>{item.cuisine}</Text>
                  </View>
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingText}>★ {item.rating?.toFixed(1) || '4.8'}</Text>
                  </View>
                </View>
                <Text style={styles.restaurantMeta}>{item.eta || 'Pickup in 15-20 min'}</Text>
                <Text style={styles.address}>{formatRestaurantAddress(item as never)}</Text>
                <View style={styles.menuPreview}>
                  {item.menu.slice(0, 2).map((menuItem: { id: string; name: string; price: number }) => (
                    <View key={menuItem.id} style={styles.menuPreviewRow}>
                      <Text style={styles.menuPreviewName}>{menuItem.name}</Text>
                      <Text style={styles.menuPreviewPrice}>{formatCurrency(menuItem.price)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No restaurants available"
                subtitle="The API did not return any restaurants."
              />
            ) : null
          }
        />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: '#fed7aa',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: '#9fb1ca',
    lineHeight: 21,
  },
  heroActions: {
    gap: 10,
  },
  muted: {
    color: '#9fb1ca',
  },
  restaurantCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#172338',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.14)',
  },
  restaurantImage: {
    width: '100%',
    height: 180,
  },
  restaurantBody: {
    padding: 14,
    gap: 8,
  },
  restaurantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  restaurantName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  restaurantMeta: {
    color: '#9fb1ca',
  },
  address: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  ratingPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  ratingText: {
    color: '#fed7aa',
    fontWeight: '800',
  },
  menuPreview: {
    gap: 8,
  },
  menuPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuPreviewName: {
    flex: 1,
    color: '#f8fafc',
    fontWeight: '600',
  },
  menuPreviewPrice: {
    color: '#fed7aa',
    fontWeight: '700',
  },
});
