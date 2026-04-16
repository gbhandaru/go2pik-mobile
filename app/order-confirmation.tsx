import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Page, SectionTitle } from '@/components/mobile-ui';
import { clearPendingOrder } from '@/lib/pending-order';
import { getOrderConfirmation } from '@/lib/order-session';
import { formatCurrency, formatTimestamp } from '@/lib/format';
import { replaceRoute } from '@/lib/navigation';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const confirmation = getOrderConfirmation();
  const order = confirmation?.order as Record<string, unknown> | null;
  const restaurantName = ((order?.restaurant as Record<string, unknown> | undefined) || {}).name || 'Your restaurant';
  const pickupType = (order?.pickupRequest as Record<string, unknown> | undefined)?.type || 'ASAP';

  if (!confirmation || !order) {
    return (
      <Page>
        <EmptyState
          title="Order complete"
          subtitle="The confirmation payload is not available, but the order was submitted."
          actionLabel="Back to restaurants"
          onAction={() => replaceRoute(router, '/home')}
        />
      </Page>
    );
  }

  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];

  return (
    <Page>
      <Card style={styles.heroCard}>
        <SectionTitle
          eyebrow="Order confirmed"
          title="You're all set."
          subtitle={`Thanks${confirmation.customerName ? `, ${confirmation.customerName}` : ''}. We'll notify you when your order is ready.`}
        />
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Pickup details</Text>
        <Text style={styles.detailText}>Restaurant: {String(restaurantName)}</Text>
        <Text style={styles.detailText}>Pickup: {String(pickupType)}</Text>
        <Text style={styles.detailText}>
          Order #{String(order.orderNumber || order.confirmationNumber || order.id || 'Order')}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>What you ordered</Text>
        {items.map((item, index) => (
          <View key={String(item.id || index)} style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{String(item.name || 'Item')}</Text>
              <Text style={styles.itemMeta}>
                {String(item.quantity || 1)} × {formatCurrency(Number(item.price || 0))}
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              {formatCurrency(Number(item.lineTotal || Number(item.price || 0) * Number(item.quantity || 1)))}
            </Text>
          </View>
        ))}
        <View style={styles.summaryTotals}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(Number(order.total || 0))}</Text>
        </View>
        <Text style={styles.detailText}>Placed: {formatTimestamp((order.placedAt as string | undefined) || new Date().toISOString())}</Text>
      </Card>

      <View style={styles.buttonStack}>
        <Button
          title="Browse restaurants"
          onPress={() => {
            clearPendingOrder();
            replaceRoute(router, '/home');
          }}
        />
        <Button title="View orders" variant="secondary" onPress={() => replaceRoute(router, '/orders')} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 10,
  },
  sectionLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  detailText: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  itemName: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  itemMeta: {
    color: '#9fb1ca',
    marginTop: 2,
  },
  itemTotal: {
    color: '#fed7aa',
    fontWeight: '800',
  },
  summaryTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  totalLabel: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  totalValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  buttonStack: {
    gap: 10,
  },
});
