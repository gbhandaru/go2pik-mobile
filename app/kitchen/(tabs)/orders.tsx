import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Page } from '@/components/mobile-ui';
import { KitchenHeader } from '@/components/kitchen-header';
import { KitchenOrderCard } from '@/components/kitchen-order-card';
import { restaurantUserLogout } from '@/lib/api/auth';
import { updateOrderStatus } from '@/lib/api/orders';
import { clearKitchenAuthTokens, getKitchenRefreshToken } from '@/lib/auth-storage';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { KitchenOrder, getKitchenAgeMinutes } from '@/lib/kitchen';
import { replaceRoute } from '@/lib/navigation';

const STATUS_TABS = [
  { value: 'new', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready_for_pickup', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_SUBTITLES: Record<string, string> = {
  new: 'Review incoming pickup tickets and accept them quickly.',
  accepted: 'Move accepted tickets onto the line and start prep.',
  preparing: 'Track orders on the line and mark them ready when bagged.',
  ready_for_pickup: 'Stage completed bags and mark pickups when guests arrive.',
  completed: 'Reference pickups completed recently for quick lookups.',
};

const EMPTY_MESSAGES: Record<string, string> = {
  new: 'No new orders',
  accepted: 'No accepted orders',
  preparing: 'No orders in preparation',
  ready_for_pickup: 'No ready-for-pickup orders',
  completed: 'No completed orders yet',
};

const STATUS_ACTIONS: Record<string, { label: string; status: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }[]> = {
  new: [
    { label: 'Accept', status: 'accepted', variant: 'primary' },
    { label: 'Reject', status: 'rejected', variant: 'danger' },
  ],
  accepted: [{ label: 'Mark Preparing', status: 'preparing', variant: 'primary' }],
  preparing: [{ label: 'Mark Ready', status: 'ready_for_pickup', variant: 'primary' }],
  ready_for_pickup: [{ label: 'Complete Order', status: 'completed', variant: 'primary' }],
  completed: [],
};

export default function KitchenOrdersScreen() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState('new');
  const { orders, loading, error, refresh, lastUpdated } = useKitchenOrders(activeStatus);
  const { refresh: refreshNew } = useKitchenOrders('new');
  const [updatingId, setUpdatingId] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState('');
  const [actionError, setActionError] = useState('');

  const formattedLastUpdated = useMemo(
    () => (lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'),
    [lastUpdated],
  );

  const visibleOrders = useMemo(() => {
    if (activeStatus !== 'new') {
      return orders;
    }

    return [...orders].sort((left, right) => getKitchenAgeMinutes(right as KitchenOrder) - getKitchenAgeMinutes(left as KitchenOrder));
  }, [activeStatus, orders]);

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

  const handleStatusChange = async (order: KitchenOrder, targetStatus: string) => {
    if (!targetStatus) return;

    setActionError('');
    setUpdatingId(order.id);
    setUpdatingStatus(targetStatus);
    try {
      const options = targetStatus === 'rejected' ? { rejectReason: 'Rejected from kitchen dashboard' } : undefined;
      await updateOrderStatus(order.id, targetStatus, options);
      await Promise.all([refresh(), refreshNew()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update order');
    } finally {
      setUpdatingId('');
      setUpdatingStatus('');
    }
  };

  return (
    <Page backgroundColor={LIGHT_BG}>
      <KitchenHeader
        restaurantName="Go2Pik"
        title="Orders"
        subtitle={STATUS_SUBTITLES[activeStatus]}
        meta={`Last update: ${formattedLastUpdated}`}
        primaryActionIcon="search"
        compact
        hideTitleBlock
        onRefresh={() => void Promise.all([refresh(), refreshNew()])}
        onLogout={() => void handleLogout()}
      />

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const active = tab.value === activeStatus;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setActiveStatus(tab.value)}
              style={styles.tabPressable}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      {actionError ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{actionError}</Text>
        </View>
      ) : null}

      {loading ? (
        <EmptyState
          title="Loading orders..."
          subtitle="Fetching the current queue."
          style={styles.emptyState}
          titleStyle={styles.emptyTitle}
          subtitleStyle={styles.emptySubtitle}
        />
      ) : null}
      {error ? (
        <EmptyState
          title="Unable to load orders"
          subtitle={error}
          actionLabel="Retry"
          onAction={() => void Promise.all([refresh(), refreshNew()])}
          style={styles.emptyState}
          titleStyle={styles.emptyTitle}
          subtitleStyle={styles.emptySubtitle}
          buttonStyle={styles.primaryButton}
          buttonTextStyle={styles.primaryButtonText}
        />
      ) : null}

      {!loading && !error && !visibleOrders.length ? (
        <EmptyState
          title={EMPTY_MESSAGES[activeStatus]}
          subtitle="Pull to refresh or wait for new kitchen traffic."
          style={styles.emptyState}
          titleStyle={styles.emptyTitle}
          subtitleStyle={styles.emptySubtitle}
        />
      ) : null}

      {!loading && !error && visibleOrders.length > 0 ? (
        <View style={styles.list}>
          {visibleOrders.map((item) => {
            const order = item as KitchenOrder;
            const actions = STATUS_ACTIONS[activeStatus] || [];
            return (
              <KitchenOrderCard
                key={order.id}
                order={order}
                actionLoading={updatingId === order.id}
                loadingActionStatus={updatingId === order.id ? updatingStatus : null}
                actions={actions.map((action) => ({
                  ...action,
                  onPress: () => void handleStatusChange(order, action.status),
                }))}
              />
            );
          })}
        </View>
      ) : null}
    </Page>
  );
}

const LIGHT_BG = '#f5f7f3';

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9e0',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 6,
    gap: 4,
  },
  tabLabel: {
    color: '#74808f',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#295638',
  },
  tabUnderline: {
    height: 1.5,
    width: '100%',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: '#4f9d69',
  },
  list: {
    gap: 10,
  },
  notice: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff4f4',
    borderWidth: 1,
    borderColor: '#f2c1c1',
  },
  noticeText: {
    color: '#c85a5a',
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderColor: '#e5eaf0',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  emptyTitle: {
    color: '#1f2937',
  },
  emptySubtitle: {
    color: '#6f7c8b',
  },
  primaryButton: {
    backgroundColor: '#4f9d69',
    borderColor: '#4f9d69',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
});
