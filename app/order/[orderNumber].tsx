import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Page } from '@/components/mobile-ui';
import { acceptReviewedOrder, cancelReviewedOrder, fetchOrderReview } from '@/lib/api/orders';
import { formatCurrency } from '@/lib/format';
import { replaceRoute } from '@/lib/navigation';

export default function OrderReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderNumber?: string; token?: string }>();
  const orderNumber = Array.isArray(params.orderNumber) ? params.orderNumber[0] : params.orderNumber || '';
  const token = Array.isArray(params.token) ? params.token[0] : params.token || '';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reviewOrder, setReviewOrder] = useState<Record<string, unknown> | null>(null);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const order = reviewOrder as any;
  const reviewPayload = review as any;

  useEffect(() => {
    let active = true;
    if (!orderNumber || !token) {
      setLoading(false);
      setError('This review link is missing the order number or token.');
      return;
    }

    void (async () => {
      setLoading(true);
      setError('');
      setMessage('');
      try {
        const response = await fetchOrderReview(orderNumber, token);
        if (!active) return;
        setReviewOrder(((response as any)?.order || null) as Record<string, unknown> | null);
        setReview(((response as any)?.review || null) as Record<string, unknown> | null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load the review page.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [orderNumber, token]);

  const acceptedItems = useMemo(() => normalizeItems(order?.acceptedItems || order?.accepted_items || order?.items), [order]);
  const unavailableItems = useMemo(() => normalizeItems(order?.unavailableItems || order?.unavailable_items), [order]);
  const restaurantName = String(order?.restaurant?.name || order?.restaurantName || 'your restaurant');
  const canAccept = reviewPayload?.canAccept !== false;
  const canCancel = reviewPayload?.canCancel !== false;

  async function handleAccept() {
    if (!orderNumber || !token || !canAccept) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await acceptReviewedOrder(orderNumber, token);
      const nextOrder = ((response as any)?.order || reviewOrder) as Record<string, unknown> | null;
      setReviewOrder(nextOrder as Record<string, unknown>);
      setMessage(String((response as any)?.message || 'Updated order accepted successfully'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept the updated order.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!orderNumber || !token || !canCancel) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await cancelReviewedOrder(orderNumber, token, 'Please cancel the order');
      const nextOrder = ((response as any)?.order || reviewOrder) as Record<string, unknown> | null;
      setReviewOrder(nextOrder as Record<string, unknown>);
      setMessage(String((response as any)?.message || 'Order cancelled successfully'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel the updated order.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <EmptyState title="Loading your order update" subtitle="Opening the SMS review link." />
      </Page>
    );
  }

  if (!orderNumber || !token) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <EmptyState
          title="Invalid SMS link"
          subtitle="This order review link is missing the order number or token."
          actionLabel="Go home"
          onAction={() => replaceRoute(router, '/')}
        />
      </Page>
    );
  }

  if (error && !reviewOrder) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <EmptyState
          title="Order update unavailable"
          subtitle={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            setError('');
            setMessage('');
            void fetchOrderReview(orderNumber, token)
              .then((response) => {
                setReviewOrder(((response as any)?.order || null) as Record<string, unknown> | null);
                setReview(((response as any)?.review || null) as Record<string, unknown> | null);
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load the review page.'))
              .finally(() => setLoading(false));
          }}
        />
      </Page>
    );
  }

  if (message) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <Card style={styles.card}>
          <Text style={styles.eyebrow}>Order update</Text>
          <Text style={styles.title}>{message}</Text>
          <Text style={styles.subtitle}>Order #{orderNumber} for {restaurantName} has been updated.</Text>
          <View style={styles.summaryGrid}>
            <Summary label="Accepted items" value={String(acceptedItems.length)} />
            <Summary label="Unavailable items" value={String(unavailableItems.length)} />
            <Summary label="Updated total" value={formatCurrency(resolveTotal(reviewOrder, acceptedItems))} />
          </View>
          <Button title="Go home" onPress={() => replaceRoute(router, '/')} style={styles.primaryAction} textStyle={styles.primaryActionText} />
        </Card>
      </Page>
    );
  }

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
      <View style={styles.shell}>
        <Card style={styles.heroCard}>
          <Text style={styles.eyebrow}>Text message order update</Text>
          <Text style={styles.title}>{restaurantName} needs your review</Text>
          <Text style={styles.subtitle}>Please review the updated order before continuing.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Updated order</Text>
          <View style={styles.itemList}>
            {acceptedItems.map((item: any, index) => (
              <View key={`accepted-${index}-${item.id || item.name}`} style={styles.itemRow}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{String(item.name || 'Item')}</Text>
                  <Text style={styles.itemMeta}>{String(item.quantity || 1)} x {formatCurrency(Number(item.price || 0))}</Text>
                </View>
              </View>
            ))}
            {unavailableItems.map((item: any, index) => (
              <View key={`unavailable-${index}-${item.id || item.name}`} style={styles.itemRow}>
                <View style={[styles.statusPill, styles.statusPillDanger]}>
                  <Text style={styles.statusPillText}>!</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{String(item.name || 'Item')}</Text>
                  <Text style={styles.itemMeta}>Not available today</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.summaryGrid}>
            <Summary label="Previous total" value={formatCurrency(resolvePreviousTotal(reviewOrder, acceptedItems, unavailableItems))} />
            <Summary label="Updated total" value={formatCurrency(resolveTotal(reviewOrder, acceptedItems))} />
          </View>

          <View style={styles.actionStack}>
            <Button
              title={submitting ? 'Updating…' : 'Accept Updated Order'}
              onPress={() => void handleAccept()}
              style={styles.primaryAction}
              textStyle={styles.primaryActionText}
              loading={submitting}
            />
            <Button
              title="Cancel Complete Order"
              variant="secondary"
              onPress={() => void handleCancel()}
              style={styles.secondaryAction}
              textStyle={styles.secondaryActionText}
              disabled={submitting || !canCancel}
            />
          </View>
        </Card>
      </View>
    </Page>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items.filter(Boolean).map((item) => item as Record<string, unknown>);
}

function resolveTotal(order: Record<string, unknown> | null, items: Record<string, unknown>[]) {
  const direct = order?.updatedTotal || order?.updated_total || order?.total || order?.subtotal || order?.totalAmount || order?.total_amount;
  const directNumber = Number(direct);
  if (Number.isFinite(directNumber)) return directNumber;
  return items.reduce((sum, item) => sum + resolveLineTotal(item), 0);
}

function resolvePreviousTotal(order: Record<string, unknown> | null, acceptedItems: Record<string, unknown>[], unavailableItems: Record<string, unknown>[]) {
  const direct = order?.previousTotal || order?.previous_total || order?.originalTotal || order?.original_total || order?.totalBeforeAcceptance || order?.total_before_acceptance;
  const directNumber = Number(direct);
  if (Number.isFinite(directNumber)) return directNumber;
  return [...acceptedItems, ...unavailableItems].reduce((sum, item) => sum + resolveLineTotal(item), 0);
}

function resolveLineTotal(item: Record<string, unknown>) {
  const quantity = Number(item.quantity || 1);
  const price = Number(item.price || item.unitPrice || item.unit_price || 0);
  return (Number.isFinite(quantity) ? quantity : 1) * (Number.isFinite(price) ? price : 0);
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
    gap: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#475569',
    lineHeight: 20,
  },
  error: {
    color: '#dc2626',
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  statusPill: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#edf8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillDanger: {
    backgroundColor: '#ffecec',
  },
  statusPillText: {
    color: '#295638',
    fontWeight: '900',
  },
  itemName: {
    color: '#0f172a',
    fontWeight: '800',
  },
  itemMeta: {
    color: '#64748b',
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#0f172a',
    fontWeight: '900',
    marginTop: 4,
  },
  actionStack: {
    gap: 10,
  },
  primaryAction: {
    backgroundColor: '#4f9d69',
  },
  primaryActionText: {
    color: '#ffffff',
  },
  secondaryAction: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  secondaryActionText: {
    color: '#0f172a',
  },
});
