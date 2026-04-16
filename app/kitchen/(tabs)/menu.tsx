import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Page, SectionTitle } from '@/components/mobile-ui';
import { KitchenHeader } from '@/components/kitchen-header';
import { restaurantUserLogout } from '@/lib/api/auth';
import { fetchKitchenMenuItems, toggleKitchenMenuItemAvailability } from '@/lib/api/kitchen-menu';
import { clearKitchenAuthTokens, getKitchenRefreshToken, getKitchenRestaurantId } from '@/lib/auth-storage';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { mockRestaurants } from '@/lib/mock-data';
import { replaceRoute, pushRoute } from '@/lib/navigation';

export default function KitchenMenuScreen() {
  const router = useRouter();
  const restaurantId = getKitchenRestaurantId() || String(mockRestaurants[0]?.id || '');
  const { data, loading, error, refresh } = useAsyncFetch(() => fetchKitchenMenuItems(restaurantId), [restaurantId]);
  const [togglingId, setTogglingId] = useState('');

  const items = useMemo(() => {
    const rawItems = (data as { items?: Record<string, unknown>[] } | null)?.items || [];
    return rawItems.map((item) => ({
      id: String(item.id),
      name: String(item.name || 'Item'),
      description: String(item.description || ''),
      price: Number(item.price || 0),
      isAvailable: Boolean(item.is_available ?? item.isAvailable ?? true),
    }));
  }, [data]);

  const restaurant = (data as { restaurant?: Record<string, unknown> } | null)?.restaurant || null;

  const handleLogout = async () => {
    const refreshToken = getKitchenRefreshToken();
    try {
      if (refreshToken) {
        await restaurantUserLogout(refreshToken);
      }
    } catch (error) {
      console.warn('Failed to notify server about kitchen logout', error);
    } finally {
      clearKitchenAuthTokens();
      replaceRoute(router, '/kitchen/login');
    }
  };

  const handleToggleAvailability = async (menuItemId: string, nextValue: boolean) => {
    setTogglingId(menuItemId);
    try {
      await toggleKitchenMenuItemAvailability(menuItemId, { is_available: nextValue });
      await refresh();
    } catch (err) {
      console.warn('Unable to update menu item', err);
    } finally {
      setTogglingId('');
    }
  };

  return (
    <Page>
      <KitchenHeader
        restaurantName={String((restaurant as Record<string, unknown> | null)?.name || 'Go2Pik Kitchen')}
        title="Menu"
        subtitle="Quick menu maintenance from a phone-sized view."
        meta={`Restaurant ID: ${restaurantId || 'unassigned'}`}
        onRefresh={() => void refresh()}
        onLogout={() => void handleLogout()}
      />

      <View style={styles.toolbarRow}>
        <Button title="New user" variant="ghost" compact onPress={() => pushRoute(router, '/kitchen/users/new')} />
        <Button title="Refresh" variant="secondary" compact onPress={() => void refresh()} />
      </View>

      {loading ? <EmptyState title="Loading menu..." subtitle="Fetching kitchen menu items." /> : null}
      {error ? <EmptyState title="Unable to load menu" subtitle={error} actionLabel="Retry" onAction={() => void refresh()} /> : null}

      {!loading && !error && !items.length ? (
        <EmptyState
          title="No menu items found"
          subtitle="The kitchen API may be empty, so the screen will use live data if available."
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <Card>
          <SectionTitle eyebrow="Menu items" title="Toggle availability" subtitle="Use this as a light-weight mobile menu manager." />
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View style={styles.menuItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.description || 'No description available.'}</Text>
                  <Text style={styles.itemMeta}>{item.isAvailable ? 'Available' : 'Unavailable'}</Text>
                </View>
                <Button
                  title={item.isAvailable ? 'Hide' : 'Show'}
                  variant={item.isAvailable ? 'secondary' : 'primary'}
                  compact
                  loading={togglingId === item.id}
                  onPress={() => void handleToggleAvailability(item.id, !item.isAvailable)}
                />
              </View>
            )}
          />
        </Card>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  toolbarRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  menuItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  itemName: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 15,
  },
  itemMeta: {
    color: '#9fb1ca',
    marginTop: 4,
  },
});
