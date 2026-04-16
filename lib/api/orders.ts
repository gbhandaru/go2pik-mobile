import { apiRequest } from '@/lib/api/client';
import { getKitchenRestaurantId } from '@/lib/auth-storage';

export function fetchOrders() {
  return apiRequest('/orders', { scope: 'customer' });
}

export function submitOrder(payload: Record<string, unknown>) {
  return apiRequest('/orders', { method: 'POST', body: payload, scope: 'customer' });
}

export function fetchOrderById(id: string) {
  return apiRequest(`/orders/${id}`, { scope: 'customer' });
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
