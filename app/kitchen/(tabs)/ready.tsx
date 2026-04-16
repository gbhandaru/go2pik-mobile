import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Page } from '@/components/mobile-ui';
import { KitchenHeader } from '@/components/kitchen-header';
import { KitchenOrderCard } from '@/components/kitchen-order-card';
import { restaurantUserLogout } from '@/lib/api/auth';
import { updateOrderStatus } from '@/lib/api/orders';
import { clearKitchenAuthTokens, getKitchenRefreshToken } from '@/lib/auth-storage';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { KitchenOrder } from '@/lib/kitchen';
import { replaceRoute } from '@/lib/navigation';

export default function KitchenReadyScreen() {
  const router = useRouter();
  const { orders, loading, error, refresh, lastUpdated } = useKitchenOrders('ready_for_pickup');
  const [updatingId, setUpdatingId] = useState('');
  const [actionError, setActionError] = useState('');

  const handleComplete = async (order: KitchenOrder) => {
    setActionError('');
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, 'completed');
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update order');
    } finally {
      setUpdatingId('');
    }
  };

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

  return (
    <Page>
      <KitchenHeader
        restaurantName="Go2Pik Kitchen"
        title="Ready for Pickup"
        subtitle="Bagged orders that just need a final scan."
        meta={lastUpdated ? `Last update: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Last update: —'}
        onRefresh={() => void refresh()}
        onLogout={() => void handleLogout()}
      />

      <View style={styles.toolbarRow}>
        <Button title="Refresh" variant="secondary" compact onPress={() => void refresh()} />
      </View>

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      {loading ? <EmptyState title="Loading ready orders..." subtitle="Fetching the ready queue." /> : null}
      {error ? <EmptyState title="Unable to load orders" subtitle={error} actionLabel="Retry" onAction={() => void refresh()} /> : null}
      {!loading && !error && !orders.length ? (
        <EmptyState title="No ready-for-pickup orders" subtitle="Orders will appear here when they are bagged." />
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <View style={styles.list}>
          {orders.map((item) => {
            const order = item as KitchenOrder;
            return (
              <KitchenOrderCard
                key={order.id}
                order={order}
                actionLoading={updatingId === order.id}
                actions={[{ label: 'Complete pickup', status: 'completed', onPress: () => void handleComplete(order) }]}
              />
            );
          })}
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  toolbarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    gap: 12,
  },
  error: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
