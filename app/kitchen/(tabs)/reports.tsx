import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, EmptyState, Page } from '@/components/mobile-ui';
import { fetchKitchenOrdersReport } from '@/lib/api/orders';
import { restaurantUserLogout } from '@/lib/api/auth';
import { clearKitchenAuthTokens, getKitchenRefreshToken, getKitchenRestaurantId } from '@/lib/auth-storage';
import { formatCurrency } from '@/lib/format';
import { KitchenHeader } from '@/components/kitchen-header';
import { replaceRoute } from '@/lib/navigation';

const RANGE_TABS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

export default function KitchenReportsScreen() {
  const router = useRouter();
  const restaurantId = getKitchenRestaurantId() || '';
  const [rangeMode, setRangeMode] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getTodayInputValue());
  const [rangeFrom, setRangeFrom] = useState(getTodayInputValue());
  const [rangeTo, setRangeTo] = useState(getTodayInputValue());
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const reportData = report as any;

  const query = useMemo(() => buildQuery(rangeMode, customDate, rangeFrom, rangeTo), [rangeMode, customDate, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      setError('Restaurant context is not available yet.');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    void fetchKitchenOrdersReport(restaurantId, query)
      .then((response) => {
        if (!active) return;
        const nextReport = (response as Record<string, unknown>)?.report || response;
        setReport(nextReport as Record<string, unknown>);
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load the sales report.');
          setReport(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [restaurantId, query, refreshNonce]);

  const handleLogout = async () => {
    const refreshToken = getKitchenRefreshToken();
    try {
      if (refreshToken) {
        await restaurantUserLogout(refreshToken);
      }
    } catch {
      // ignore
    } finally {
      clearKitchenAuthTokens();
      replaceRoute(router, '/kitchen/login');
    }
  };

  return (
    <Page backgroundColor={LIGHT_BG} contentStyle={styles.page}>
      <KitchenHeader
        restaurantName="Go2Pik"
        title="Sales Report"
        subtitle={rangeMode === 'today' ? 'Today sales snapshot' : 'Revenue trend and order performance'}
        meta={lastUpdated ? `Last update: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Last update: —'}
        primaryActionIcon="refresh"
        compact
        hideTitleBlock
        onRefresh={() => setRefreshNonce((value) => value + 1)}
        onLogout={() => void handleLogout()}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeTabs}>
        {RANGE_TABS.map((tab) => {
          const active = tab.value === rangeMode;
          return (
            <Pressable key={tab.value} onPress={() => setRangeMode(tab.value as typeof rangeMode)} style={[styles.rangeTab, active && styles.rangeTabActive]}>
              <Text style={[styles.rangeTabText, active && styles.rangeTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {rangeMode === 'custom' ? (
        <Card style={styles.filterCard}>
          <Text style={styles.sectionLabel}>Custom range</Text>
          <TextInput value={customDate} onChangeText={setCustomDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.input} />
          <TextInput value={rangeFrom} onChangeText={setRangeFrom} placeholder="From date" placeholderTextColor="#94a3b8" style={styles.input} />
          <TextInput value={rangeTo} onChangeText={setRangeTo} placeholder="To date" placeholderTextColor="#94a3b8" style={styles.input} />
        </Card>
      ) : null}

      {loading ? <EmptyState title="Loading report..." subtitle="Fetching sales and trend data." /> : null}
      {error ? <EmptyState title="Unable to load report" subtitle={error} actionLabel="Retry" onAction={() => setRefreshNonce((value) => value + 1)} /> : null}

      {!loading && !error && report ? (
        <View style={styles.cards}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Gross sales</Text>
            <Text style={styles.metricValue}>{formatMoneyDisplay(reportData?.totals)}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Orders</Text>
            <Text style={styles.metricValue}>{String(reportData?.totals?.orders || 0)}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Average order</Text>
            <Text style={styles.metricValue}>{formatMoneyDisplay({ amount: reportData?.avgOrder || reportData?.avgOrderDisplay })}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Top items</Text>
            <Text style={styles.metricValue}>{String(Array.isArray(reportData?.items) ? reportData.items.length : 0)}</Text>
          </Card>
        </View>
      ) : null}

      {!loading && !error && report ? (
        <Card style={styles.chartCard}>
          <Text style={styles.sectionLabel}>Status counts</Text>
          {Object.entries((reportData?.statusCounts as Record<string, unknown>) || {}).map(([key, value]) => (
            <View key={key} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.statusValue}>{String(value)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {!loading && !error && report ? (
        <Card style={styles.chartCard}>
          <Text style={styles.sectionLabel}>Top items</Text>
          {(Array.isArray(reportData?.items) ? reportData.items : []).map((item: any, index: number) => (
            <View key={`${item?.name || index}`} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{item?.name || 'Item'}</Text>
              <Text style={styles.statusValue}>{item?.count ?? item?.quantity ?? item?.total ?? 0}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.bottomGap} />
    </Page>
  );
}

function buildQuery(rangeMode: string, customDate: string, rangeFrom: string, rangeTo: string) {
  const params = new URLSearchParams();
  if (rangeMode === 'today') {
    params.set('today', 'true');
  } else if (rangeMode === 'week') {
    params.set('week', 'true');
  } else if (rangeMode === 'month') {
    params.set('month', 'true');
  } else if (rangeMode === 'custom') {
    if (customDate) params.set('date', customDate);
    if (rangeFrom) params.set('from', rangeFrom);
    if (rangeTo) params.set('to', rangeTo);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoneyDisplay(source: any) {
  const amount = Number(source?.amount ?? source?.amountDisplay ?? source?.grossSales ?? source?.gross_sales ?? source?.total ?? 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0);
}

const LIGHT_BG = '#f5f7f3';

const styles = StyleSheet.create({
  page: {
    paddingBottom: 28,
    gap: 12,
  },
  rangeTabs: {
    gap: 8,
    paddingVertical: 4,
  },
  rangeTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e3d9',
  },
  rangeTabActive: {
    backgroundColor: '#4f9d69',
    borderColor: '#4f9d69',
  },
  rangeTabText: {
    color: '#475569',
    fontWeight: '800',
  },
  rangeTabTextActive: {
    color: '#ffffff',
  },
  filterCard: {
    gap: 10,
  },
  sectionLabel: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#0f172a',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexBasis: '48%',
    gap: 4,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  chartCard: {
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLabel: {
    color: '#475569',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusValue: {
    color: '#0f172a',
    fontWeight: '900',
  },
  bottomGap: {
    height: 20,
  },
});
