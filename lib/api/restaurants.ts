import { apiRequest } from '@/lib/api/client';

type RestaurantsResponse = unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeRestaurantsResponse(response: RestaurantsResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isRecord(response)) {
    return [];
  }

  const candidates = [
    response.restaurants,
    response.data,
    isRecord(response.data) ? response.data.restaurants : undefined,
    response.items,
    response.results,
    response.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function fetchRestaurants() {
  return apiRequest('/restaurants').then(normalizeRestaurantsResponse);
}

export function fetchRestaurantMenu(id: string | number) {
  return apiRequest(`/restaurants/${id}/menu`, { scope: 'customer' });
}
