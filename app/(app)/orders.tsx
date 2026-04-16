import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Page, SectionTitle } from '@/components/mobile-ui';
import { fetchOrders } from '@/lib/api/orders';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { formatCurrency, formatTimestamp } from '@/lib/format';
import { pushRoute } from '@/lib/navigation';

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { data: orders = [], loading, error } = useAsyncFetch(fetchOrders, []);

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Track your meals" title="Orders" subtitle="Recently placed orders and their current status." />
      </Card>

      {loading ? (
        <EmptyState title="Loading orders..." subtitle="Fetching your order history." />
      ) : error ? (
        <EmptyState title="Could not load orders" subtitle={error} actionLabel="Retry" onAction={() => pushRoute(router, '/orders')} />
      ) : null}

      {!loading && !error && (!orders || orders.length === 0) ? (
        <EmptyState
          title="No orders yet"
          subtitle="Your first pickup order will show up here."
          actionLabel="Browse restaurants"
          onAction={() => pushRoute(router, '/home')}
        />
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <FlatList
          data={orders}
          keyExtractor={(item) => String((item as { id: string }).id)}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const order = item as { id: string; restaurant?: { name?: string }; status?: string; total?: number; placedAt?: string };
            return (
              <Card style={styles.orderCard}>
                <Text style={styles.orderRestaurant}>{order.restaurant?.name || 'Unknown restaurant'}</Text>
                <Text style={styles.orderStatus}>Status: {order.status || 'pending'}</Text>
                <Text style={styles.orderTotal}>Total: {formatCurrency(order.total || 0)}</Text>
                <Text style={styles.orderMeta}>{formatTimestamp(order.placedAt)}</Text>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No orders yet"
              subtitle="Your order history is empty."
            />
          }
        />
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    gap: 8,
  },
  orderRestaurant: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  orderStatus: {
    color: '#9fb1ca',
  },
  orderTotal: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  orderMeta: {
    color: '#cbd5e1',
  },
});
