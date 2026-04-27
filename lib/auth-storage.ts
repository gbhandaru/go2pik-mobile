import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'go2pik.accessToken';
const REFRESH_TOKEN_KEY = 'go2pik.refreshToken';
const PROFILE_KEY = 'go2pik.profile';
const KITCHEN_ACCESS_TOKEN_KEY = 'go2pik.kitchenAccessToken';
const KITCHEN_REFRESH_TOKEN_KEY = 'go2pik.kitchenRefreshToken';
const KITCHEN_PROFILE_KEY = 'go2pik.kitchenProfile';
const AUTH_NOTICE_KEY = 'go2pik.authNotice';
const KITCHEN_AUTH_NOTICE_KEY = 'go2pik.kitchenAuthNotice';
const CUSTOMER_GUEST_ACCESS_KEY = 'go2pik.customerGuestAccess';

type Store = Record<string, string>;
type KeyName =
  | typeof ACCESS_TOKEN_KEY
  | typeof REFRESH_TOKEN_KEY
  | typeof PROFILE_KEY
  | typeof KITCHEN_ACCESS_TOKEN_KEY
  | typeof KITCHEN_REFRESH_TOKEN_KEY
  | typeof KITCHEN_PROFILE_KEY
  | typeof AUTH_NOTICE_KEY
  | typeof KITCHEN_AUTH_NOTICE_KEY
  | typeof CUSTOMER_GUEST_ACCESS_KEY;

const SECURE_KEYS: KeyName[] = [
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  PROFILE_KEY,
  KITCHEN_ACCESS_TOKEN_KEY,
  KITCHEN_REFRESH_TOKEN_KEY,
  KITCHEN_PROFILE_KEY,
  AUTH_NOTICE_KEY,
  KITCHEN_AUTH_NOTICE_KEY,
  CUSTOMER_GUEST_ACCESS_KEY,
];

function getMemoryStore(): Store {
  const globalAny = globalThis as typeof globalThis & { __go2pikStore?: Store };
  if (!globalAny.__go2pikStore) {
    globalAny.__go2pikStore = {};
  }
  return globalAny.__go2pikStore;
}

function safeStorage() {
  const globalAny = globalThis as typeof globalThis & { localStorage?: Storage };
  if (typeof globalAny.localStorage !== 'undefined') {
    return globalAny.localStorage;
  }
  return null;
}

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readSecureItem(key: string) {
  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeSecureItem(key: string, value: string) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore persistence failures and keep the in-memory cache.
  }
}

async function removeSecureItem(key: string) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore persistence failures and keep the in-memory cache.
  }
}

function readItem(key: string) {
  const storage = safeStorage();
  if (storage) return storage.getItem(key);
  return getMemoryStore()[key] ?? null;
}

async function writeItem(key: string, value: string) {
  const storage = safeStorage();
  if (storage) {
    storage.setItem(key, value);
  } else {
    getMemoryStore()[key] = value;
  }

  await writeSecureItem(key, value);
}

