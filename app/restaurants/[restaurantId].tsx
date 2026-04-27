import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Page } from '@/components/mobile-ui';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { fetchOrders } from '@/lib/api/orders';
import { fetchRestaurantMenu } from '@/lib/api/restaurants';
import { ENV } from '@/lib/config';
import { formatCurrency } from '@/lib/format';
import { formatRestaurantAddress, getRestaurantAddressLines } from '@/lib/restaurant';
import { getPendingOrder, savePendingOrder } from '@/lib/pending-order';
import { pushRoute } from '@/lib/navigation';
import {
  buildPickupSlotGroups,
  getAsapReadyLabel,
  getPickupByLabel,
  getPickupStatusLabel,
  resolvePickupAvailability,
} from '@/lib/pickup-scheduling';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  categoryId?: string;
  categoryName?: string;
  displayOrder?: number;
  __menuIndex?: number;
};

type MenuGroup = {
  key: string;
  title: string;
  order: number;
  category?: MenuCategory | null;
  items: MenuItem[];
};

type MenuCategory = {
  id: string;
  name: string;
  displayOrder: number;
  isActive?: boolean;
  items?: MenuItem[];
};

type RestaurantRecord = Record<string, any> | null;
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
  sku?: string;
};

const LIGHT_PAGE_BG = '#f9fafb';

