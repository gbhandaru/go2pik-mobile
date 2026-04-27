import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Page } from '@/components/mobile-ui';
import { clearPendingOrder } from '@/lib/pending-order';
import { getOrderConfirmation } from '@/lib/order-session';
import { formatCurrency, formatTimestamp } from '@/lib/format';
import { replaceRoute } from '@/lib/navigation';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const confirmation = getOrderConfirmation();
  const order = confirmation?.order as Record<string, unknown> | null;
  const restaurantName = String((((order?.restaurant as Record<string, unknown> | undefined) || {}) as Record<string, unknown>).name || 'Your restaurant');
  const pickupRequest = (order?.pickupRequest as Record<string, unknown> | undefined) || {};

  if (!confirmation || !order) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <EmptyState
          title="Order complete"
          subtitle="The confirmation payload is not available, but your order was submitted."
          actionLabel="Back to restaurants"
          onAction={() => replaceRoute(router, '/home')}
        />
      </Page>
    );
  }

  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  const confirmationNumber = String(order.orderNumber || order.confirmationNumber || order.reference || order.id || 'Order');
  const pickupLabel = String(pickupRequest.type || 'ASAP');
  const pickupTime = String(pickupRequest.scheduledTime || '');
  const total = Number(order.total || 0);
  const subtotal = Number(order.subtotal || total);

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
      <View style={styles.shell}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>✓</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Order Confirmed</Text>
            <Text style={styles.heroLede}>
              Thanks{confirmation.customerName ? `, ${confirmation.customerName}` : ''}! We&apos;ll notify you when your order is ready for pickup.
            </Text>
            <Text style={styles.heroSubtext}>Your order has been sent to the restaurant kitchen.</Text>
          </View>
        </View>

        <View style={styles.pickupCard}>
          <View style={styles.pickupRow}>
            <View style={styles.pickupBlock}>
              <Text style={styles.pickupLabel}>Pickup time</Text>
              <Text style={styles.pickupValue}>{pickupLabel === 'ASAP' ? 'Ready soon' : pickupTime || 'Scheduled'}</Text>
            </View>
            <View style={styles.pickupBlock}>
              <Text style={styles.pickupLabel}>Location</Text>
              <Text style={styles.pickupValue}>{restaurantName}</Text>
            </View>
          </View>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderIdLabel}>Order #{confirmationNumber}</Text>
            <Text style={styles.orderIdHint}>Show this at pickup counter</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>What you ordered</Text>
          <View style={styles.itemList}>
            {items.length > 0 ? (
              items.map((item, index) => {
                const itemInstructions = getItemInstructions(item);
                return (
                  <View key={String(item.id || index)} style={styles.summaryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{String(item.name || 'Item')}</Text>
                      <Text style={styles.itemMeta}>
                        {String(item.quantity || 1)} × {formatCurrency(Number(item.price || 0))}
                      </Text>
                      {itemInstructions ? <Text style={styles.itemInstructions}>{itemInstructions}</Text> : null}
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(Number(item.lineTotal || Number(item.price || 0) * Number(item.quantity || 1)))}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>This order&apos;s line items are not available right now.</Text>
            )}
          </View>

          <View style={styles.totalBlock}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <Text style={styles.placedText}>Placed: {formatTimestamp((order.placedAt as string | undefined) || new Date().toISOString())}</Text>
        </View>

        <View style={styles.actionStack}>
          <Button
            title="Browse restaurants"
            onPress={() => {
              clearPendingOrder();
              replaceRoute(router, '/home');
            }}
            style={styles.primaryAction}
            textStyle={styles.primaryActionText}
          />
          <Button
            title="View orders"
            variant="secondary"
            onPress={() => replaceRoute(router, '/orders')}
            style={styles.secondaryAction}
            textStyle={styles.secondaryActionText}
          />
        </View>
      </View>
    </Page>
  );
}

function getItemInstructions(item: Record<string, unknown>) {
  return String(item.specialInstructions || item.special_instructions || item.instructions || item.note || '');
}

const LIGHT_PAGE_BG = '#f6f7fb';

const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 28,
  },
  shell: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  heroIconText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  heroLede: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 22,
  },
  heroSubtext: {
    color: '#64748b',
  },
  pickupCard: {
    backgroundColor: '#fbfdfc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  pickupRow: {
    flexDirection: 'row',
    gap: 14,
  },
  pickupBlock: {
    flex: 1,
    gap: 4,
  },
  pickupLabel: {
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '800',
  },
  pickupValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  orderIdRow: {
    gap: 2,
  },
  orderIdLabel: {
    color: '#0f172a',
    fontWeight: '900',
  },
  orderIdHint: {
    color: '#475569',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  sectionLabel: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  itemList: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  itemName: {
    color: '#0f172a',
    fontWeight: '800',
  },
  itemMeta: {
    color: '#64748b',
    marginTop: 2,
  },
  itemInstructions: {
    color: '#0f172a',
    marginTop: 2,
  },
  itemTotal: {
    color: '#0f172a',
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748b',
  },
  totalBlock: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#475569',
    fontWeight: '700',
  },
  totalValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  placedText: {
    color: '#64748b',
  },
  actionStack: {
    gap: 10,
  },
  primaryAction: {
    backgroundColor: '#4f9d69',
    borderRadius: 999,
    minHeight: 48,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 16,
  },
  secondaryAction: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
  },
  secondaryActionText: {
    color: '#0f172a',
  },
});
