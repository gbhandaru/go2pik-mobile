import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Divider, EmptyState, Field, Page, SectionTitle } from '@/components/mobile-ui';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { fetchRestaurantMenu } from '@/lib/api/restaurants';
import { formatCurrency, formatTimeFromNow } from '@/lib/format';
import { clearPendingOrder, getPendingOrder, savePendingOrder } from '@/lib/pending-order';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatRestaurantAddress } from '@/lib/restaurant';
import { pushRoute } from '@/lib/navigation';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
};

export default function RestaurantMenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ restaurantId?: string }>();
  const restaurantId = Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId;
  const { user } = useCustomerAuth();
  const { data, loading, error } = useAsyncFetch(() => fetchRestaurantMenu(restaurantId || ''), [restaurantId]);
  const restaurant = (data as { restaurant?: Record<string, unknown>; menu?: Record<string, unknown>[] } | null)?.restaurant;
  const menu = (data as { menu?: Record<string, unknown>[] } | null)?.menu || [];
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickupMode, setPickupMode] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  const [scheduledPickupTime, setScheduledPickupTime] = useState(formatTimeFromNow(20));
  const existingDraft = getPendingOrder();

  useEffect(() => {
    if (existingDraft && String(existingDraft.restaurantId) === String(restaurantId || '')) {
      setCart(existingDraft.items);
      setPickupMode(existingDraft.pickupMode);
      setScheduledPickupTime(existingDraft.scheduledPickupTime || formatTimeFromNow(20));
      return;
    }

    setCart([]);
    setPickupMode('ASAP');
    setScheduledPickupTime(formatTimeFromNow(20));
  }, [existingDraft, restaurantId]);

  useEffect(() => {
    if (!restaurant || !restaurantId) {
      return;
    }

    if (!cart.length) {
      if (existingDraft && String(existingDraft.restaurantId) === String(restaurantId || '')) {
        clearPendingOrder();
      }
      return;
    }

    savePendingOrder({
      restaurantId: String((restaurant as Record<string, unknown>).id || restaurantId || ''),
      restaurantName: String((restaurant as Record<string, unknown>).name || 'Restaurant'),
      items: cart,
      pickupMode,
      scheduledPickupTime: pickupMode === 'SCHEDULED' ? scheduledPickupTime : '',
      customerName: getUserLabel(user),
    });
  }, [cart, existingDraft, pickupMode, restaurant, restaurantId, scheduledPickupTime, user]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addItem = (menuItem: Record<string, unknown>) => {
    const nextItem: CartItem = {
      id: String(menuItem.id),
      name: String(menuItem.name || 'Item'),
      price: Number(menuItem.price || 0),
      quantity: 1,
      specialInstructions: '',
    };
    setCart((prev) => {
      const existing = prev.find((item) => item.id === nextItem.id);
      if (existing) {
        return prev.map((item) => (item.id === nextItem.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, nextItem];
    });
  };

  const updateQuantity = (itemId: string, nextQuantity: number) => {
    setCart((prev) => {
      if (nextQuantity <= 0) {
        return prev.filter((item) => item.id !== itemId);
      }
      return prev.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity } : item));
    });
  };

  const updateInstructions = (itemId: string, text: string) => {
    setCart((prev) => prev.map((item) => (item.id === itemId ? { ...item, specialInstructions: text } : item)));
  };

  const handleReviewOrder = () => {
    if (!restaurant || !cart.length) return;
    savePendingOrder({
      restaurantId: String((restaurant as Record<string, unknown>).id || restaurantId || ''),
      restaurantName: String((restaurant as Record<string, unknown>).name || 'Restaurant'),
      items: cart,
      pickupMode,
      scheduledPickupTime: pickupMode === 'SCHEDULED' ? scheduledPickupTime : '',
      customerName: getUserLabel(user),
    });
    pushRoute(router, '/checkout');
  };

  if (loading) {
    return (
      <Page>
        <EmptyState title="Loading menu..." subtitle="Fetching restaurant and menu data." />
      </Page>
    );
  }

  if (error || !restaurant) {
    return (
      <Page>
        <EmptyState
          title="Unable to load this restaurant"
          subtitle={error || 'Try again in a moment.'}
          actionLabel="Back to home"
          onAction={() => pushRoute(router, '/home')}
        />
      </Page>
    );
  }

  return (
    <Page>
      <Card style={styles.heroCard}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Image source={{ uri: String((restaurant as Record<string, unknown>).heroImage || '') }} style={styles.heroImage} />
        <View style={styles.headerCopy}>
          <SectionTitle
            eyebrow="Menu"
            title={String((restaurant as Record<string, unknown>).name || 'Restaurant')}
            subtitle={`${String((restaurant as Record<string, unknown>).cuisine || '')} · ${String((restaurant as Record<string, unknown>).eta || '')}`}
          />
          <Text style={styles.address}>{formatRestaurantAddress(restaurant)}</Text>
        </View>
        <View style={styles.heroStats}>
          <Chip label={`${totalItems} items`} />
          <Chip label={pickupMode === 'ASAP' ? 'Pickup ASAP' : 'Scheduled pickup'} />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Pickup time" title="Choose how to pick up" />
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeChip, pickupMode === 'ASAP' && styles.modeChipActive]}
            onPress={() => setPickupMode('ASAP')}
          >
            <Text style={[styles.modeText, pickupMode === 'ASAP' && styles.modeTextActive]}>ASAP</Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, pickupMode === 'SCHEDULED' && styles.modeChipActive]}
            onPress={() => setPickupMode('SCHEDULED')}
          >
            <Text style={[styles.modeText, pickupMode === 'SCHEDULED' && styles.modeTextActive]}>Scheduled</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>
          {pickupMode === 'ASAP'
            ? `Usually ready around ${formatTimeFromNow(20)}`
            : 'Use HH:MM format for a pickup time.'}
        </Text>
        {pickupMode === 'SCHEDULED' ? (
          <Field
            label="Pickup time"
            value={scheduledPickupTime}
            onChangeText={setScheduledPickupTime}
            placeholder="12:45 PM"
          />
        ) : null}
      </Card>

      <Card>
        <SectionTitle eyebrow="Menu items" title="Tap to add items" />
        <View style={styles.menuList}>
          {menu.map((item) => (
            <View key={String(item.id)} style={styles.menuItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemName}>{String(item.name)}</Text>
                <Text style={styles.menuItemDescription}>{String(item.description || 'Freshly prepared to order.')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuPrice}>{formatCurrency(Number(item.price || 0))}</Text>
                <Button title="Add" variant="secondary" compact onPress={() => addItem(item)} />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Cart" title={`Your order (${totalItems})`} subtitle={cart.length ? 'Adjust quantities before you review.' : 'No items added yet.'} />
        {cart.length ? (
          <View style={styles.cartList}>
            {cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  <Text style={styles.cartMeta}>{formatCurrency(item.price)} each</Text>
                  <TextInput
                    value={item.specialInstructions || ''}
                    onChangeText={(text) => updateInstructions(item.id, text)}
                    placeholder="Special instructions"
                    placeholderTextColor="#8ca0be"
                    style={styles.instructionsInput}
                  />
                </View>
                <View style={styles.qtyColumn}>
                  <View style={styles.qtyRow}>
                    <Pressable onPress={() => updateQuantity(item.id, item.quantity - 1)} style={styles.qtyButton}>
                      <Text style={styles.qtyButtonText}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)} style={styles.qtyButton}>
                      <Text style={styles.qtyButtonText}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.cartLineTotal}>{formatCurrency(item.price * item.quantity)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="Your cart is empty" subtitle="Add items from the menu above." />
        )}
        <Divider />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(cartTotal)}</Text>
        </View>
        <Button title="Review order" onPress={handleReviewOrder} disabled={!cart.length} />
      </Card>
    </Page>
  );
}

