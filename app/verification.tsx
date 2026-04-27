import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, EmptyState, Page, SectionTitle } from '@/components/mobile-ui';
import { fetchTwilioVerifyHealth } from '@/lib/api/health';
import { confirmOrderVerification, resendOrderVerification, startOrderVerification } from '@/lib/api/orders';
import { clearPendingOrder, clearOrderVerification, getOrderVerification, getPendingOrder, saveOrderVerification } from '@/lib/pending-order';
import { formatPhone } from '@/lib/format';
import { saveOrderConfirmation } from '@/lib/order-session';
import { replaceRoute } from '@/lib/navigation';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

const DEFAULT_OTP_LENGTH = 6;

export default function VerificationScreen() {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const draft = getPendingOrder();
  const existingVerification = getOrderVerification();
  const [verification, setVerification] = useState(existingVerification);
  const [otpLength, setOtpLength] = useState(existingVerification?.otpLength || DEFAULT_OTP_LENGTH);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!draft) return;
    if (verification) return;

    let active = true;
    setStarting(true);
    setError('');

    void (async () => {
      try {
        const health = await fetchTwilioVerifyHealth().catch(() => null);
        const nextLength = Number(health?.otpLength || health?.serviceDetails?.codeLength || DEFAULT_OTP_LENGTH);
        if (active && Number.isFinite(nextLength) && nextLength > 0) {
          setOtpLength(nextLength);
        }

        const response = await startOrderVerification(buildVerificationPayload(draft, user));
        if (!active) return;
        const nextVerification = normalizeVerification(response);
        setVerification(nextVerification);
        saveOrderVerification(nextVerification);
        setCode('');
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to start verification');
        }
      } finally {
        if (active) {
          setStarting(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [draft, user, verification]);

  useEffect(() => {
    saveOrderVerification(verification || null);
  }, [verification]);

  useEffect(() => {
    if (!verification) {
      return;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [verification]);

  const verificationExpiryLabel = useMemo(() => {
    if (!verification?.expiresAt) return '';
    const expiresAt = new Date(verification.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return '';
    const remaining = Math.max(0, Math.round((expiresAt.getTime() - now) / 1000));
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s remaining` : `${seconds}s remaining`;
  }, [now, verification?.expiresAt]);

  const resendAvailable = useMemo(() => {
    if (!verification?.resendAvailableAt) return true;
    const date = new Date(verification.resendAvailableAt);
    return Number.isNaN(date.getTime()) ? true : now >= date.getTime();
  }, [now, verification?.resendAvailableAt]);

  if (!draft) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
        <EmptyState
          title="Order draft unavailable"
          subtitle="We could not restore your order. Please return to the restaurant and try again."
          actionLabel="Back to restaurants"
          onAction={() => replaceRoute(router, '/home')}
        />
      </Page>
    );
  }

  const orderDraft = draft;

  async function handleConfirm() {
    if (!verification?.id) {
      setError('Verification session is missing. Please try again.');
      return;
    }

    if (code.replace(/\D/g, '').length !== otpLength) {
      setError(`Enter the ${otpLength}-digit code to continue.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await confirmOrderVerification({
        verificationId: verification.id,
        code,
        customerName: orderDraft.customerName,
        customer: {
          name: orderDraft.customerName,
          phone: orderDraft.customerPhone,
          email: user && typeof user === 'object' ? String((user as Record<string, unknown>).email || '') : '',
        },
        restaurantId: orderDraft.restaurantId,
        restaurant: {
          id: orderDraft.restaurantId,
          name: orderDraft.restaurantName,
        },
        items: orderDraft.items.map((item) => ({
          ...item,
          lineTotal: item.price * item.quantity,
        })),
        subtotal: calculateSubtotal(orderDraft),
        total: calculateSubtotal(orderDraft),
        pickupRequest: {
          type: orderDraft.pickupMode,
          scheduledTime: orderDraft.scheduledPickupTime,
          summary: orderDraft.pickupSummary || (orderDraft.pickupMode === 'ASAP' ? 'Pay at restaurant' : `Scheduled for ${orderDraft.scheduledPickupTime}`),
          displayTime: orderDraft.pickupDisplayTime,
          readyTime: orderDraft.pickupReadyTime,
        },
      });

      const responseOrder = normalizeOrder(response, orderDraft);
      saveOrderConfirmation({
        order: responseOrder,
        customerName: orderDraft.customerName,
      });
      clearPendingOrder();
      clearOrderVerification();
      replaceRoute(router, '/order-confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify your order right now.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!verification?.id) {
      setError('Verification session is missing. Please restart from checkout.');
      return;
    }
    if (!resendAvailable) {
      return;
    }

    setStarting(true);
    setError('');
    try {
      const response = await resendOrderVerification({ verificationId: verification.id });
      const nextVerification = normalizeVerification(response);
      setVerification(nextVerification);
      saveOrderVerification(nextVerification);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend the code');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
      <View style={styles.shell}>
        <Card style={styles.heroCard}>
          <Text style={styles.eyebrow}>Verification</Text>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>
            We sent a {otpLength}-digit code to {formatPhone(orderDraft.customerPhone || '')}.
          </Text>
          {verificationExpiryLabel ? <Text style={styles.meta}>{verificationExpiryLabel}</Text> : null}
        </Card>

        <Card style={styles.codeCard}>
          <SectionTitle eyebrow="One-time code" title="Confirm your order" subtitle="Enter the SMS code to finalize the pickup order." />
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, otpLength))}
            keyboardType="number-pad"
            placeholder={Array.from({ length: otpLength }, () => '•').join('')}
            placeholderTextColor="#94a3b8"
            maxLength={otpLength}
            style={styles.otpInput}
          />
          <View style={styles.digitRow}>
            {Array.from({ length: otpLength }).map((_, index) => (
              <View key={index} style={[styles.digitBox, index < code.length && styles.digitBoxFilled]}>
                <Text style={styles.digitText}>{code[index] || ''}</Text>
              </View>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title={loading || starting ? 'Working…' : 'Verify and place order'}
            onPress={() => void handleConfirm()}
            style={styles.primaryAction}
            textStyle={styles.primaryActionText}
            loading={loading}
          />
          <Button
            title={resendAvailable ? 'Resend code' : 'Wait to resend'}
            variant="secondary"
            onPress={() => void handleResend()}
            disabled={!resendAvailable}
            loading={starting}
            style={styles.secondaryAction}
            textStyle={styles.secondaryActionText}
          />
          <Button
            title="Back to checkout"
            variant="ghost"
            onPress={() => replaceRoute(router, '/checkout')}
            style={styles.backAction}
            textStyle={styles.backActionText}
          />
        </Card>
      </View>
    </Page>
  );
}

function buildVerificationPayload(draft: NonNullable<ReturnType<typeof getPendingOrder>>, user: unknown) {
  const subtotal = calculateSubtotal(draft);
  return {
    restaurantId: draft.restaurantId,
    restaurant: {
      id: draft.restaurantId,
      name: draft.restaurantName,
    },
    items: draft.items.map((item) => ({
      ...item,
      lineTotal: item.price * item.quantity,
    })),
    subtotal,
    total: subtotal,
    pickupRequest: {
      type: draft.pickupMode,
      scheduledTime: draft.scheduledPickupTime,
      summary: draft.pickupSummary || (draft.pickupMode === 'ASAP' ? 'Pay at restaurant' : `Scheduled for ${draft.scheduledPickupTime}`),
      displayTime: draft.pickupDisplayTime,
      readyTime: draft.pickupReadyTime,
    },
    customer: {
      name: draft.customerName || getUserLabel(user),
      phone: draft.customerPhone,
      email: getUserEmail(user),
    },
    customerName: draft.customerName || getUserLabel(user),
  };
}

function normalizeVerification(response: unknown) {
  if (!response || typeof response !== 'object') {
    return null;
  }
  const record = response as Record<string, any>;
  const verification = (record.verification || record?.data?.verification || record) as Record<string, any>;
  return {
    id: String(verification.id || verification.verificationId || verification.verification_id || ''),
    phone: String(verification.phone || verification.customerPhone || ''),
    otpLength: Number(verification.otpLength || verification.otp_length || DEFAULT_OTP_LENGTH),
    expiresAt: String(verification.expiresAt || verification.expires_at || ''),
    resendAvailableAt: String(verification.resendAvailableAt || verification.resend_available_at || ''),
  };
}

function normalizeOrder(response: unknown, draft: NonNullable<ReturnType<typeof getPendingOrder>>) {
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    return (record.order as Record<string, unknown> | undefined) || record;
  }

  return {
    restaurant: {
      id: draft.restaurantId,
      name: draft.restaurantName,
    },
    restaurantName: draft.restaurantName,
    items: draft.items,
    subtotal: calculateSubtotal(draft),
    total: calculateSubtotal(draft),
    pickupRequest: {
      type: draft.pickupMode,
      scheduledTime: draft.scheduledPickupTime,
      summary: draft.pickupSummary || (draft.pickupMode === 'ASAP' ? 'Pay at restaurant' : `Scheduled for ${draft.scheduledPickupTime}`),
      displayTime: draft.pickupDisplayTime,
      readyTime: draft.pickupReadyTime,
    },
  };
}

function calculateSubtotal(draft: NonNullable<ReturnType<typeof getPendingOrder>>) {
  return draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getUserEmail(user: unknown) {
  if (!user || typeof user !== 'object') return '';
  const record = user as Record<string, unknown>;
  return String(record.email || '');
}

function getUserLabel(user: unknown) {
  if (!user || typeof user !== 'object') return '';
  const record = user as Record<string, unknown>;
  return String(record.full_name || record.fullName || record.name || record.email || '');
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
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  codeCard: {
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
  },
  subtitle: {
    color: '#475569',
    lineHeight: 20,
  },
  meta: {
    color: '#64748b',
    fontWeight: '700',
  },
  otpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  digitRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  digitBox: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  digitBoxFilled: {
    borderColor: '#4f9d69',
    backgroundColor: '#edf8f0',
  },
  digitText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  error: {
    color: '#dc2626',
    fontWeight: '700',
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
  backAction: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  backActionText: {
    color: '#0f172a',
  },
});
