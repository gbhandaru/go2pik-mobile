import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Page, SegmentedControl } from '@/components/mobile-ui';
import { KitchenHeader } from '@/components/kitchen-header';
import { KitchenOrderCard } from '@/components/kitchen-order-card';
import { restaurantUserLogout } from '@/lib/api/auth';
import { updateOrderStatus } from '@/lib/api/orders';
import { clearKitchenAuthTokens, getKitchenRefreshToken } from '@/lib/auth-storage';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { KitchenOrder } from '@/lib/kitchen';
import { pushRoute, replaceRoute } from '@/lib/navigation';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
];

const STATUS_ACTIONS: Record<string, { label: string; status: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }[]> = {
  new: [
    { label: 'Accept', status: 'accepted', variant: 'primary' },
    { label: 'Reject', status: 'rejected', variant: 'danger' },
  ],
  accepted: [{ label: 'Start preparing', status: 'preparing', variant: 'primary' }],
  preparing: [{ label: 'Mark ready', status: 'ready_for_pickup', variant: 'secondary' }],
};

export default function KitchenOrdersScreen() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState('new');
  const { orders, loading, error, refresh, lastUpdated } = useKitchenOrders(activeStatus);
  const [updatingId, setUpdatingId] = useState('');
  const [actionError, setActionError] = useState('');
  const formattedLastUpdated = useMemo(
    () => (lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'),
    [lastUpdated],
  );

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

  const handleAction = async (order: KitchenOrder, status: string) => {
    setActionError('');
    setUpdatingId(order.id);
    try {
      if (status === 'rejected') {
        const reason = 'Rejected from kitchen dashboard';
        await updateOrderStatus(order.id, status, { rejectReason: reason });
      } else {
        await updateOrderStatus(order.id, status);
      }
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update order');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <Page>
      <KitchenHeader
        restaurantName="Go2Pik Kitchen"
        title="Orders"
        subtitle="Review incoming pickup tickets and move them through the prep flow."
        meta={`Last update: ${formattedLastUpdated}`}
        onRefresh={() => void refresh()}
        onLogout={() => void handleLogout()}
      />

      <CardlessNotice text={actionError} />

      <View style={{ gap: 10 }}>
        <SegmentedControl options={STATUS_OPTIONS} value={activeStatus} onChange={setActiveStatus} />
        <View style={styles.toolbarRow}>
          <Button title="New user" variant="ghost" compact onPress={() => pushRoute(router, '/kitchen/users/new')} />
          <Button title="Refresh" variant="secondary" compact onPress={() => void refresh()} />
        </View>
      </View>

      {loading ? <EmptyState title="Loading orders..." subtitle="Fetching the current queue." /> : null}
      {error ? <EmptyState title="Unable to load orders" subtitle={error} actionLabel="Retry" onAction={() => void refresh()} /> : null}
      {!loading && !error && (!orders || orders.length === 0) ? (
        <EmptyState
          title="No orders in this queue"
          subtitle={`There are no ${activeStatus} pickup orders right now.`}
          actionLabel="Refresh"
          onAction={() => void refresh()}
        />
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <View style={styles.list}>
          {orders.map((item) => {
            const order = item as KitchenOrder;
            const actions = STATUS_ACTIONS[activeStatus] || [];
            return (
              <KitchenOrderCard
                key={order.id}
                order={order}
                actionLoading={updatingId === order.id}
                actions={actions.map((action) => ({
                  ...action,
                  onPress: () => void handleAction(order, action.status),
                }))}
              />
            );
          })}
        </View>
      ) : null}
    </Page>
  );
}

function CardlessNotice({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbarRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  list: {
    gap: 12,
  },
  notice: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  noticeText: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
