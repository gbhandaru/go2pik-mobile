import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, EmptyState, Page } from '@/components/mobile-ui';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { formatCurrency } from '@/lib/format';
import { formatRestaurantAddress, getRestaurantAddressLines } from '@/lib/restaurant';
import { pushRoute } from '@/lib/navigation';

const PAGE_BG = '#ffffff';
const FILTERS = ['All', 'South Indian', 'Indian', 'Chinese'];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const { data: restaurants, loading, error, refresh } = useAsyncFetch(fetchRestaurants, []);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const visibleRestaurants = useMemo(() => (Array.isArray(restaurants) ? restaurants : []), [restaurants]);
  const locationLabel = visibleRestaurants[0]?.location || 'Brentwood, CA';
  const guestLabel = user ? 'Member' : 'Guest';

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleRestaurants.filter((restaurant) => {
      const cuisine = String(restaurant?.cuisine || '').trim();
      const matchesFilter = activeFilter === 'All' ? true : cuisine.toLowerCase().includes(activeFilter.toLowerCase());
      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        restaurant?.name,
        restaurant?.cuisine,
        restaurant?.location,
        restaurant?.address?.formatted,
        getRestaurantPreview(restaurant),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeFilter, search, visibleRestaurants]);

  return (
    <Page backgroundColor={PAGE_BG} scroll={false} contentStyle={styles.page}>
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.brand}>Go2Pik</Text>
              </View>
              <View style={styles.guestChip}>
                <Ionicons name="person-outline" size={14} color="#f97316" />
                <Text style={styles.guestChipText}>{guestLabel}</Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#16a34a" />
              <Text style={styles.locationText}>{locationLabel}</Text>
              <Ionicons name="chevron-down" size={14} color="#475569" />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Pickup your favorites nearby.</Text>
              <Text style={styles.heroSubtitle}>No delivery. No hidden fees. Just quick &amp; easy pickup.</Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                placeholder="Search restaurants or dishes"
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((filter) => {
                const active = filter === activeFilter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionEyebrow}>OPEN NEAR YOU</Text>
              <Text style={styles.sectionCount}>{filteredRestaurants.length} spots</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <RestaurantCard restaurant={item} onPress={() => pushRoute(router, `/restaurants/${String(item.id)}`)} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <EmptyState title="Loading restaurants..." subtitle="Fetching nearby pickup spots." />
          ) : error ? (
            <EmptyState title="Could not load restaurants" subtitle={error} actionLabel="Retry" onAction={() => refresh()} />
          ) : (
            <EmptyState
              title="No restaurants available"
              subtitle="The API returned an empty list."
              actionLabel="Retry"
              onAction={() => refresh()}
            />
          )
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
      />
    </Page>
  );
}

function RestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Record<string, any>;
  onPress: () => void;
}) {
  const rating = Number.isFinite(Number(restaurant?.rating)) ? Number(restaurant.rating).toFixed(1) : '4.8';
  const preview = getRestaurantPreview(restaurant);
  const menuPreview = Array.isArray(restaurant?.menu) ? restaurant.menu.slice(0, 2) : [];
  const addressLines = getRestaurantAddressLines(restaurant);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.restaurantCardWrap, pressed && styles.restaurantCardPressed]}>
      <Card style={styles.restaurantCard}>
        <View style={styles.restaurantThumb}>
          {restaurant?.heroImage ? (
            <Image source={{ uri: String(restaurant.heroImage) }} style={styles.restaurantThumbImage} />
          ) : (
            <View style={styles.restaurantThumbFallback}>
              <Text style={styles.restaurantThumbFallbackText}>{String(restaurant?.name || 'R').charAt(0)}</Text>
            </View>
          )}
        </View>

        <View style={styles.restaurantBody}>
          <View style={styles.restaurantTopRow}>
            <View style={styles.restaurantTopLeft}>
              <Text style={styles.restaurantName}>{String(restaurant?.name || 'Restaurant')}</Text>
              <Text style={styles.restaurantCuisine}>{String(restaurant?.cuisine || 'Pickup only')}</Text>
            </View>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color="#16a34a" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaStrong}>{String(restaurant?.eta || '15–20 min')}</Text>
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.addressWrap}>
              <Text style={styles.metaText}>{addressLines.line1 || formatRestaurantAddress(restaurant)}</Text>
              {addressLines.secondary ? <Text style={styles.metaSecondary}>{addressLines.secondary}</Text> : null}
            </View>
          </View>

          <Text style={styles.previewText}>{preview}</Text>

          <View style={styles.menuPreviewRow}>
            {menuPreview.length ? (
              menuPreview.map((menuItem: { id: string; name?: string; price?: number }) => (
                <View key={menuItem.id} style={styles.menuPreviewItem}>
                  <Text style={styles.menuPreviewName}>{String(menuItem.name || 'Item')}</Text>
                  <Text style={styles.menuPreviewPrice}>{formatCurrency(Number(menuItem.price || 0))}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.menuPreviewEmpty}>Freshly prepared to order.</Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function getRestaurantPreview(restaurant: Record<string, any>) {
  const menu = Array.isArray(restaurant?.menu) ? (restaurant.menu as Record<string, unknown>[]) : [];
  const firstItems = menu.slice(0, 2);
  if (!firstItems.length) {
    return 'Freshly prepared to order.';
  }
  return firstItems.map((item) => String(item.name || 'Item')).join(' • ');
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 112,
    gap: 12,
  },
  header: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    color: '#16a34a',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  guestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  guestChipText: {
    color: '#f97316',
    fontSize: 13,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  heroCopy: {
    gap: 6,
    paddingTop: 2,
  },
  heroTitle: {
    color: '#111827',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  filterChipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  sectionEyebrow: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
  restaurantCardWrap: {
    borderRadius: 18,
  },
  restaurantCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  restaurantCard: {
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 1,
  },
  restaurantThumb: {
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ecfdf5',
    flexShrink: 0,
  },
  restaurantThumbImage: {
    width: '100%',
    height: '100%',
  },
  restaurantThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantThumbFallbackText: {
    color: '#16a34a',
    fontSize: 28,
    fontWeight: '900',
  },
  restaurantBody: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  restaurantTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  restaurantTopLeft: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    color: '#111827',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  restaurantCuisine: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexShrink: 0,
  },
  ratingText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  metaStrong: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  metaDot: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  metaText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  addressWrap: {
    flex: 1,
    gap: 2,
  },
  metaSecondary: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 16,
  },
  previewText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  menuPreviewRow: {
    gap: 4,
  },
  menuPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  menuPreviewName: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  menuPreviewPrice: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '800',
  },
  menuPreviewEmpty: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  footerSpacer: {
    height: 12,
  },
});
