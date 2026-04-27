import { apiRequest } from '@/lib/api/client';
import { getKitchenRestaurantId } from '@/lib/auth-storage';

export function fetchOrders() {
  return apiRequest('/orders', { scope: 'customer' });
}

export function submitOrder(payload: Record<string, unknown>) {
  return apiRequest('/orders', { method: 'POST', body: payload, scope: 'customer' });
}

export function startOrderVerification(payload: Record<string, unknown>) {
  return apiRequest('/orders/verification/start', {
    method: 'POST',
    body: payload,
    auth: false,
    scope: 'customer',
  });
}

export function resendOrderVerification(payload: Record<string, unknown>) {
  return apiRequest('/orders/verification/resend', {
    method: 'POST',
    body: payload,
    auth: false,
    scope: 'customer',
  });
}

export function confirmOrderVerification(payload: Record<string, unknown>) {
  return apiRequest('/orders/verification/confirm', {
    method: 'POST',
    body: payload,
    auth: false,
    scope: 'customer',
  });
}

export function fetchOrderById(id: string) {
  return apiRequest(`/orders/${id}`, { scope: 'customer' });
}

export function fetchOrderReview(orderNumber: string, token: string) {
  if (!orderNumber) throw new Error('orderNumber is required');
  if (!token) throw new Error('token is required');

  return apiRequest(`/orders/review/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(token)}`, {
    auth: false,
    scope: 'customer',
  });
}

export function acceptReviewedOrder(orderNumber: string, token: string) {
  if (!orderNumber) throw new Error('orderNumber is required');
  if (!token) throw new Error('token is required');

  return apiRequest(`/orders/review/${encodeURIComponent(orderNumber)}/accept-updated?token=${encodeURIComponent(token)}`, {
    method: 'PATCH',
    auth: false,
    scope: 'customer',
    body: {},
  });
}

export function cancelReviewedOrder(orderNumber: string, token: string, note?: string) {
  if (!orderNumber) throw new Error('orderNumber is required');
  if (!token) throw new Error('token is required');

  return apiRequest(`/orders/review/${encodeURIComponent(orderNumber)}/cancel?token=${encodeURIComponent(token)}`, {
    method: 'PATCH',
    auth: false,
    scope: 'customer',
    body: note ? { note } : {},
  });
}

export function fetchOrdersByStatus(status?: string) {
  const restaurantId = getKitchenRestaurantId();
  if (!restaurantId) {
    throw new Error('restaurantId is required');
  }

  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/dashboard/restaurants/${encodeURIComponent(restaurantId)}/orders${query}`, {
    scope: 'kitchen',
  });
}

export function fetchKitchenOrdersReport(restaurantId: string, query = '') {
  if (!restaurantId) {
    throw new Error('restaurantId is required');
  }

  return apiRequest(`/dashboard/restaurants/${encodeURIComponent(restaurantId)}/reports/orders${query}`, {
    scope: 'kitchen',
  });
}

function getKitchenActionRequest(orderId: string, status: string, options: { rejectReason?: string } = {}) {
  const actionPaths: Record<string, string> = {
    accepted: `/dashboard/orders/${encodeURIComponent(orderId)}/accept`,
    preparing: `/dashboard/orders/${encodeURIComponent(orderId)}/preparing`,
    ready_for_pickup: `/dashboard/orders/${encodeURIComponent(orderId)}/ready`,
    completed: `/dashboard/orders/${encodeURIComponent(orderId)}/complete`,
    rejected: `/dashboard/orders/${encodeURIComponent(orderId)}/reject`,
  };

  const path = actionPaths[status];
  if (!path) {
    throw new Error(`Unsupported kitchen status: ${status}`);
  }

  const body = status === 'rejected' ? { reject_reason: options.rejectReason || 'Rejected from kitchen dashboard' } : undefined;
  return { path, body };
}

export function updateOrderStatus(orderId: string, status: string, options: { rejectReason?: string } = {}) {
  const request = getKitchenActionRequest(orderId, status, options);

  return apiRequest(request.path, {
    method: 'PATCH',
    ...(request.body ? { body: request.body } : {}),
    scope: 'kitchen',
  });
}
