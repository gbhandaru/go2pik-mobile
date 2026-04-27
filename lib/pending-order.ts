import * as SecureStore from 'expo-secure-store';

export type PendingOrder = {
  restaurantId: string;
  restaurantName: string;
  restaurantRouteKey?: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
    imageUrl?: string;
    sku?: string;
  }[];
  pickupMode: 'ASAP' | 'SCHEDULED';
  scheduledPickupTime: string;
  pickupSummary?: string;
  pickupDisplayTime?: string;
  pickupReadyTime?: string;
  customerName?: string;
  customerPhone?: string;
  smsConsentAccepted?: boolean;
};

export type CustomerOrderVerification = {
  id?: string;
  phone?: string;
  otpLength?: number;
  expiresAt?: string;
  resendAvailableAt?: string;
  verificationToken?: string;
};

const PENDING_ORDER_KEY = 'go2pik.pendingOrder';
const ORDER_VERIFICATION_KEY = 'go2pik.orderVerification';

let pendingOrder: PendingOrder | null = null;
let orderVerification: CustomerOrderVerification | null = null;

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function safeStorage() {
  const globalAny = globalThis as typeof globalThis & { localStorage?: Storage };
  if (typeof globalAny.localStorage !== 'undefined') {
    return globalAny.localStorage;
  }
  return null;
}

async function readPersistedOrder() {
  const storage = safeStorage();
  if (storage) {
    return storage.getItem(PENDING_ORDER_KEY);
  }

  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  try {
    return await SecureStore.getItemAsync(PENDING_ORDER_KEY);
  } catch {
    return null;
  }
}

async function writePersistedOrder(value: string) {
  const storage = safeStorage();
  if (storage) {
    storage.setItem(PENDING_ORDER_KEY, value);
    return;
  }

  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.setItemAsync(PENDING_ORDER_KEY, value);
  } catch {
    // Ignore persistence failures and keep the in-memory cache.
  }
}

async function removePersistedOrder() {
  const storage = safeStorage();
  if (storage) {
    storage.removeItem(PENDING_ORDER_KEY);
  }

  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(PENDING_ORDER_KEY);
  } catch {
    // Ignore persistence failures and keep the in-memory cache.
  }
}

export async function hydratePendingOrderStorage() {
  if (typeof window !== 'undefined') {
    return;
  }

  const raw = await readPersistedOrder();
  if (!raw) {
    pendingOrder = null;
    return;
  }

  try {
    pendingOrder = JSON.parse(raw) as PendingOrder;
  } catch {
    pendingOrder = null;
  }
}

async function readPersistedVerification() {
  const storage = safeStorage();
  if (storage) {
    return storage.getItem(ORDER_VERIFICATION_KEY);
  }

  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  try {
    return await SecureStore.getItemAsync(ORDER_VERIFICATION_KEY);
  } catch {
    return null;
  }
}

async function writePersistedVerification(value: string) {
  const storage = safeStorage();
  if (storage) {
    storage.setItem(ORDER_VERIFICATION_KEY, value);
    return;
  }

  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.setItemAsync(ORDER_VERIFICATION_KEY, value);
  } catch {
    // Ignore persistence failures and keep the in-memory cache.
  }
}

async function removePersistedVerification() {
  const storage = safeStorage();
  if (storage) {
    storage.removeItem(ORDER_VERIFICATION_KEY);
  }

  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(ORDER_VERIFICATION_KEY);
  } catch {
    // Ignore persistence failures and keep the in-memory cache.
  }
}

export async function hydrateOrderVerificationStorage() {
  if (typeof window !== 'undefined') {
    return;
  }

  const raw = await readPersistedVerification();
  if (!raw) {
    orderVerification = null;
    return;
  }

  try {
    orderVerification = JSON.parse(raw) as CustomerOrderVerification;
  } catch {
    orderVerification = null;
  }
}

export function savePendingOrder(next: PendingOrder | null) {
  pendingOrder = next;
  void (async () => {
    if (next) {
      await writePersistedOrder(JSON.stringify(next));
    } else {
      await removePersistedOrder();
    }
  })();
}

export function getPendingOrder() {
  return pendingOrder;
}

export function clearPendingOrder() {
  pendingOrder = null;
  void removePersistedOrder();
}

export function saveOrderVerification(next: CustomerOrderVerification | null) {
  orderVerification = next;
  void (async () => {
    if (next) {
      await writePersistedVerification(JSON.stringify(next));
    } else {
      await removePersistedVerification();
    }
  })();
}

export function getOrderVerification() {
  return orderVerification;
}

export function clearOrderVerification() {
  orderVerification = null;
  void removePersistedVerification();
}
