import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Divider, EmptyState, Page } from '@/components/mobile-ui';
import { getPendingOrder, savePendingOrder } from '@/lib/pending-order';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { pushRoute, replaceRoute } from '@/lib/navigation';
import { formatCurrency } from '@/lib/format';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const draft = getPendingOrder();
  const [customerPhone, setCustomerPhone] = useState(getInitialPhone(user, draft?.customerPhone));
  const [smsConsentAccepted, setSmsConsentAccepted] = useState(Boolean(draft?.smsConsentAccepted));
  const [error, setError] = useState('');

  const total = useMemo(() => {
    if (!draft) {
      return 0;
    }
    return draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [draft]);

  useEffect(() => {
    setCustomerPhone(getInitialPhone(user, draft?.customerPhone));
    setSmsConsentAccepted(Boolean(draft?.smsConsentAccepted));
  }, [draft?.customerPhone, draft?.smsConsentAccepted, user]);

  if (!draft) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <EmptyState
          title="Your cart is empty"
          subtitle="Add items from a restaurant menu before checking out."
          actionLabel="Browse restaurants"
          onAction={() => pushRoute(router, '/home')}
        />
      </Page>
    );
  }

  const orderDraft = draft as NonNullable<typeof draft>;

  function handleContinue() {
    setError('');
    const normalizedPhone = normalizePhone(customerPhone);
    if (!normalizedPhone) {
      setError('Enter a valid US phone number to receive the verification code.');
      return;
    }
    if (!smsConsentAccepted) {
      setError('SMS consent is required to receive order updates and verification codes.');
      return;
    }

    savePendingOrder({
      ...orderDraft,
      customerPhone: normalizedPhone,
      smsConsentAccepted: true,
    });
    replaceRoute(router, '/verification');
  }

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
      <View style={styles.shell}>
        <Card style={styles.checkoutCard}>
          <View style={styles.checkoutHeader}>
            <Text style={styles.eyebrow}>Pickup</Text>
            <Text style={styles.title}>Place order</Text>
            <Text style={styles.subtitle}>{orderDraft.restaurantName}</Text>
          </View>

          <View style={styles.pickupBanner}>
            <View style={styles.pickupBannerCopy}>
              <Text style={styles.sectionLabel}>Pickup</Text>
              <Text style={styles.pickupValue}>
                {orderDraft.pickupMode === 'ASAP' ? 'ASAP' : orderDraft.scheduledPickupTime || 'Scheduled today'}
              </Text>
            </View>
            <View style={styles.pickupBannerMeta}>
              <Text style={styles.sectionLabel}>Cart</Text>
              <Text style={styles.cartSummaryMeta}>
                {orderDraft.items.reduce((sum, item) => sum + item.quantity, 0)} items
              </Text>
              <Text style={styles.cartSummaryMeta}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <View style={styles.summaryList}>
            {orderDraft.items.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} × {formatCurrency(item.price)}
                  </Text>
                  {item.specialInstructions ? <Text style={styles.instructions}>{item.specialInstructions}</Text> : null}
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          <Divider />

          <View style={styles.totalsBlock}>
            <View style={styles.summaryTotals}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
            <Text style={styles.paymentNote}>Pay at restaurant</Text>
          </View>

          <View style={styles.contactStack}>
            <Text style={styles.fieldLabel}>Phone number</Text>
            <TextInput
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
              placeholderTextColor="#94a3b8"
              style={styles.phoneInput}
            />

            <Button
              title={smsConsentAccepted ? 'SMS consent accepted' : 'Tap to accept SMS consent'}
              variant={smsConsentAccepted ? 'secondary' : 'ghost'}
              onPress={() => setSmsConsentAccepted((current) => !current)}
              style={smsConsentAccepted ? styles.consentButtonActive : styles.consentButton}
              textStyle={smsConsentAccepted ? styles.consentButtonActiveText : styles.consentButtonText}
            />

            <Text style={styles.consentCopy}>
              By continuing, you agree to receive order updates, pickup coordination, and verification codes by SMS.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Place order"
              onPress={handleContinue}
              style={styles.placeOrderButton}
              textStyle={styles.placeOrderButtonText}
            />

            <Button
              title="Back to menu"
              variant="ghost"
              onPress={() => router.back()}
              style={styles.backButton}
              textStyle={styles.backButtonText}
            />
          </View>
        </Card>
      </View>
    </Page>
  );
}

function getInitialPhone(user: unknown, draftPhone?: string) {
  const values = [draftPhone, getPhoneFromUser(user)];
  for (const value of values) {
    const normalized = normalizePhone(value || '');
    if (normalized) return normalized;
  }
  return '';
}

function getPhoneFromUser(user: unknown) {
  if (!user || typeof user !== 'object') return '';
  const record = user as Record<string, unknown>;
  return String(record.phone || record.phone_number || record.mobile || record.mobile_number || '');
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return '';
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
  checkoutCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  checkoutHeader: {
    gap: 4,
  },
  eyebrow: {
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  pickupBanner: {
    backgroundColor: '#f8faf7',
    borderWidth: 1,
    borderColor: '#e4ece2',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  pickupBannerCopy: {
    flex: 1,
    gap: 4,
  },
  pickupBannerMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sectionLabel: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
  cartSummaryMeta: {
    color: '#64748b',
    fontWeight: '700',
  },
  pickupValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  itemName: {
    color: '#0f172a',
    fontWeight: '800',
  },
  itemMeta: {
    color: '#64748b',
    marginTop: 2,
  },
  instructions: {
    color: '#0f172a',
    marginTop: 2,
  },
  itemTotal: {
    color: '#0f172a',
    fontWeight: '800',
  },
  paymentNote: {
    color: '#16a34a',
    fontWeight: '800',
  },
  summaryTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsBlock: {
    gap: 8,
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
  contactStack: {
    gap: 12,
  },
  fieldLabel: {
    color: '#0f172a',
    fontWeight: '800',
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#0f172a',
    fontSize: 16,
  },
  consentButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  consentButtonActive: {
    backgroundColor: '#edf8f0',
    borderColor: '#4f9d69',
    borderWidth: 1,
  },
  consentButtonText: {
    color: '#0f172a',
  },
  consentButtonActiveText: {
    color: '#295638',
  },
  consentCopy: {
    color: '#64748b',
    lineHeight: 20,
    marginTop: -2,
  },
  error: {
    color: '#dc2626',
    fontWeight: '700',
  },
  placeOrderButton: {
    backgroundColor: '#4f9d69',
    borderRadius: 999,
    minHeight: 48,
    marginTop: 4,
  },
  placeOrderButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
  },
  backButtonText: {
    color: '#0f172a',
  },
});