export default function RestaurantMenuScreen() {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ restaurantId?: string }>();
  const restaurantId = Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId;
  const normalizedRestaurantId = typeof restaurantId === 'string' ? restaurantId.trim() : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState<RestaurantRecord>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const hydratedRestaurantIdRef = useRef<string | null>(null);
  const [pickupMode, setPickupMode] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  const [scheduledPickupTime, setScheduledPickupTime] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledPickupDraftDateKey, setScheduledPickupDraftDateKey] = useState('');
  const [scheduledPickupDraftTime, setScheduledPickupDraftTime] = useState('');
  const [expandedInstructionItemId, setExpandedInstructionItemId] = useState<string | null>(null);
  const { data: customerOrdersData } = useAsyncFetch(
    () => (user ? fetchOrders() : Promise.resolve([])),
    [Boolean(user), retryKey],
  );

  useEffect(() => {
    if (__DEV__) {
      console.log('[restaurant] route params', {
        restaurantId: normalizedRestaurantId || '(missing)',
        apiBaseUrl: ENV.API_BASE_URL || '(missing)',
      });
    }
  }, [normalizedRestaurantId]);

  useEffect(() => {
    let active = true;

    async function loadRestaurantMenu() {
      if (!normalizedRestaurantId) {
        setLoading(false);
        setError('Restaurant is missing.');
        setRestaurant(null);
        setMenuItems([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetchRestaurantMenu(normalizedRestaurantId);
        if (!active) return;

        const normalized = normalizeMenuResponse(response);
        if (__DEV__) {
          console.log('[restaurant] menu response', {
            keys: Object.keys(response || {}),
            restaurantId: normalizedRestaurantId,
            hasRestaurant: Boolean(normalized.restaurant),
            menuCount: normalized.menu.length,
            categoryCount: normalized.categories.length,
          });
        }

        setRestaurant(normalized.restaurant);
        setMenuItems(normalized.menu);
        setMenuCategories(normalized.categories);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Unable to load this restaurant';
        console.error('[restaurant] failed to load menu', err);
        setError(message);
        setRestaurant(null);
        setMenuItems([]);
        setMenuCategories([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRestaurantMenu();

    return () => {
      active = false;
    };
  }, [normalizedRestaurantId, retryKey]);

  const groups = useMemo(() => groupMenuItems(menuItems, menuCategories), [menuItems, menuCategories]);
  const visibleCategoryGroups = useMemo(() => groups.filter((group) => group.key !== 'uncategorized'), [groups]);
  const [activeCategoryKey, setActiveCategoryKey] = useState('');
  const restaurantName = String(restaurant?.name || 'Restaurant');
  const restaurantSubtitle = [restaurant?.cuisine, restaurant?.location].filter(Boolean).join(' · ');
  const restaurantAddressLines = getRestaurantAddressLines(restaurant);
  const pickupAvailability = useMemo(() => resolvePickupAvailability(restaurant, restaurant), [restaurant]);
  const pickupSlotGroups = useMemo(() => buildPickupSlotGroups(pickupAvailability), [pickupAvailability]);
  const pickupStatusLabel = getPickupStatusLabel(pickupAvailability);
  const asapReadyLabel = getAsapReadyLabel(pickupAvailability);
  const pickupByLabel = getPickupByLabel(
    pickupMode,
    scheduledPickupTime,
    '',
    pickupAvailability?.timezone || '',
    pickupAvailability,
    pickupAvailability?.today?.windows || [],
  );
  const isCompactLayout = width < 720;
  const isNarrowLayout = width < 420;
  const restaurantIsOpen = Boolean(pickupAvailability?.isOpenNow);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const quantityById = useMemo(
    () =>
      cart.reduce<Record<string, number>>((acc, item) => {
        acc[item.id] = item.quantity;
        return acc;
      }, {}),
    [cart],
  );
  const customerOrdersList = useMemo(() => resolveCustomerOrdersList(customerOrdersData), [customerOrdersData]);
  const lastOrder = useMemo(
    () => getLastOrderFromHistory(customerOrdersList, normalizedRestaurantId, restaurantName),
    [customerOrdersList, normalizedRestaurantId, restaurantName],
  );
  const displayedGroups = useMemo(() => {
    if (activeCategoryKey) {
      const selected = groups.filter((group) => group.key === activeCategoryKey);
      return selected.length ? selected : groups;
    }

    if (visibleCategoryGroups.length > 0) {
      return groups.filter((group) => group.key === visibleCategoryGroups[0].key);
    }

    return groups;
  }, [activeCategoryKey, groups, visibleCategoryGroups]);

  useEffect(() => {
    if (!normalizedRestaurantId) {
      return;
    }

    if (hydratedRestaurantIdRef.current === normalizedRestaurantId) {
      return;
    }

    const draft = getPendingOrder();
    if (draft && String(draft.restaurantId || '') === String(normalizedRestaurantId)) {
      setCart((draft.items || []).map(normalizeCartItem));
    } else {
      setCart([]);
    }

    hydratedRestaurantIdRef.current = normalizedRestaurantId;
  }, [normalizedRestaurantId]);

  useEffect(() => {
    if (!groups.length) {
      return;
    }

    setActiveCategoryKey((current) => {
      if (current && visibleCategoryGroups.some((group) => group.key === current)) {
        return current;
      }
      return visibleCategoryGroups[0]?.key || groups[0]?.key || '';
    });
  }, [groups, visibleCategoryGroups]);

  useEffect(() => {
    if (!restaurant || !normalizedRestaurantId) {
      return;
    }

    if (!cart.length) {
      savePendingOrder(null);
      return;
    }

    savePendingOrder({
      restaurantId: String(restaurant.id || normalizedRestaurantId),
      restaurantName,
      restaurantRouteKey: String(restaurant.id || normalizedRestaurantId),
      items: cart,
      pickupMode,
      scheduledPickupTime: pickupMode === 'SCHEDULED' ? scheduledPickupTime : '',
      pickupSummary: pickupMode === 'ASAP' ? 'Pay at restaurant' : `Scheduled for ${scheduledPickupTime || 'later pickup'}`,
      pickupDisplayTime: pickupMode === 'ASAP' ? asapReadyLabel : pickupByLabel,
      pickupReadyTime: pickupMode === 'ASAP' ? asapReadyLabel : '',
      customerName: '',
    });
  }, [asapReadyLabel, cart, normalizedRestaurantId, pickupByLabel, pickupMode, restaurant, restaurantName, scheduledPickupTime]);

  const cartQuantityForItem = (itemId: string) => quantityById[itemId] || 0;

  const addItemToCart = (item: MenuItem, quantity = 1, specialInstructions = '') => {
    if (item.isAvailable === false) {
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find((entry) => String(entry.id) === String(item.id));
      if (existing) {
        return currentCart.map((entry) =>
          String(entry.id) === String(item.id)
            ? {
                ...entry,
                quantity: entry.quantity + quantity,
                specialInstructions: entry.specialInstructions || specialInstructions || '',
              }
            : entry,
        );
      }

      return [
        ...currentCart,
        {
          id: String(item.id),
          name: String(item.name || 'Item'),
          price: Number(item.price || 0),
          quantity,
          specialInstructions: specialInstructions || '',
          imageUrl: item.imageUrl,
          sku: resolveMenuItemSku(item),
        },
      ];
    });
  };

  const handleAddToCart = (item: MenuItem) => {
    addItemToCart(item, 1);
  };

  const reorderLastOrder = () => {
    if (!lastOrder?.items?.length) {
      return;
    }

    setCart((currentCart) => {
      const nextCart = [...currentCart];

      lastOrder.items.forEach((orderItem) => {
        const identity = resolveMenuItemIdentity(orderItem);
        const quantity = Number(orderItem.quantity || 1);
        const specialInstructions = String(orderItem.specialInstructions || orderItem.special_instructions || '');
        const existingIndex = nextCart.findIndex((entry) => String(entry.id) === String(identity));

        if (existingIndex > -1) {
          nextCart[existingIndex] = {
            ...nextCart[existingIndex],
            quantity: nextCart[existingIndex].quantity + quantity,
            sku: nextCart[existingIndex].sku || resolveMenuItemSku(orderItem),
            specialInstructions: nextCart[existingIndex].specialInstructions || specialInstructions,
          };
          return;
        }

        nextCart.push({
          id: String(identity),
          name: String(orderItem.name || orderItem.title || orderItem.label || 'Item'),
          price: Number(orderItem.price || orderItem.unitPrice || orderItem.unit_price || 0),
          quantity,
          specialInstructions,
          imageUrl: String(orderItem.imageUrl || orderItem.image_url || ''),
          sku: resolveMenuItemSku(orderItem),
        });
      });

      return nextCart;
    });
  };

  const reorderSingleItem = (orderItem: MenuItem & { quantity?: number; specialInstructions?: string }) => {
    if (!orderItem) {
      return;
    }

    addItemToCart(orderItem, Number(orderItem.quantity || 1), String(orderItem.specialInstructions || ''));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((currentCart) => {
      const existing = currentCart.find((entry) => String(entry.id) === String(itemId));
      if (!existing) {
        return currentCart;
      }

      if (existing.quantity <= 1) {
        return currentCart.filter((entry) => String(entry.id) !== String(itemId));
      }

      return currentCart.map((entry) =>
        String(entry.id) === String(itemId)
          ? { ...entry, quantity: entry.quantity - 1 }
          : entry,
      );
    });
  };

  const handlePickupModeChange = (mode: 'ASAP' | 'SCHEDULED') => {
    setPickupMode(mode);
    if (mode === 'SCHEDULED') {
      openScheduleModal();
      return;
    }

    setScheduledPickupTime('');
  };

  const openScheduleModal = () => {
    const selection = getPickupScheduleDraftSelection(scheduledPickupTime, pickupSlotGroups);
    setScheduledPickupDraftDateKey(selection.dateKey);
    setScheduledPickupDraftTime(selection.slotValue);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
  };

  const confirmScheduleSelection = () => {
    if (!scheduledPickupDraftTime) {
      return;
    }

    setPickupMode('SCHEDULED');
    setScheduledPickupTime(scheduledPickupDraftTime);
    setShowScheduleModal(false);
  };

  const handleUpdateInstructions = (itemId: string, instructions: string) => {
    setCart((currentCart) =>
      currentCart.map((entry) =>
        String(entry.id) === String(itemId)
          ? { ...entry, specialInstructions: instructions }
          : entry,
      ),
    );
  };

  if (loading) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG}>
        <EmptyState title="Loading menu..." subtitle="Fetching restaurant details and menu data." />
      </Page>
    );
  }

  if (error || !restaurant) {
    return (
      <Page backgroundColor={LIGHT_PAGE_BG}>
        <EmptyState
          title="Unable to load this restaurant"
          subtitle={error || 'Try again in a moment.'}
          actionLabel="Retry"
          onAction={() => setRetryKey((value) => value + 1)}
        />
        <View style={styles.fallbackActions}>
          <Button title="Back to restaurants" variant="secondary" onPress={() => pushRoute(router, '/home')} />
        </View>
      </Page>
    );
  }

  const stickyCartLabel = cartItemCount > 0 ? `View cart • ${formatCurrency(cartSubtotal)}` : 'View cart';

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} scroll={false} contentStyle={styles.page}>
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            isCompactLayout ? styles.contentCompact : styles.contentDesktop,
            isCompactLayout ? styles.contentWithFooter : null,
          ]}
        >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to restaurant list</Text>
        </Pressable>

        <View style={styles.heroRow}>
          {restaurant.heroImage ? (
            <Image
              source={{ uri: String(restaurant.heroImage) }}
              style={[
                styles.heroImage,
                isCompactLayout ? styles.heroImageCompact : null,
                isNarrowLayout ? styles.heroImageNarrow : null,
              ]}
            />
          ) : (
            <View
              style={[
                styles.heroImageFallback,
                isCompactLayout ? styles.heroImageCompact : null,
                isNarrowLayout ? styles.heroImageNarrow : null,
              ]}
            >
              <Text style={styles.heroImageFallbackText}>{restaurantName.charAt(0)}</Text>
            </View>
          )}
            <View style={styles.heroCopy}>
              <Text style={[styles.restaurantName, isCompactLayout ? styles.restaurantNameCompact : null]}>
                {restaurantName}
              </Text>
              <Text style={[styles.restaurantCuisine, isCompactLayout ? styles.restaurantCuisineCompact : null]}>
                {restaurantSubtitle}
                <Text style={styles.restaurantDot}> • </Text>
                <Text style={restaurantIsOpen ? styles.restaurantDotGreen : styles.restaurantDotClosed}>
                  {restaurantIsOpen ? 'Open' : 'Closed'}
                </Text>
              </Text>
              <View style={[styles.addressRow, isCompactLayout ? styles.addressRowCompact : null]}>
                <Text style={styles.addressPin}>📍</Text>
                <View style={styles.addressTextWrap}>
                  <Text style={styles.address}>{restaurantAddressLines.line1 || formatRestaurantAddress(restaurant)}</Text>
                  {restaurantAddressLines.secondary ? (
                    <Text style={styles.addressSecondary}>{restaurantAddressLines.secondary}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

        {isCompactLayout ? (
          <View style={styles.leftColumn}>
            <Card style={[styles.sectionCard, styles.sectionCardCompact]}>
              <Text style={styles.cardEyebrow}>PICKUP TIME</Text>
              <Text style={[styles.sectionHeadline, styles.sectionSubheadlineCompact]}>Choose how you want to pick up your order</Text>
              <View style={styles.pickupNotice}>
                <View style={styles.pickupNoticeDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickupNoticeTitle}>
                    {pickupMode === 'ASAP'
                      ? `${restaurantIsOpen ? 'Open now' : 'Closed'} • ${pickupAvailability?.isOpenNow ? `Closes at ${pickupStatusLabel || 'soon'}` : `Opens at ${pickupStatusLabel || pickupAvailability?.today?.openTime || 'soon'}`}`
                      : `Scheduled • ${pickupByLabel || 'Later pickup'}`}
                  </Text>
                  <Text style={styles.pickupNoticeBody}>
                    {pickupAvailability?.isOpenNow
                      ? 'The restaurant is accepting pickup orders now.'
                      : 'Currently the restaurant is closed, but you can still place an order for later pickup.'}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={pickupAvailability?.asapAllowed === false}
                onPress={() => handlePickupModeChange('ASAP')}
                style={[
                  styles.pickupOptionButton,
                  pickupMode === 'ASAP' && styles.pickupOptionButtonActive,
                  pickupAvailability?.asapAllowed === false && styles.pickupOptionButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.pickupOptionButtonText,
                    pickupMode === 'ASAP' && styles.pickupOptionButtonTextActive,
                    pickupAvailability?.asapAllowed === false && styles.pickupOptionButtonTextDisabled,
                  ]}
                >
                  ASAP
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => handlePickupModeChange('SCHEDULED')}
                style={styles.pickupOptionButton}
              >
                <Text style={styles.pickupOptionButtonText}>Schedule for Later</Text>
              </Pressable>
            </Card>

            <Card style={styles.sectionCard}>
              <Text style={styles.cardEyebrow}>REORDER</Text>
              <View style={styles.reorderPanel}>
                <View style={styles.reorderPanelTop}>
                  <View style={styles.reorderPill}>
                    <Text style={styles.reorderPillText}>All Items</Text>
                  </View>
                  <Text style={styles.reorderPanelTitle}>Tap items to add them to your cart</Text>
                </View>

                {lastOrder?.items?.length ? (
                  <View style={styles.reorderPreviewList}>
                    {lastOrder.items.slice(0, 3).map((item) => (
                      <Pressable
                        key={`${item.id}-${item.name}`}
                        accessibilityRole="button"
                        onPress={() => reorderSingleItem(item)}
                        style={styles.reorderPreviewItem}
                      >
                        <View style={styles.reorderPreviewCopy}>
                          <Text style={styles.reorderPreviewName}>{item.name}</Text>
                          <Text style={styles.reorderPreviewMeta}>
                            {Number(item.quantity || 1)} × {formatCurrency(Number(item.price || 0))}
                          </Text>
                        </View>
                        <Text style={styles.reorderPreviewPlus}>+</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.reorderEmptyText}>
                    No recent order found. Reorder will be enabled after you place a previous order here.
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  disabled={!lastOrder?.items?.length}
                  onPress={reorderLastOrder}
                  style={({ pressed }) => [
                    styles.reorderButton,
                    !lastOrder?.items?.length && styles.reorderButtonDisabled,
                    pressed && lastOrder?.items?.length ? styles.reorderButtonPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.reorderButtonText,
                      !lastOrder?.items?.length && styles.reorderButtonTextDisabled,
                    ]}
                  >
                    Reorder
                  </Text>
                </Pressable>
              </View>
              {visibleCategoryGroups.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipRow}>
                  {visibleCategoryGroups.map((group) => {
                    const active = activeCategoryKey === group.key;
                    return (
                      <Pressable
                        key={group.key}
                        accessibilityRole="button"
                        onPress={() => setActiveCategoryKey(group.key)}
                        style={[
                          styles.categoryChip,
                          isNarrowLayout && styles.categoryChipCompact,
                          active && styles.categoryChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            isNarrowLayout && styles.categoryChipTextCompact,
                            active && styles.categoryChipTextActive,
                          ]}
                        >
                          {group.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              <Text style={styles.sectionSubheadline}>Tap items to add them to your cart</Text>
              {displayedGroups.length ? (
                <View style={styles.menuList}>
                  {displayedGroups.map((group) => (
                    <View key={group.key} style={styles.groupBlock}>
                      <Text style={styles.groupTitle}>
                        {group.title} <Text style={styles.groupCount}>({group.items.length} Items)</Text>
                      </Text>
                      <View style={styles.menuList}>
                        {group.items.map((item) => (
                          <Pressable
                            key={item.id}
                            accessibilityRole="button"
                            onPress={() => handleAddToCart(item)}
                            style={({ pressed }) => [
                              styles.menuItem,
                              cartQuantityForItem(item.id) > 0 ? styles.menuItemActive : null,
                              pressed ? styles.menuItemPressed : null,
                            ]}
                          >
                            <View style={styles.menuItemTop}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.menuItemName}>{item.name}</Text>
                                <Text style={styles.menuItemDescription}>{item.description || 'Freshly prepared to order.'}</Text>
                              </View>
                              <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                            </View>
                            <View style={[styles.menuActionsRow, styles.menuActionsRowCompact]}>
                              {cartQuantityForItem(item.id) > 0 ? (
                                <View style={styles.menuStepper}>
                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      handleRemoveFromCart(item.id);
                                    }}
                                    style={styles.menuStepperButton}
                                  >
                                    <Text style={styles.menuStepperButtonText}>-</Text>
                                  </Pressable>
                                  <Text style={styles.menuStepperCount}>{cartQuantityForItem(item.id)}</Text>
                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      handleAddToCart(item);
                                    }}
                                    style={styles.menuStepperButtonActive}
                                  >
                                    <Text style={styles.menuStepperButtonTextActive}>+</Text>
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={!item.isAvailable}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    handleAddToCart(item);
                                  }}
                                  style={({ pressed }) => [
                                    styles.menuAddButton,
                                    !item.isAvailable && styles.addButtonDisabled,
                                    pressed && item.isAvailable ? styles.addButtonPressed : null,
                                  ]}
                                >
                                  <Text style={[styles.menuAddButtonText, !item.isAvailable && styles.addButtonTextDisabled]}>
                                    Add
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                            {cartQuantityForItem(item.id) > 0 ? (
                              <View style={styles.instructionLinkWrap}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() =>
                                    setExpandedInstructionItemId((current) =>
                                      current === item.id ? null : item.id,
                                    )
                                  }
                                  style={styles.instructionToggle}
                                >
                                  <Text style={styles.instructionToggleText}>
                                    {expandedInstructionItemId === item.id ? 'Hide Instructions' : 'Add Instructions'}
                                  </Text>
                                  <Text style={styles.instructionToggleHint}>Optional</Text>
                                </Pressable>
                                {expandedInstructionItemId === item.id ? (
                                  <View style={styles.instructionEditor}>
                                    <TextInput
                                      value={cart.find((entry) => String(entry.id) === String(item.id))?.specialInstructions || ''}
                                      onChangeText={(value) => handleUpdateInstructions(item.id, value)}
                                      placeholder="Add a note for the kitchen"
                                      placeholderTextColor="#94a3b8"
                                      multiline
                                      style={styles.instructionInput}
                                    />
                                    <Text style={styles.instructionHelp}>
                                      Example: less spicy, no onions, sauce on the side
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="No menu items available"
                  subtitle="The API returned the restaurant, but no menu items were included."
                  actionLabel="Retry"
                  onAction={() => setRetryKey((value) => value + 1)}
                />
              )}
            </Card>
          </View>
        ) : (
          <View style={styles.columns}>
            <View style={styles.leftColumn}>
              <Card style={styles.sectionCard}>
                <Text style={styles.cardEyebrow}>PICKUP TIME</Text>
                <Text style={styles.sectionHeadline}>Choose how you want to pick up your order</Text>
                <View style={styles.pickupNotice}>
                  <View style={styles.pickupNoticeDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickupNoticeTitle}>
                      {pickupMode === 'ASAP'
                        ? `${restaurantIsOpen ? 'Open now' : 'Closed'} • ${pickupAvailability?.isOpenNow ? `Closes at ${pickupStatusLabel || 'soon'}` : `Opens at ${pickupStatusLabel || pickupAvailability?.today?.openTime || 'soon'}`}`
                        : `Scheduled • ${pickupByLabel || 'Later pickup'}`}
                    </Text>
                    <Text style={styles.pickupNoticeBody}>
                      {pickupAvailability?.isOpenNow
                        ? 'The restaurant is accepting pickup orders now.'
                        : 'Currently the restaurant is closed, but you can still place an order for later pickup.'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={pickupAvailability?.asapAllowed === false}
                  onPress={() => handlePickupModeChange('ASAP')}
                  style={[
                    styles.pickupOptionButton,
                    pickupMode === 'ASAP' && styles.pickupOptionButtonActive,
                    pickupAvailability?.asapAllowed === false && styles.pickupOptionButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickupOptionButtonText,
                      pickupMode === 'ASAP' && styles.pickupOptionButtonTextActive,
                      pickupAvailability?.asapAllowed === false && styles.pickupOptionButtonTextDisabled,
                    ]}
                  >
                    ASAP
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handlePickupModeChange('SCHEDULED')}
                  style={styles.pickupOptionButton}
                >
                  <Text style={styles.pickupOptionButtonText}>Schedule for Later</Text>
                </Pressable>
              </Card>

            <Card style={[styles.sectionCard, styles.sectionCardCompact]}>
              <Text style={styles.cardEyebrow}>REORDER</Text>
              <View style={styles.reorderPanel}>
                <View style={styles.reorderPanelTop}>
                  <View style={styles.reorderPill}>
                    <Text style={styles.reorderPillText}>All Items</Text>
                  </View>
                  <Text style={styles.reorderPanelTitle}>Tap items to add them to your cart</Text>
                </View>

                {lastOrder?.items?.length ? (
                  <View style={styles.reorderPreviewList}>
                    {lastOrder.items.slice(0, 3).map((item) => (
                      <Pressable
                        key={`${item.id}-${item.name}`}
                        accessibilityRole="button"
                        onPress={() => reorderSingleItem(item)}
                        style={styles.reorderPreviewItem}
                      >
                        <View style={styles.reorderPreviewCopy}>
                          <Text style={styles.reorderPreviewName}>{item.name}</Text>
                          <Text style={styles.reorderPreviewMeta}>
                            {Number(item.quantity || 1)} × {formatCurrency(Number(item.price || 0))}
                          </Text>
                        </View>
                        <Text style={styles.reorderPreviewPlus}>+</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.reorderEmptyText}>
                    No recent order found. Reorder will be enabled after you place a previous order here.
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  disabled={!lastOrder?.items?.length}
                  onPress={reorderLastOrder}
                  style={({ pressed }) => [
                    styles.reorderButton,
                    !lastOrder?.items?.length && styles.reorderButtonDisabled,
                    pressed && lastOrder?.items?.length ? styles.reorderButtonPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.reorderButtonText,
                      !lastOrder?.items?.length && styles.reorderButtonTextDisabled,
                    ]}
                  >
                    Reorder
                  </Text>
                </Pressable>
              </View>
              {visibleCategoryGroups.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipRow}>
                  {visibleCategoryGroups.map((group) => {
                    const active = activeCategoryKey === group.key;
                    return (
                      <Pressable
                        key={group.key}
                        accessibilityRole="button"
                        onPress={() => setActiveCategoryKey(group.key)}
                        style={[
                          styles.categoryChip,
                          isNarrowLayout && styles.categoryChipCompact,
                          active && styles.categoryChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            isNarrowLayout && styles.categoryChipTextCompact,
                            active && styles.categoryChipTextActive,
                          ]}
                        >
                          {group.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              <Text style={[styles.sectionSubheadline, styles.sectionSubheadlineCompact]}>Tap items to add them to your cart</Text>
              {displayedGroups.length ? (
                <View style={styles.menuList}>
                  {displayedGroups.map((group) => (
                    <View key={group.key} style={styles.groupBlock}>
                      <Text style={[styles.groupTitle, styles.groupTitleCompact]}>
                        {group.title} <Text style={styles.groupCount}>({group.items.length} Items)</Text>
                      </Text>
                      <View style={styles.menuList}>
                        {group.items.map((item) => (
                          <Pressable
                            key={item.id}
                            accessibilityRole="button"
                            onPress={() => handleAddToCart(item)}
                            style={({ pressed }) => [
                              styles.menuItem,
                              styles.menuItemCompact,
                              cartQuantityForItem(item.id) > 0 ? styles.menuItemActive : null,
                              pressed ? styles.menuItemPressed : null,
                            ]}
                          >
                            <View style={[styles.menuItemTop, styles.menuItemTopCompact]}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.menuItemName, styles.menuItemNameCompact]}>{item.name}</Text>
                                <Text style={[styles.menuItemDescription, styles.menuItemDescriptionCompact]}>
                                  {item.description || 'Freshly prepared to order.'}
                                </Text>
                              </View>
                              <Text style={[styles.menuPrice, styles.menuPriceCompact]}>{formatCurrency(item.price)}</Text>
                            </View>
                            {!isCompactLayout ? (
                              <View style={styles.menuBadges}>
                                <Chip label={item.isAvailable ? 'Available' : 'Unavailable'} />
                                {item.isVegetarian ? <Chip label="Vegetarian" /> : null}
                                {item.isVegan ? <Chip label="Vegan" /> : null}
                              </View>
                            ) : null}
                            <View style={styles.menuActionsRow}>
                              {cartQuantityForItem(item.id) > 0 ? (
                                <View style={styles.menuStepper}>
                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      handleRemoveFromCart(item.id);
                                    }}
                                    style={styles.menuStepperButton}
                                  >
                                    <Text style={styles.menuStepperButtonText}>-</Text>
                                  </Pressable>
                                  <Text style={styles.menuStepperCount}>{cartQuantityForItem(item.id)}</Text>
                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      handleAddToCart(item);
                                    }}
                                    style={styles.menuStepperButtonActive}
                                  >
                                    <Text style={styles.menuStepperButtonTextActive}>+</Text>
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={!item.isAvailable}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    handleAddToCart(item);
                                  }}
                                  style={({ pressed }) => [
                                    styles.menuAddButton,
                                    !item.isAvailable && styles.menuAddButtonDisabled,
                                    pressed && item.isAvailable ? styles.addButtonPressed : null,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.menuAddButtonText,
                                      !item.isAvailable && styles.addButtonTextDisabled,
                                    ]}
                                  >
                                    Add
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                            {cartQuantityForItem(item.id) > 0 ? (
                              <View style={styles.instructionLinkWrap}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() =>
                                    setExpandedInstructionItemId((current) =>
                                      current === item.id ? null : item.id,
                                    )
                                  }
                                  style={styles.instructionToggle}
                                >
                                  <Text style={styles.instructionToggleText}>
                                    {expandedInstructionItemId === item.id ? 'Hide Instructions' : 'Add Instructions'}
                                  </Text>
                                  <Text style={styles.instructionToggleHint}>Optional</Text>
                                </Pressable>
                                {expandedInstructionItemId === item.id ? (
                                  <View style={styles.instructionEditor}>
                                    <TextInput
                                      value={cart.find((entry) => String(entry.id) === String(item.id))?.specialInstructions || ''}
                                      onChangeText={(value) => handleUpdateInstructions(item.id, value)}
                                      placeholder="Add a note for the kitchen"
                                      placeholderTextColor="#94a3b8"
                                      multiline
                                      style={styles.instructionInput}
                                    />
                                    <Text style={styles.instructionHelp}>
                                      Example: less spicy, no onions, sauce on the side
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </Pressable>
                        ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="No menu items available"
                    subtitle="The API returned the restaurant, but no menu items were included."
                    actionLabel="Retry"
                    onAction={() => setRetryKey((value) => value + 1)}
                  />
                )}
              </Card>
            </View>

            <View style={styles.rightColumn}>
              <Card style={styles.cartCard}>
                <Text style={styles.cardEyebrow}>CART</Text>
                <View style={styles.cartHeader}>
                  <Text style={styles.cartBodyCopy}>
                    {pickupAvailability?.isOpenNow
                      ? 'The restaurant is accepting pickup orders now.'
                      : 'Currently the restaurant is closed, but you can still place an order for later pickup.'}
                  </Text>
                  <View style={styles.cartSummaryTop}>
                    <Text style={styles.cartTotal}>{formatCurrency(cartSubtotal)}</Text>
                    <Text style={styles.cartItemsCount}>{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</Text>
                  </View>
                </View>

                {cart.length ? (
                  <View style={styles.cartItemsList}>
                    {cart.map((item) => (
                      <View key={item.id} style={styles.cartItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cartItemName}>{item.name}</Text>
                          <View style={styles.cartQtyRow}>
                            <Pressable onPress={() => handleRemoveFromCart(item.id)} style={styles.cartQtyButton}>
                              <Text style={styles.cartQtyButtonText}>-</Text>
                            </Pressable>
                            <Text style={styles.cartQtyValue}>{item.quantity}</Text>
                            <Pressable
                              onPress={() =>
                                handleAddToCart((menuItems.find((menuItem) => menuItem.id === item.id) ||
                                  { ...item, isAvailable: true }) as MenuItem)
                              }
                              style={styles.cartQtyButtonActive}
                            >
                              <Text style={styles.cartQtyButtonTextActive}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={styles.cartItemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState title="Your cart is empty" subtitle="Tap Add on menu items to build your order." />
                )}

                <View style={styles.estimatedRow}>
                  <Text style={styles.estimatedLabel}>Estimated Total</Text>
                  <Text style={styles.estimatedValue}>{formatCurrency(cartSubtotal)}</Text>
                </View>

                <View style={styles.payCard}>
                  <Text style={styles.payCardIcon}>💰</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payCardTitle}>Pay at restaurant</Text>
                    <Text style={styles.payCardSubtitle}>No online payment required</Text>
                  </View>
                </View>

                <Button
                  title="View Cart / Place Order"
                  onPress={() => pushRoute(router, '/checkout')}
                  style={styles.placeOrderButton}
                  textStyle={styles.placeOrderButtonText}
                />
              </Card>
            </View>
          </View>
        )}
        </ScrollView>

        {isCompactLayout ? (
          <View style={styles.stickyCartBar}>
            <View style={styles.stickyCartCopy}>
              <Text style={styles.stickyCartCount}>
                {cartItemCount} item{cartItemCount === 1 ? '' : 's'}
              </Text>
              <Text style={styles.stickyCartTotal}>{formatCurrency(cartSubtotal)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => pushRoute(router, '/checkout')}
              style={styles.stickyCartButton}
            >
              <Text style={styles.stickyCartButtonText}>{stickyCartLabel}</Text>
            </Pressable>
          </View>
        ) : null}

        {showScheduleModal ? (
          <Modal animationType="fade" transparent visible onRequestClose={closeScheduleModal}>
            <View style={[styles.modalBackdrop, isNarrowLayout && styles.modalBackdropCompact]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeScheduleModal} />
              <View style={[styles.scheduleModal, isNarrowLayout && styles.scheduleModalCompact]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeScheduleModal}
                  style={[styles.modalCloseButton, isNarrowLayout && styles.modalCloseButtonCompact]}
                >
                  <Text style={[styles.modalCloseText, isNarrowLayout && styles.modalCloseTextCompact]}>×</Text>
                </Pressable>
                <Text style={styles.modalEyebrow}>Pickup</Text>
                <Text style={[styles.modalTitle, isNarrowLayout && styles.modalTitleCompact]}>Schedule my order</Text>
                <Text style={[styles.modalSubtitle, isNarrowLayout && styles.modalSubtitleCompact]}>
                  Select a pickup time up to 14 days in advance.
                </Text>

                {!pickupSlotGroups.length ? (
                  <Card style={styles.modalEmptyCard}>
                    <Text style={styles.modalEmptyTitle}>We do not have any pickup times available right now.</Text>
                  </Card>
                ) : (
                  <>
                    <View style={[styles.modalFieldGroup, isNarrowLayout && styles.modalFieldGroupCompact]}>
                      <View style={styles.modalField}>
                        <Text style={styles.modalLabel}>Date</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
                          {pickupSlotGroups.map((group) => {
                            const active = scheduledPickupDraftDateKey === group.key;
                            return (
                              <Pressable
                                key={group.key}
                                accessibilityRole="button"
                                onPress={() => {
                                  setScheduledPickupDraftDateKey(group.key);
                                  setScheduledPickupDraftTime(group.slots[0]?.value || '');
                                }}
                                style={[
                                  styles.modalChip,
                                  isNarrowLayout && styles.modalChipCompact,
                                  active && styles.modalChipActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.modalChipText,
                                    isNarrowLayout && styles.modalChipTextCompact,
                                    active && styles.modalChipTextActive,
                                  ]}
                                >
                                  {group.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={styles.modalField}>
                        <Text style={styles.modalLabel}>Time</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
                          {(pickupSlotGroups.find((group) => group.key === scheduledPickupDraftDateKey) || pickupSlotGroups[0])?.slots.map((slot) => {
                            const active = scheduledPickupDraftTime === slot.value;
                            return (
                                <Pressable
                                  key={slot.value}
                                  accessibilityRole="button"
                                  onPress={() => setScheduledPickupDraftTime(slot.value)}
                                style={[
                                  styles.modalChip,
                                  isNarrowLayout && styles.modalChipCompact,
                                  active && styles.modalChipActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.modalChipText,
                                    isNarrowLayout && styles.modalChipTextCompact,
                                    active && styles.modalChipTextActive,
                                  ]}
                                >
                                  {slot.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={confirmScheduleSelection}
                      disabled={!scheduledPickupDraftDateKey || !scheduledPickupDraftTime}
                      style={({ pressed }) => [
                        styles.modalConfirmButton,
                        isNarrowLayout && styles.modalConfirmButtonCompact,
                        (!scheduledPickupDraftDateKey || !scheduledPickupDraftTime) && styles.modalConfirmButtonDisabled,
                        pressed && scheduledPickupDraftDateKey && scheduledPickupDraftTime ? styles.modalConfirmButtonPressed : null,
                      ]}
                    >
                      <Text style={[styles.modalConfirmButtonText, isNarrowLayout && styles.modalConfirmButtonTextCompact]}>
                        Pickup{' '}
                        {pickupSlotGroups.find((group) => group.key === scheduledPickupDraftDateKey)?.label || 'Selected'} at{' '}
                        {
                          (pickupSlotGroups.find((group) => group.key === scheduledPickupDraftDateKey) || pickupSlotGroups[0])
                            ?.slots.find((slot) => slot.value === scheduledPickupDraftTime)?.label || 'Choose a time'
                        }
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </Modal>
        ) : null}
      </View>
    </Page>
  );
}

function normalizeCartItem(item: any): CartItem {
  return {
    id: String(item?.id || ''),
    name: String(item?.name || 'Item'),
    price: Number(item?.price || 0),
    quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
    specialInstructions: String(item?.specialInstructions || item?.special_instructions || ''),
    imageUrl: String(item?.imageUrl || item?.image_url || ''),
    sku: String(item?.sku || item?.menuItemId || item?.menu_item_id || item?.id || ''),
  };
}

function normalizeMenuResponse(response: unknown) {
  const payload = response && typeof response === 'object' ? (response as Record<string, any>) : {};
  const restaurant = normalizeRestaurant(payload);
  const menu = extractMenuItems(payload, restaurant);
  const categories = extractMenuCategories(payload, restaurant);
  return { restaurant, menu, categories };
}

function normalizeRestaurant(payload: Record<string, any>) {
  if (!payload || Array.isArray(payload)) {
    return null;
  }

  const source = payload?.restaurant && typeof payload.restaurant === 'object' ? payload.restaurant : payload;
  return source && typeof source === 'object' ? source : null;
}

function extractMenuItems(payload: Record<string, any>, restaurant: RestaurantRecord) {
  if (!payload || Array.isArray(payload)) {
    return [];
  }

  const candidateSources = [
    payload?.menu,
    payload?.items,
    restaurant?.menu,
    restaurant?.items,
  ];

  for (const source of candidateSources) {
    if (Array.isArray(source) && source.length > 0) {
      return normalizeMenuItems(source);
    }
  }

  const categories = Array.isArray(payload?.categories)
    ? payload.categories
    : Array.isArray(restaurant?.categories)
      ? restaurant.categories
      : [];

  const flattened = categories.flatMap((category: Record<string, any>, index: number) => {
    const categoryName = String(category?.name || category?.title || `Category ${index + 1}`);
    const categoryId = String(category?.id || category?.categoryId || `category-${index}`);
    const items = Array.isArray(category?.items) ? category.items : [];
    return items.map((item: Record<string, any>, itemIndex: number) => ({
      ...item,
      categoryId,
      categoryName,
      displayOrder: Number(category?.displayOrder ?? category?.display_order ?? index + 1),
      menuItemId: item?.id || item?.menuItemId || `item-${index}-${itemIndex}`,
    }));
  });

  return normalizeMenuItems(flattened);
}

function extractMenuCategories(payload: Record<string, any>, restaurant: RestaurantRecord) {
  const candidateSources = [
    payload?.categories,
    restaurant?.categories,
    payload?.menuCategories,
    payload?.menu_categories,
    restaurant?.menuCategories,
    restaurant?.menu_categories,
  ];

  for (const source of candidateSources) {
    if (Array.isArray(source) && source.length > 0) {
      return normalizeMenuCategories(source);
    }
  }

  return [];
}

function normalizeMenuItems(items: any[] = []): MenuItem[] {
  return items.map((item, index) => ({
    id: String(item?.id || item?.menuItemId || item?.menu_item_id || `item-${index}`),
    name: String(item?.name || item?.title || `Item ${index + 1}`),
    price: Number(item?.price || item?.unitPrice || item?.unit_price || 0),
    description: String(item?.description || ''),
    imageUrl: String(item?.image_url || item?.imageUrl || item?.image || ''),
    isAvailable: normalizeBoolean(item?.is_available ?? item?.isAvailable, true),
    isVegetarian: normalizeBoolean(item?.is_vegetarian ?? item?.isVegetarian, false),
    isVegan: normalizeBoolean(item?.is_vegan ?? item?.isVegan, false),
    categoryId: String(item?.category_id ?? item?.categoryId ?? item?.category?.id ?? ''),
    categoryName: String(item?.category_name || item?.categoryName || item?.category?.name || ''),
    displayOrder: Number(item?.display_order || item?.displayOrder || index + 1),
  }));
}

function normalizeMenuCategories(categories: any[] = []): MenuCategory[] {
  return categories
    .map((category, index) => ({
      id: String(category?.id || category?.categoryId || category?.category_id || `category-${index}`),
      name: String(category?.name || category?.title || `Category ${index + 1}`),
      displayOrder: Number(category?.displayOrder || category?.display_order || index + 1),
      isActive: normalizeBoolean(category?.isActive ?? category?.is_active ?? true, true),
      items: Array.isArray(category?.items) ? normalizeMenuItems(category.items) : [],
    }))
    .sort((left, right) => {
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder;
      }
      return left.name.localeCompare(right.name);
    });
}

function getCategoryGroupKey(category: MenuCategory) {
  return `category:${category.id}`;
}

function resolveMenuItemCategory(item: MenuItem, categories: MenuCategory[]) {
  const categoryId = String(item?.categoryId || '').trim();
  if (categoryId) {
    const direct = categories.find((category) => String(category.id) === categoryId);
    if (direct) {
      return direct;
    }
  }

  const categoryName = String(item?.categoryName || '').trim().toLowerCase();
  if (categoryName) {
    return categories.find((category) => String(category.name).trim().toLowerCase() === categoryName) || null;
  }

  return null;
}

function groupMenuItems(items: MenuItem[], categories: MenuCategory[] = []): MenuGroup[] {
  const groups = new Map<string, MenuGroup>();
  const orderedKeys: string[] = [];
  const normalizedCategories = normalizeMenuCategories(categories);
  const seenMenuItemIds = new Set<string>();

  normalizedCategories.forEach((category, index) => {
    const key = getCategoryGroupKey(category);
    const categoryItems = Array.isArray(category.items) ? category.items : [];
    groups.set(key, {
      key,
      title: category.name,
      order: category.displayOrder || index + 1,
      items: categoryItems.map((item, itemIndex) => ({
        ...item,
        __menuIndex: itemIndex,
      })),
      category,
    });
    orderedKeys.push(key);
    categoryItems.forEach((item) => {
      if (item?.id != null) {
        seenMenuItemIds.add(String(item.id));
      }
    });
  });

  const uncategorized: MenuGroup = {
    key: 'uncategorized',
    title: 'All Items',
    order: Number.MAX_SAFE_INTEGER,
    items: [],
    category: null,
  };

  items.forEach((item, index) => {
    if (item?.id != null && seenMenuItemIds.has(String(item.id))) {
      return;
    }

    const matchedGroup = resolveMenuItemCategory(item, normalizedCategories);
    if (matchedGroup) {
      const key = getCategoryGroupKey(matchedGroup);
      const targetGroup = groups.get(key);
      if (targetGroup) {
        targetGroup.items.push({
          ...item,
          __menuIndex: index,
        });
        if (item?.id != null) {
          seenMenuItemIds.add(String(item.id));
        }
      }
      return;
    }

    uncategorized.items.push({
      ...item,
      __menuIndex: index,
    });
  });

  if (uncategorized.items.length > 0) {
    groups.set(uncategorized.key, uncategorized);
    orderedKeys.push(uncategorized.key);
  }

  return orderedKeys
    .map((key) => groups.get(key))
    .filter((group): group is MenuGroup => Boolean(group))
    .map((group) => ({
      ...group,
      items: sortMenuItems(group.items),
    }))
    .filter((group): group is MenuGroup => group.items.length > 0)
    .sort((left, right) => {
      if ((left.order || 0) !== (right.order || 0)) {
        return (left.order || 0) - (right.order || 0);
      }
      return String(left.title || '').localeCompare(String(right.title || ''));
    });
}

function sortMenuItems(items: MenuItem[]) {
  return [...items].sort((left, right) => {
    const leftOrder = Number(left.displayOrder || 0);
    const rightOrder = Number(right.displayOrder || 0);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return String(left.name || '').localeCompare(String(right.name || ''));
  });
}

function resolveMenuItemIdentity(item: Record<string, any> = {}, fallbackIndex = 0) {
  const candidates = [
    item.id,
    item.menuItemId,
    item.menu_item_id,
    item.sku,
    item.code,
    item.name,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return `item-${fallbackIndex}`;
}

function resolveMenuItemSku(item: Record<string, any> = {}) {
  const candidates = [
    item.sku,
    item.code,
    item.menuItemId,
    item.menu_item_id,
    item.id,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function resolveCustomerOrdersList(customerOrdersData: unknown) {
  const source = customerOrdersData && typeof customerOrdersData === 'object' ? (customerOrdersData as Record<string, any>) : {};
  const directCandidates = [
    source.orders,
    source.orderHistory,
    source.order_history,
    source.history,
    source.customer?.orders,
    source.customer?.orderHistory,
    source.customer?.order_history,
    source.customer?.history,
    source.data?.orders,
    source.data?.orderHistory,
    source.data?.order_history,
    source.data?.history,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate) && candidate.length) {
      return candidate;
    }
  }

  return Array.isArray(customerOrdersData) ? customerOrdersData : [];
}

function getLastOrderFromHistory(orders: any[] = [], restaurantId?: string, restaurantName = '') {
  const ordersWithItems = [...orders]
    .map((order) => ({
      order,
      items: normalizeOrderItems(order),
    }))
    .filter((entry) => entry.items.length)
    .sort((left, right) => getOrderTimeValue(right.order) - getOrderTimeValue(left.order));

  if (!ordersWithItems.length) {
    return null;
  }

  const matchedOrder = restaurantId
    ? ordersWithItems.find((entry) => matchesRestaurantId(entry.order, restaurantId, restaurantName))
    : null;
  const selectedOrder = matchedOrder || ordersWithItems[0];
  const items = selectedOrder.items;

  return {
    id: selectedOrder.order?.id || selectedOrder.order?.orderNumber || null,
    items,
    summary: items.map((item) => `${item.quantity}× ${item.name}`).join(', '),
  };
}

function matchesRestaurantId(order: Record<string, any>, restaurantId: string, restaurantName = '') {
  const orderRestaurantId =
    order?.restaurantId ||
    order?.restaurant?.id ||
    order?.restaurant_id ||
    order?.restaurant?.restaurantId ||
    order?.restaurant?.restaurant_id ||
    order?.restaurant?.slug ||
    order?.restaurant?.restaurantSlug ||
    '';

  if (String(orderRestaurantId).trim() === String(restaurantId).trim()) {
    return true;
  }

  const orderRestaurantName =
    order?.restaurant?.name ||
    order?.restaurantName ||
    order?.restaurant_name ||
    order?.restaurant?.displayName ||
    '';

  return Boolean(
    restaurantName &&
      String(orderRestaurantName).trim().toLowerCase() === String(restaurantName).trim().toLowerCase(),
  );
}

function normalizeOrderItems(order: any) {
  if (Array.isArray(order)) {
    return order
      .filter(Boolean)
      .map((item, index) => ({
        ...item,
        id: resolveMenuItemIdentity(item, index),
        sku: resolveMenuItemSku(item),
        name: item?.name || item?.title || item?.label || 'Item',
        price: Number(item?.price ?? item?.unitPrice ?? item?.unit_price ?? 0),
        quantity: Number(item?.quantity || 1),
        specialInstructions: String(item?.specialInstructions || item?.special_instructions || item?.instructions || ''),
      }))
      .filter((item) => item.id && item.name);
  }

  const rawItems = resolveOrderItemsArray(order);
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item, index) => ({
      ...item,
      id: resolveMenuItemIdentity(item, index),
      sku: resolveMenuItemSku(item),
      name: item?.name || item?.title || item?.label || 'Item',
      price: Number(item?.price ?? item?.unitPrice ?? item?.unit_price ?? item?.lineTotal ?? item?.totalAmount ?? 0),
      quantity: Number(item?.quantity || 1),
      specialInstructions: String(item?.specialInstructions || item?.special_instructions || item?.instructions || ''),
    }))
    .filter((item) => item.id && item.name);
}

function resolveOrderItemsArray(order: Record<string, any>) {
  const directCandidates = [
    order?.items,
    order?.orderItems,
    order?.order_items,
    order?.lineItems,
    order?.line_items,
    order?.acceptedItems,
    order?.accepted_items,
    order?.visibleItems,
    order?.visible_items,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return findNestedOrderItemsArray(order);
}

function findNestedOrderItemsArray(value: unknown, seen = new Set<object>()): any[] | null {
  if (!value || typeof value !== 'object' || seen.has(value as object)) {
    return null;
  }

  seen.add(value as object);

  const nestedKeys = ['order', 'data', 'result', 'payload', 'details', 'lastOrder', 'last_order', 'orderData', 'order_data'];

  for (const key of nestedKeys) {
    const nested = (value as Record<string, any>)[key];
    if (!nested) {
      continue;
    }

    if (Array.isArray(nested)) {
      return nested;
    }

    const resolved: any[] | null = findNestedOrderItemsArray(nested, seen);
    if (resolved) {
      return resolved;
    }
  }

  for (const nested of Object.values(value as Record<string, any>)) {
    if (!nested || typeof nested !== 'object') {
      continue;
    }

    if (Array.isArray(nested)) {
      return nested;
    }

    const resolved: any[] | null = findNestedOrderItemsArray(nested, seen);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function getOrderTimeValue(order: Record<string, any>) {
  const raw =
    order?.created_at ||
    order?.createdAt ||
    order?.placedAt ||
    order?.orderedAt ||
    order?.submittedAt ||
    order?.updatedAt ||
    order?.updated_at ||
    0;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'available', 'active', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'unavailable', 'inactive', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function getPickupScheduleDraftSelection(value: string, groups: { key: string; slots: { value: string }[] }[] = []) {
  const normalizedValue = String(value || '').trim();
  for (const group of groups) {
    const slot = group.slots.find((entry) => entry.value === normalizedValue);
    if (slot) {
      return {
        dateKey: group.key,
        slotValue: slot.value,
      };
    }
  }

  const firstGroup = groups[0];
  return {
    dateKey: firstGroup?.key || '',
    slotValue: firstGroup?.slots?.[0]?.value || '',
  };
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 0,
  },
  screen: {
    flex: 1,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingBottom: 20,
  },
  contentDesktop: {
    paddingBottom: 24,
  },
  contentCompact: {
    gap: 10,
  },
  contentWithFooter: {
    paddingBottom: 124,
  },
  columns: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  columnsCompact: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 1,
    gap: 10,
  },
  rightColumn: {
    flex: 1,
    gap: 10,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  heroImageCompact: {
    width: 92,
    height: 92,
    borderRadius: 18,
  },
  heroImageNarrow: {
    width: 76,
    height: 76,
    borderRadius: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backButtonText: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: 17,
  },
  heroImage: {
    width: 142,
    height: 142,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  heroImageFallback: {
    width: 142,
    height: 142,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageFallbackText: {
    color: '#16a34a',
    fontSize: 42,
    fontWeight: '900',
  },
  heroCopy: {
    gap: 4,
    flex: 1,
  },
  restaurantNameCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  restaurantName: {
    color: '#0f172a',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  restaurantCuisineCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  restaurantCuisine: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  restaurantDot: {
    color: '#16a34a',
  },
  restaurantDotGreen: {
    color: '#16a34a',
    fontWeight: '700',
  },
  restaurantDotClosed: {
    color: '#6b7280',
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexShrink: 1,
  },
  addressRowCompact: {
    gap: 6,
  },
  addressTextWrap: {
    flex: 1,
    gap: 2,
  },
  addressPin: {
    fontSize: 16,
  },
  address: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 20,
  },
  addressSecondary: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChipRow: {
    gap: 7,
    paddingBottom: 2,
  },
  categoryChip: {
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff7f2',
    borderWidth: 1,
    borderColor: '#f1e6df',
  },
  categoryChipCompact: {
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  categoryChipActive: {
    backgroundColor: '#6b8b61',
    borderColor: '#6b8b61',
  },
  categoryChipText: {
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  categoryChipTextCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  sectionCardCompact: {
    padding: 12,
    gap: 8,
  },
  helperText: {
    color: '#374151',
    lineHeight: 20,
  },
  cardEyebrow: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  sectionHeadline: {
    color: '#0f172a',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sectionSubheadline: {
    color: '#0f172a',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  sectionSubheadlineCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  reorderPanel: {
    gap: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  reorderPanelTop: {
    gap: 8,
  },
  reorderPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#6b8b61',
  },
  reorderPillText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  reorderPanelTitle: {
    color: '#111827',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  reorderPreviewList: {
    gap: 8,
  },
  reorderPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reorderPreviewCopy: {
    flex: 1,
    gap: 2,
  },
  reorderPreviewName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  reorderPreviewMeta: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  reorderPreviewPlus: {
    color: '#16a34a',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 24,
  },
  reorderEmptyText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  reorderButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  reorderButtonPressed: {
    opacity: 0.92,
  },
  reorderButtonDisabled: {
    backgroundColor: '#a7f3d0',
  },
  reorderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  reorderButtonTextDisabled: {
    color: '#ffffff',
  },
  pickupNotice: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 12,
  },
  pickupNoticeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
    backgroundColor: '#ef4444',
    borderWidth: 4,
    borderColor: '#fee2e2',
  },
  pickupNoticeTitle: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },
  pickupNoticeBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  pickupAroundText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  pickupOptionButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pickupOptionButtonActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#16a34a',
  },
  pickupOptionButtonDisabled: {
    opacity: 0.55,
  },
  pickupOptionButtonText: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: '900',
  },
  pickupOptionButtonTextActive: {
    color: '#15803d',
  },
  pickupOptionButtonTextDisabled: {
    color: '#94a3b8',
  },
  fallbackActions: {
    marginTop: 12,
  },
  groupList: {
    gap: 14,
  },
  groupBlock: {
    gap: 8,
  },
  groupTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  groupTitleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  groupCount: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 15,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  menuItemCompact: {
    padding: 10,
    borderRadius: 16,
    gap: 6,
  },
  menuItemActive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  menuItemPressed: {
    transform: [{ scale: 0.995 }],
  },
  menuItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  menuItemTopCompact: {
    gap: 10,
  },
  menuItemName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  menuItemNameCompact: {
    fontSize: 15,
  },
  menuItemDescription: {
    color: '#4b5563',
    lineHeight: 18,
    marginTop: 2,
  },
  menuItemDescriptionCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  menuPrice: {
    color: '#16a34a',
    fontWeight: '800',
  },
  menuPriceCompact: {
    fontSize: 14,
  },
  menuBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuActionsRow: {
    gap: 6,
  },
  menuActionsRowCompact: {
    gap: 4,
  },
  menuStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  menuStepperButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  menuStepperButtonActive: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6b8b61',
  },
  menuStepperButtonText: {
    color: '#6b7280',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 20,
  },
  menuStepperButtonTextActive: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 20,
  },
  menuStepperCount: {
    minWidth: 38,
    textAlign: 'center',
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  menuAddButton: {
    alignSelf: 'flex-start',
    minWidth: 84,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#6b8b61',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAddButtonDisabled: {
    backgroundColor: '#c8d7c6',
  },
  menuAddButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  addButton: {
    alignSelf: 'flex-start',
    minWidth: 110,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCompact: {
    minWidth: 84,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  addButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  addButtonDisabled: {
    backgroundColor: '#86efac',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  addButtonTextCompact: {
    fontSize: 14,
  },
  addButtonTextDisabled: {
    color: '#ffffff',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  quantityControlCompact: {
    borderRadius: 14,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  quantityButtonCompact: {
    width: 36,
    height: 36,
  },
  quantityButtonText: {
    color: '#16a34a',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  quantityButtonTextCompact: {
    fontSize: 20,
    lineHeight: 20,
  },
  quantityValue: {
    minWidth: 36,
    textAlign: 'center',
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  quantityValueCompact: {
    minWidth: 28,
    fontSize: 14,
  },
  payAtRestaurant: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  payAtRestaurantCompact: {
    fontSize: 12,
  },
  instructionLinkWrap: {
    gap: 8,
  },
  instructionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  instructionToggleText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '800',
  },
  instructionToggleHint: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  instructionEditor: {
    gap: 8,
  },
  instructionInput: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  instructionHelp: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 16,
  },
  cartCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  cartBodyCopy: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cartSummaryTop: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cartTotal: {
    color: '#111827',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cartItemsCount: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  cartItemsList: {
    gap: 10,
  },
  cartItemRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cartItemName: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  cartQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  cartQtyButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cartQtyButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  cartQtyValue: {
    minWidth: 18,
    textAlign: 'center',
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  cartQtyButtonActive: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  cartQtyButtonTextActive: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  cartItemPrice: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  estimatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  estimatedLabel: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  estimatedValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  payCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
    padding: 16,
  },
  payCardIcon: {
    fontSize: 20,
  },
  payCardTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  payCardSubtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  placeOrderButton: {
    backgroundColor: '#16a34a',
  },
  placeOrderButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  stickyCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 8,
  },
  stickyCartCopy: {
    flex: 1,
    gap: 2,
  },
  stickyCartCount: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stickyCartTotal: {
    color: '#111827',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
  stickyCartButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    flexShrink: 0,
  },
  stickyCartButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    padding: 16,
  },
  modalBackdropCompact: {
    padding: 12,
  },
  scheduleModal: {
    position: 'relative',
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    maxHeight: '92%',
  },
  scheduleModalCompact: {
    padding: 12,
    gap: 10,
    borderRadius: 20,
    maxWidth: 420,
    maxHeight: '88%',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    zIndex: 2,
  },
  modalCloseText: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
  },
  modalCloseButtonCompact: {
    width: 30,
    height: 30,
    right: 10,
    top: 8,
  },
  modalCloseTextCompact: {
    fontSize: 20,
    lineHeight: 20,
  },
  modalEyebrow: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingRight: 30,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  modalTitleCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  modalSubtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalEmptyCard: {
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  modalEmptyTitle: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  modalFieldGroup: {
    gap: 12,
  },
  modalFieldGroupCompact: {
    gap: 10,
  },
  modalField: {
    gap: 8,
  },
  modalLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  modalChipRow: {
    gap: 8,
    paddingRight: 8,
  },
  modalChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#16a34a',
  },
  modalChipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  modalChipTextCompact: {
    fontSize: 12,
  },
  modalChipTextActive: {
    color: '#15803d',
  },
  modalConfirmButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
  },
  modalConfirmButtonCompact: {
    minHeight: 48,
    paddingHorizontal: 12,
  },
  modalConfirmButtonPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalConfirmButtonTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
});
