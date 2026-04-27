import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip } from '@/components/mobile-ui';
import { formatCurrency } from '@/lib/format';
import {
  formatKitchenOrderTime,
  getKitchenCustomerName,
  getKitchenItemInstructions,
  getKitchenOrderNumber,
  getKitchenOrderPickupLabel,
  getKitchenOrderTimingLabel,
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
  loadingActionStatus = null,
  compact = false,
  onPress,
}: {
  order: KitchenOrder;
  actions?: Action[];
  actionLoading?: boolean;
  loadingActionStatus?: string | null;
  compact?: boolean;
  onPress?: () => void;
}) {
  if (!order) return null;

  const orderNumber = getKitchenOrderNumber(order);
  const customerName = getKitchenCustomerName(order);
  const statusLabel = getKitchenStatusLabel(order.status);
  const waitLabel = getKitchenWaitLabel(order);
  const pickupLabel = getKitchenOrderPickupLabel(order);
  const timingLabel = getKitchenOrderTimingLabel(order);
  const hasActions = actions.length > 0;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={[styles.card, compact && styles.compact]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>Order #{orderNumber}</Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
          <View style={styles.badgeColumn}>
            <Chip
              label={statusLabel}
              style={[styles.statusChip, statusChipStyles[order.status || ''] || styles.statusChipNeutral]}
              textStyle={styles.statusChipText}
            />
            {waitLabel ? (
              <Chip label={`${waitLabel} min`} style={styles.waitChip} textStyle={styles.waitChipText} />
            ) : null}
          </View>
        </View>

        <View style={styles.metaBlock}>
          {timingLabel ? <Text style={styles.metaText}>{timingLabel}</Text> : null}
          {pickupLabel ? <Text style={styles.metaText}>Pickup: {pickupLabel}</Text> : null}
          {formatKitchenOrderTime(order) ? (
            <Text style={styles.metaText}>Placed {formatKitchenOrderTime(order)}</Text>
          ) : null}
        </View>

        <View style={styles.itemsList}>
          {order.items?.length ? (
            order.items.map((item, index) => (
              <View key={`${order.id}-${item.id || index}`} style={styles.itemRow}>
                <Text style={styles.quantity}>{item.quantity || 1}x</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name || 'Item'}</Text>
                    {typeof item.lineTotal === 'number' ? (
                      <Text style={styles.lineTotal}>{formatCurrency(item.lineTotal)}</Text>
                    ) : null}
                  </View>
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

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{getKitchenTotalItems(order)}</Text>
          </View>
          <View style={[styles.summaryPill, styles.summaryPillRight]}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{getKitchenTotalValue(order)}</Text>
          </View>
        </View>

        {hasActions ? (
          <View style={styles.actionRow}>
            {actions.map((action) => {
              const isLoading = loadingActionStatus === action.status;
              return (
                <Button
                  key={action.status}
                  title={isLoading ? 'Updating…' : action.label}
                  variant={action.variant || 'primary'}
                  compact
                  fullWidth={false}
                  loading={actionLoading || isLoading}
                  style={[
                    styles.actionButton,
                    action.variant === 'primary' ? styles.primaryButton : null,
                    action.variant === 'danger' ? styles.dangerButton : null,
                    action.variant === 'secondary' ? styles.secondaryButton : null,
                    action.variant === 'ghost' ? styles.ghostButton : null,
                  ]}
                  textStyle={[
                    styles.actionButtonText,
                    action.variant === 'primary' ? styles.primaryButtonText : null,
                    action.variant === 'danger' ? styles.dangerButtonText : null,
                    action.variant === 'secondary' ? styles.secondaryButtonText : null,
                    action.variant === 'ghost' ? styles.ghostButtonText : null,
                  ]}
                  onPress={action.onPress || (() => {})}
                />
              );
            })}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const statusChipStyles: Record<string, object> = {
  new: { backgroundColor: '#fff4db', borderColor: '#f4d28b' },
  accepted: { backgroundColor: '#e9f5ec', borderColor: '#b7ddc2' },
  preparing: { backgroundColor: '#e9f5ec', borderColor: '#b7ddc2' },
  ready_for_pickup: { backgroundColor: '#fff1cc', borderColor: '#f1d27a' },
  completed: { backgroundColor: '#e7edf4', borderColor: '#c8d4e3' },
  rejected: { backgroundColor: '#fde8e8', borderColor: '#f3b4b4' },
};

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: '#ffffff',
    borderColor: '#e5eaf0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  compact: {
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderNumber: {
    color: '#1f2937',
    fontWeight: '900',
    fontSize: 16,
  },
  customerName: {
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
    fontSize: 13,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusChipNeutral: {
    backgroundColor: '#eef2f6',
    borderColor: '#d6dde7',
  },
  statusChipText: {
    color: '#556174',
    textTransform: 'capitalize',
  },
  waitChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#fff5d7',
  },
  waitChipText: {
    color: '#7a5c08',
  },
  metaBlock: {
    gap: 4,
  },
  metaText: {
    color: '#64748b',
    lineHeight: 16,
    fontSize: 12,
  },
  itemsList: {
    gap: 7,
    paddingTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  quantity: {
    minWidth: 24,
    color: '#295638',
    fontWeight: '800',
    fontSize: 13,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemName: {
    flex: 1,
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 14,
  },
  lineTotal: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  itemNote: {
    color: '#7a8796',
    marginTop: 2,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#f6f8fb',
    borderWidth: 1,
    borderColor: '#e6ebf0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryPillRight: {
    alignItems: 'flex-end',
  },
  summaryLabel: {
    color: '#7a8796',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#4f9d69',
    borderColor: '#4f9d69',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  dangerButton: {
    backgroundColor: '#c85a5a',
    borderColor: '#c85a5a',
  },
  dangerButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#eaf2ec',
    borderColor: '#d5e5d9',
  },
  secondaryButtonText: {
    color: '#2f5b3c',
  },
  ghostButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2d9',
  },
  ghostButtonText: {
    color: '#4f6b55',
  },
});
