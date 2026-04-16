import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, Page } from '@/components/mobile-ui';
import { KitchenHeader } from '@/components/kitchen-header';
import { KitchenOrderCard } from '@/components/kitchen-order-card';
import { restaurantUserLogout } from '@/lib/api/auth';
import { clearKitchenAuthTokens, getKitchenRefreshToken } from '@/lib/auth-storage';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { KitchenOrder } from '@/lib/kitchen';
import { replaceRoute } from '@/lib/navigation';

export default function KitchenCompletedScreen() {
  const router = useRouter();
  const { orders, loading, error, refresh, lastUpdated } = useKitchenOrders('completed');

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
        title="Completed Pickups"
        subtitle="Quick reference for recent handoffs."
        meta={lastUpdated ? `Last update: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Last update: —'}
        onRefresh={() => void refresh()}
        onLogout={() => void handleLogout()}
      />

      <View style={styles.toolbarRow}>
        <Button title="Refresh" variant="secondary" compact onPress={() => void refresh()} />
      </View>

      {loading ? <EmptyState title="Loading completed orders..." subtitle="Fetching the completed queue." /> : null}
      {error ? <EmptyState title="Unable to load orders" subtitle={error} actionLabel="Retry" onAction={() => void refresh()} /> : null}
      {!loading && !error && !orders.length ? (
        <EmptyState title="No completed orders yet" subtitle="Completed pickups will show up here." />
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <View style={styles.list}>
          {orders.map((item) => {
            const order = item as KitchenOrder;
            return <KitchenOrderCard key={order.id} order={order} compact />;
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
});