async function removeItem(key: string) {
  const storage = safeStorage();
  if (storage) {
    storage.removeItem(key);
  }
  delete getMemoryStore()[key];
  await removeSecureItem(key);
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function hydrateAuthStorage() {
  if (typeof window !== 'undefined') {
    return;
  }

  const storage = safeStorage();
  if (storage) {
    for (const key of SECURE_KEYS) {
      const value = storage.getItem(key);
      if (value != null) {
        getMemoryStore()[key] = value;
      }
    }
    return;
  }

  for (const key of SECURE_KEYS) {
    const value = await readSecureItem(key);
    if (value != null) {
      getMemoryStore()[key] = value;
    }
  }
}

export function getAuthToken() {
  return readItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return readItem(REFRESH_TOKEN_KEY);
}

export function getStoredProfile<T = unknown>() {
  return parseJson(readItem(PROFILE_KEY)) as T | null;
}

export function storeAuthTokens({
  accessToken,
  refreshToken,
  profile,
}: {
  accessToken?: string | null;
  refreshToken?: string | null;
  profile?: unknown | null;
}) {
  void (async () => {
    if (accessToken) await writeItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await writeItem(REFRESH_TOKEN_KEY, refreshToken);
    if (profile) await writeItem(PROFILE_KEY, JSON.stringify(profile));
  })();
}

export function clearAuthTokens() {
  void (async () => {
    await removeItem(ACCESS_TOKEN_KEY);
    await removeItem(REFRESH_TOKEN_KEY);
    await removeItem(PROFILE_KEY);
  })();
}

export function setAuthNotice(message: string | null) {
  void (async () => {
    if (message) await writeItem(AUTH_NOTICE_KEY, message);
    else await removeItem(AUTH_NOTICE_KEY);
  })();
}

export function consumeAuthNotice() {
  const message = readItem(AUTH_NOTICE_KEY) || '';
  removeItem(AUTH_NOTICE_KEY);
  return message;
}

export function hasCustomerGuestAccess() {
  return readItem(CUSTOMER_GUEST_ACCESS_KEY) === 'true';
}

export function setCustomerGuestAccess(enabled: boolean) {
  void (async () => {
    if (enabled) await writeItem(CUSTOMER_GUEST_ACCESS_KEY, 'true');
    else await removeItem(CUSTOMER_GUEST_ACCESS_KEY);
  })();
}

export function clearCustomerGuestAccess() {
  void removeItem(CUSTOMER_GUEST_ACCESS_KEY);
}

export function getKitchenAuthToken() {
  return readItem(KITCHEN_ACCESS_TOKEN_KEY);
}

export function getKitchenRefreshToken() {
  return readItem(KITCHEN_REFRESH_TOKEN_KEY);
}

export function getStoredKitchenProfile<T = unknown>() {
  return parseJson(readItem(KITCHEN_PROFILE_KEY)) as T | null;
}

function extractKitchenRestaurantId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim();
    return normalized || null;
  }
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  for (const key of ['restaurantId', 'restaurant_id', 'restaurantID', 'restaurantUuid', 'restaurant_uuid']) {
    if (key in record) {
      const match = extractKitchenRestaurantId(record[key]);
      if (match) return match;
    }
  }
  for (const key of ['restaurant', 'restaurant_data', 'restaurantData', 'data', 'profile', 'user']) {
    if (key in record) {
      const match = extractKitchenRestaurantId(record[key]);
      if (match) return match;
    }
  }
  return null;
}

export function getKitchenRestaurantId() {
  return extractKitchenRestaurantId(getStoredKitchenProfile());
}

export function storeKitchenAuthTokens({
  accessToken,
  refreshToken,
  profile,
}: {
  accessToken?: string | null;
  refreshToken?: string | null;
  profile?: unknown | null;
}) {
  void (async () => {
    if (accessToken) await writeItem(KITCHEN_ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await writeItem(KITCHEN_REFRESH_TOKEN_KEY, refreshToken);
    if (profile) await writeItem(KITCHEN_PROFILE_KEY, JSON.stringify(profile));
  })();
}

export function clearKitchenAuthTokens() {
  void (async () => {
    await removeItem(KITCHEN_ACCESS_TOKEN_KEY);
    await removeItem(KITCHEN_REFRESH_TOKEN_KEY);
    await removeItem(KITCHEN_PROFILE_KEY);
  })();
}

export function setKitchenAuthNotice(message: string | null) {
  void (async () => {
    if (message) await writeItem(KITCHEN_AUTH_NOTICE_KEY, message);
    else await removeItem(KITCHEN_AUTH_NOTICE_KEY);
  })();
}

export function consumeKitchenAuthNotice() {
  const message = readItem(KITCHEN_AUTH_NOTICE_KEY) || '';
  removeItem(KITCHEN_AUTH_NOTICE_KEY);
  return message;
}
