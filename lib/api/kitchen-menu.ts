import { apiRequest } from '@/lib/api/client';
import { getKitchenRestaurantId } from '@/lib/auth-storage';

function resolveRestaurantId(explicitRestaurantId?: string | number | null) {
  return explicitRestaurantId || getKitchenRestaurantId() || null;
}

function normalizeMenuItems(response: unknown) {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.menu)) return record.menu;
    const data = record.data as Record<string, unknown> | undefined;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.menu)) return data.menu;
  }
  return [];
}

function normalizeCategories(response: unknown) {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    if (Array.isArray(record.categories)) return record.categories;
    const data = record.data as Record<string, unknown> | undefined;
    if (data && Array.isArray(data.categories)) return data.categories;
  }
  return [];
}

function normalizeExportResponse(response: unknown) {
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const data = record.data as Record<string, unknown> | undefined;
    return {
      restaurant: (record.restaurant || data?.restaurant || null) as unknown,
      categories: normalizeCategories(record.categories || data?.categories || []),
      uncategorized_items: (record.uncategorized_items || data?.uncategorized_items || []) as unknown[],
    };
  }

  return { restaurant: null, categories: [], uncategorized_items: [] };
}

export async function fetchKitchenMenuItems(restaurantId?: string | number | null) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) {
    throw new Error('restaurantId is required');
  }

  const response = await apiRequest(`/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu`, {
    scope: 'kitchen',
  });

  const record = response as Record<string, unknown>;
  const data = (record?.data as Record<string, unknown> | undefined) || {};
  return {
    restaurant: (record?.restaurant || data.restaurant || null) as unknown,
    items: normalizeMenuItems(response),
  };
}

export async function fetchKitchenMenuCategories(restaurantId?: string | number | null) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) {
    throw new Error('restaurantId is required');
  }

  const response = await apiRequest(`/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu/categories`, {
    scope: 'kitchen',
  });

  return normalizeCategories(response);
}

export function toggleKitchenMenuItemAvailability(menuItemId: string, payload: Record<string, unknown>) {
  if (!menuItemId) throw new Error('menuItemId is required');
  return apiRequest(`/dashboard/menu-items/${encodeURIComponent(menuItemId)}/availability`, {
    method: 'PATCH',
    body: payload,
    scope: 'kitchen',
  });
}

export function updateKitchenMenuItem(menuItemId: string, payload: Record<string, unknown>) {
  if (!menuItemId) throw new Error('menuItemId is required');
  return apiRequest(`/dashboard/menu-items/${encodeURIComponent(menuItemId)}`, {
    method: 'PUT',
    body: payload,
    scope: 'kitchen',
  });
}

export function deleteKitchenMenuItem(menuItemId: string) {
  if (!menuItemId) throw new Error('menuItemId is required');
  return apiRequest(`/dashboard/menu-items/${encodeURIComponent(menuItemId)}`, {
    method: 'DELETE',
    scope: 'kitchen',
  });
}

export function createKitchenMenuItem(restaurantId: string | number, payload: Record<string, unknown>) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) throw new Error('restaurantId is required');
  return apiRequest(`/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu`, {
    method: 'POST',
    body: payload,
    scope: 'kitchen',
  });
}

export function createKitchenMenuCategory(restaurantId: string | number, payload: Record<string, unknown>) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) throw new Error('restaurantId is required');
  return apiRequest(`/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu/categories`, {
    method: 'POST',
    body: payload,
    scope: 'kitchen',
  });
}

export function updateKitchenMenuCategory(restaurantId: string | number, categoryId: string, payload: Record<string, unknown>) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) throw new Error('restaurantId is required');
  if (!categoryId) throw new Error('categoryId is required');
  return apiRequest(
    `/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu/categories/${encodeURIComponent(categoryId)}`,
    { method: 'PUT', body: payload, scope: 'kitchen' },
  );
}

export function fetchKitchenMenuExport(restaurantId: string | number) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) throw new Error('restaurantId is required');
  return apiRequest(`/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu/export`, {
    scope: 'kitchen',
  }).then(normalizeExportResponse);
}

export function importKitchenMenuCsv(restaurantId: string | number, csvText: string) {
  const resolvedRestaurantId = resolveRestaurantId(restaurantId);
  if (!resolvedRestaurantId) throw new Error('restaurantId is required');
  return apiRequest(`/dashboard/restaurants/${encodeURIComponent(resolvedRestaurantId)}/menu/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvText,
    scope: 'kitchen',
  });
}
