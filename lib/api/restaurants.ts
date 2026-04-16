import { apiRequest } from '@/lib/api/client';

export function fetchRestaurants() {
  return apiRequest('/restaurants', { scope: 'customer' });
}

export function fetchRestaurantMenu(id: string | number) {
  return apiRequest(`/restaurants/${id}/menu`, { scope: 'customer' });
}
