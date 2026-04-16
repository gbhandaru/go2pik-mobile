import { apiRequest } from '@/lib/api/client';
import { clearAuthTokens, clearKitchenAuthTokens, getAuthToken, getKitchenAuthToken } from '@/lib/auth-storage';

async function safeRequest(path: string, options: Parameters<typeof apiRequest>[1] = {}) {
  try {
    return await apiRequest(path, options);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Request failed');
  }
}

export function customerSignup(payload: Record<string, unknown>) {
  return safeRequest('/auth/customers/signup', {
    method: 'POST',
    body: payload,
    auth: false,
    scope: 'customer',
  });
}

export function customerLogin(payload: Record<string, unknown>) {
  return safeRequest('/auth/customers/login', {
    method: 'POST',
    body: payload,
    auth: false,
    scope: 'customer',
  });
}

export function customerRefreshSession(refreshToken: string) {
  return safeRequest('/auth/customers/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    scope: 'customer',
  });
}

export function updateCustomerPassword(payload: Record<string, unknown>) {
  return safeRequest('/auth/customers/profile', {
    method: 'PUT',
    body: payload,
    scope: 'customer',
  });
}

export function customerLogout(refreshToken: string) {
  return safeRequest('/auth/customers/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    scope: 'customer',
  });
}

export async function fetchCustomerProfile() {
  const token = getAuthToken();
  if (!token) throw new Error('Missing token');
  try {
    return await safeRequest('/auth/customers/me', { scope: 'customer' });
  } catch (error) {
    clearAuthTokens();
    throw error;
  }
}

export function restaurantUserLogin(payload: Record<string, unknown>) {
  return safeRequest('/auth/restaurant-users/login', {
    method: 'POST',
    body: payload,
    auth: false,
    scope: 'kitchen',
  });
}

export function restaurantUserRefreshSession(refreshToken: string) {
  return safeRequest('/auth/restaurant-users/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    scope: 'kitchen',
  });
}

export function restaurantUserLogout(refreshToken: string) {
  return safeRequest('/auth/restaurant-users/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    scope: 'kitchen',
  });
}

export function fetchRestaurantProfile() {
  return safeRequest('/auth/restaurant-users/me', { scope: 'kitchen' });
}

export function createRestaurantUser(restaurantId: string | number, payload: Record<string, unknown>) {
  const normalizedRestaurantId = String(restaurantId || '').trim();
  if (!normalizedRestaurantId) {
    throw new Error('restaurantId is required');
  }
  if (!/^\d+$/.test(normalizedRestaurantId)) {
    throw new Error('Restaurant ID must be numeric.');
  }

  return safeRequest(`/restaurants/${normalizedRestaurantId}/users`, {
    method: 'POST',
    body: payload,
    scope: 'kitchen',
  });
}

