import { ENV } from '@/lib/config';
import {
  clearAuthTokens,
  clearKitchenAuthTokens,
  getAuthToken,
  getKitchenAuthToken,
  getKitchenRefreshToken,
  getRefreshToken,
  setAuthNotice,
  setKitchenAuthNotice,
  storeAuthTokens,
  storeKitchenAuthTokens,
} from '@/lib/auth-storage';

type SessionScope = 'customer' | 'kitchen';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
  scope?: SessionScope;
  _retried?: boolean;
};

function getToken(scope: SessionScope) {
  return scope === 'kitchen' ? getKitchenAuthToken() : getAuthToken();
}

function getRefresh(scope: SessionScope) {
  return scope === 'kitchen' ? getKitchenRefreshToken() : getRefreshToken();
}

function getRefreshEndpoint(scope: SessionScope) {
  return scope === 'kitchen' ? '/auth/restaurant-users/refresh' : '/auth/customers/refresh';
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function refreshActiveSession(scope: SessionScope) {
  const refreshToken = getRefresh(scope);
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${ENV.API_BASE_URL}${getRefreshEndpoint(scope)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await parseJson(response);
    if (!response.ok) return false;

    const accessToken = data?.access_token || data?.accessToken || null;
    const nextRefreshToken = data?.refresh_token || data?.refreshToken || null;
    const profile = data?.user || data?.profile || data?.customer || null;

    if (scope === 'kitchen') {
      storeKitchenAuthTokens({ accessToken, refreshToken: nextRefreshToken, profile });
    } else {
      storeAuthTokens({ accessToken, refreshToken: nextRefreshToken, profile });
    }

    return Boolean(accessToken);
  } catch {
    return false;
  }
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  const scope = options.scope ?? 'customer';
  const token = options.auth === false ? null : getToken(scope);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const body =
    options.body == null
      ? undefined
      : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);

  const url = `${ENV.API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const message = data?.error || data?.message || 'API request failed';
    const shouldRetry = (response.status === 401 || response.status === 403) && options.auth !== false && !options._retried;
    if (shouldRetry) {
      const refreshed = await refreshActiveSession(scope);
      if (refreshed) {
        return apiRequest(path, { ...options, _retried: true });
      }
    }

    if (response.status === 401 || response.status === 403) {
      if (scope === 'kitchen') {
        clearKitchenAuthTokens();
        setKitchenAuthNotice('Session expired. Please sign in again.');
      } else {
        clearAuthTokens();
        setAuthNotice('Session expired. Please sign in again.');
      }
    }

    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return data;
}

