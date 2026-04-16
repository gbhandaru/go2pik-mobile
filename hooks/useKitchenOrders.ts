import { useCallback, useEffect, useState } from 'react';
import { fetchOrdersByStatus } from '@/lib/api/orders';

function normalizeOrdersResponse(response: unknown) {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    if (Array.isArray(record.orders)) return record.orders;
    if (Array.isArray(record.data)) return record.data;
    const data = record.data as Record<string, unknown> | undefined;
    if (data && Array.isArray(data.orders)) return data.orders;
  }
  return [];
}

export function useKitchenOrders(status = 'new', refreshIntervalMs = 60000) {
  const [orders, setOrders] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchOrdersByStatus(status);
      setOrders(normalizeOrdersResponse(response));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadOrders();
    }, refreshIntervalMs);

    return () => clearInterval(id);
  }, [loadOrders, refreshIntervalMs]);

  return { orders, loading, error, refresh: loadOrders, lastUpdated };
}

