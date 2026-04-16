import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Chip, EmptyState, Page, SectionTitle, Stat } from '@/components/mobile-ui';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { useAsyncFetch } from '@/hooks/useAsyncFetch';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { pushRoute } from '@/lib/navigation';

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useCustomerAuth();
  const { data: restaurants = [], loading } = useAsyncFetch(fetchRestaurants, []);
  const visibleRestaurants = useMemo(() => (Array.isArray(restaurants) ? restaurants.slice(0, 3) : []), [restaurants]);

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.heroGlow} />
      <Card style={styles.heroCard}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>G2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>Go2Pik</Text>
            <Text style={styles.brandSubhead}>Pickup ordering, rebuilt for mobile.</Text>
          </View>
          <Chip label="Pickup only" />
        </View>

        <SectionTitle
          eyebrow="Mobile ordering"
          title="Order ahead. Skip the wait."
          subtitle="A mobile-first version of the Go2Pik experience with the same customer and kitchen workflows."
        />

        <View style={styles.actionRow}>
          <Button title={isAuthenticated ? 'Continue to Home' : 'Start Ordering'} onPress={() => pushRoute(router, isAuthenticated ? '/home' : '/login')} />
          <Button title="Kitchen Sign In" variant="secondary" onPress={() => pushRoute(router, '/kitchen/login')} />
        </View>

        {user ? (
          <View style={styles.authBanner}>
            <Ionicons name="person-circle-outline" size={18} color="#f8fafc" />
            <Text style={styles.authBannerText}>Signed in as {getUserLabel(user)}</Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.statRow}>
        <Stat label="Restaurants" value={String(visibleRestaurants.length)} />
        <Stat label="Pickup only" value="Yes" />
      </View>

      <Card>
        <SectionTitle eyebrow="How it works" title="Three steps to pickup." />
        <View style={styles.stepList}>
          <Step index="01" title="Choose a restaurant" subtitle="Browse nearby favorites and open the menu." />
          <Step index="02" title="Build your order" subtitle="Adjust items, pickup timing, and notes." />
          <Step index="03" title="Confirm and grab it" subtitle="Submit the order and track the confirmation." />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeaderRow}>
          <SectionTitle eyebrow="Available now" title="Top restaurants" />
          <Pressable onPress={() => pushRoute(router, '/home')}>
            <Text style={styles.sectionLink}>See all</Text>
          </Pressable>
        </View>

        {loading ? <Text style={styles.muted}>Loading restaurants...</Text> : null}

        <FlatList
          data={visibleRestaurants}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => pushRoute(router, `/restaurants/${item.id}`)} style={styles.restaurantCard}>
              <Image source={{ uri: item.heroImage }} style={styles.restaurantImage} />
              <View style={styles.restaurantBody}>
                <Text style={styles.restaurantName}>{item.name}</Text>
                <Text style={styles.restaurantMeta}>{item.cuisine}</Text>
                <Text style={styles.restaurantMeta}>{item.eta || 'Pickup in 15-20 min'}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No restaurants found"
                subtitle="The API did not return any restaurants."
              />
            ) : null
          }
        />
      </Card>

      <Card>
        <SectionTitle eyebrow="Quick access" title="Choose a path" />
        <View style={styles.quickActions}>
          <Button title="Customer login" variant="ghost" onPress={() => pushRoute(router, '/login')} />
          <Button title="Create account" variant="ghost" onPress={() => pushRoute(router, '/signup')} />
        </View>
      </Card>
    </Page>
  );
}

function Step({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndex}>
        <Text style={styles.stepIndexText}>{index}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function getUserLabel(user: unknown) {
  if (!user || typeof user !== 'object') return 'guest';
  const record = user as Record<string, unknown>;
  return (
    (record.full_name as string | undefined) ||
    (record.fullName as string | undefined) ||
    (record.name as string | undefined) ||
    (record.email as string | undefined) ||
    'guest'
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  heroGlow: {
    position: 'absolute',
    right: -60,
    top: -10,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
  },
  heroCard: {
    marginTop: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
  },
  brandMarkText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 20,
  },
  brandName: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 22,
  },
  brandSubhead: {
    color: '#9fb1ca',
    marginTop: 2,
  },
  actionRow: {
    gap: 10,
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  authBannerText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepList: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIndex: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: '#fed7aa',
    fontWeight: '800',
  },
  stepTitle: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 15,
  },
  stepSubtitle: {
    color: '#9fb1ca',
    marginTop: 2,
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionLink: {
    color: '#fed7aa',
    fontWeight: '700',
    marginTop: 6,
  },
  muted: {
    color: '#9fb1ca',
  },
  restaurantCard: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#172338',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.16)',
  },
  restaurantImage: {
    width: '100%',
    height: 150,
  },
  restaurantBody: {
    padding: 14,
    gap: 4,
  },
  restaurantName: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  restaurantMeta: {
    color: '#9fb1ca',
  },
  quickActions: {
    gap: 10,
  },
});