function getUserLabel(user: unknown) {
  if (!user || typeof user !== 'object') return '';
  const record = user as Record<string, unknown>;
  return (
    (record.full_name as string | undefined) ||
    (record.fullName as string | undefined) ||
    (record.name as string | undefined) ||
    (record.email as string | undefined) ||
    ''
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    color: '#fed7aa',
    fontWeight: '800',
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
  },
  headerCopy: {
    gap: 8,
  },
  address: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#172338',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.16)',
  },
  modeChipActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  modeText: {
    color: '#9fb1ca',
    fontWeight: '800',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  helperText: {
    color: '#9fb1ca',
    lineHeight: 20,
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#172338',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.14)',
  },
  menuItemName: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 15,
  },
  menuItemDescription: {
    color: '#9fb1ca',
    marginTop: 4,
    lineHeight: 18,
  },
  menuRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  menuPrice: {
    color: '#fed7aa',
    fontWeight: '800',
  },
  cartList: {
    gap: 12,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  cartName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  cartMeta: {
    color: '#9fb1ca',
  },
  instructionsInput: {
    backgroundColor: '#111b2e',
    color: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  qtyColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111b2e',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.16)',
  },
  qtyButtonText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    color: '#f8fafc',
    fontWeight: '800',
  },
  cartLineTotal: {
    color: '#fed7aa',
    fontWeight: '800',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '700',
  },
  totalValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
});
