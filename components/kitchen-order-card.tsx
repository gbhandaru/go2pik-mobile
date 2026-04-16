import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/mobile-ui';
import {
  getKitchenCustomerName,
  getKitchenItemInstructions,
  getKitchenOrderNumber,
  getKitchenPickupTime,
  getKitchenStatusLabel,
  getKitchenTotalItems,
  getKitchenTotalValue,
  getKitchenWaitLabel,
  KitchenOrder,
} from '@/lib/kitchen';

type Action = {
  label: string;
  status: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onPress?: () => void;
};

export function KitchenOrderCard({
  order,
  actions = [],
  actionLoading = false,
  compact = false,
  onPress,
}: {
  order: KitchenOrder;
  actions?: Action[];
  actionLoading?: boolean;
  compact?: boolean;
  onPress?: () => void;
}) {
  if (!order) return null;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={[styles.card, compact && styles.compact]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>Order #{getKitchenOrderNumber(order)}</Text>
            <Text style={styles.customerName}>{getKitchenCustomerName(order)}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{getKitchenStatusLabel(order.status)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {getKitchenPickupTime(order) ? <Text style={styles.metaText}>Pickup: {getKitchenPickupTime(order)}</Text> : null}
          <Text style={styles.metaText}>Items: {getKitchenTotalItems(order)}</Text>
          <Text style={styles.metaText}>Total: {getKitchenTotalValue(order)}</Text>
        </View>

        {getKitchenWaitLabel(order) ? <Text style={styles.waitLabel}>Waiting {getKitchenWaitLabel(order)}</Text> : null}

        <View style={styles.itemsList}>
          {order.items?.length ? (
            order.items.map((item, index) => (
              <View key={`${order.id}-${item.id || index}`} style={styles.itemRow}>
                <Text style={styles.quantity}>{item.quantity || 1}×</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name || 'Item'}</Text>
                  {getKitchenItemInstructions(item) ? (
                    <Text style={styles.itemNote}>{getKitchenItemInstructions(item)}</Text>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.itemNote}>No items listed</Text>
          )}
        </View>

        {actions.length ? (
          <View style={styles.actionRow}>
            {actions.map((action) => (
              <Button
                key={action.status}
                title={action.label}
                variant={action.variant || 'primary'}
                compact
                loading={actionLoading}
                onPress={action.onPress || (() => {})}
              />
            ))}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  compact: {
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderNumber: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 16,
  },
  customerName: {
    color: '#9fb1ca',
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  statusText: {
    color: '#fed7aa',
    fontWeight: '800',
    fontSize: 12,
  },
  metaRow: {
    gap: 4,
  },
  metaText: {
    color: '#cbd5e1',
  },
  waitLabel: {
    color: '#f97316',
    fontWeight: '800',
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quantity: {
    minWidth: 30,
    color: '#fed7aa',
    fontWeight: '900',
  },
  itemName: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  itemNote: {
    color: '#9fb1ca',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

