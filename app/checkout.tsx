import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Divider, EmptyState, Page, SectionTitle } from '@/components/mobile-ui';
import { submitOrder } from '@/lib/api/orders';
import { formatCurrency } from '@/lib/format';
import { clearPendingOrder, getPendingOrder } from '@/lib/pending-order';
import { saveOrderConfirmation } from '@/lib/order-session';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { pushRoute, replaceRoute } from '@/lib/navigation';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const draft = getPendingOrder();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const total = useMemo(() => {
    if (!draft) {
      return 0;
    }
    return draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [draft]);

  if (!draft) {
    return (
      <Page>
        <EmptyState
          title="Your cart is empty"
          subtitle="Add items from a restaurant menu before checking out."
          actionLabel="Browse restaurants"
          onAction={() => pushRoute(router, '/home')}
        />
      </Page>
    );
  }

  const orderDraft = draft;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const response = await submitOrder({
        restaurantId: orderDraft.restaurantId,
        restaurant: {
          id: orderDraft.restaurantId,
          name: orderDraft.restaurantName,
        },
        items: orderDraft.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          lineTotal: item.price * item.quantity,
          specialInstructions: item.specialInstructions || '',
        })),
        subtotal: total,
        total,
        pickupRequest: {
          type: orderDraft.pickupMode,
          scheduledTime: orderDraft.scheduledPickupTime,
        },
        customer: user || undefined,
        customerName: orderDraft.customerName,
      });

      saveOrderConfirmation({
        order: {
          ...response,
          restaurant: {
            id: orderDraft.restaurantId,
            name: orderDraft.restaurantName,
          },
          items: orderDraft.items,
          subtotal: total,
          total,
          pickupRequest: {
            type: orderDraft.pickupMode,
            scheduledTime: orderDraft.scheduledPickupTime,
          },
        },
        customerName: orderDraft.customerName,
      });
      clearPendingOrder();
      replaceRoute(router, '/order-confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card>
        <SectionTitle eyebrow="Review and submit" title="Checkout" subtitle={orderDraft.restaurantName} />
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Order summary</Text>
        {orderDraft.items.map((item) => (
          <View key={item.id} style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.quantity} × {formatCurrency(item.price)}</Text>
              {item.specialInstructions ? <Text style={styles.instructions}>{item.specialInstructions}</Text> : null}
            </View>
            <Text style={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
          </View>
        ))}
        <Divider />
        <View style={styles.summaryTotals}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <Text style={styles.pickupLabel}>
          Pickup: {orderDraft.pickupMode === 'ASAP' ? 'ASAP' : orderDraft.scheduledPickupTime || 'Scheduled'}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={loading ? 'Submitting…' : 'Place order'} onPress={() => void handleSubmit()} loading={loading} />
        <Button title="Back to menu" variant="ghost" onPress={() => router.back()} />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 16,
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
  instructions: {
    color: '#cbd5e1',
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
    paddingVertical: 10,
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
  pickupLabel: {
    color: '#9fb1ca',
    marginBottom: 8,
  },
  error: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
