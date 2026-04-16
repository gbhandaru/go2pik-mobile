import { formatCurrency, formatTimestamp } from '@/lib/format';

export type KitchenOrder = {
  id: string;
  orderNumber?: string;
  displayId?: string;
  status?: string;
  customerName?: string;
  pickupType?: string;
  pickupTime?: string;
  pickupAt?: string;
  scheduledPickupTime?: string;
  total?: number;
  totalDisplay?: number | string;
  totalItems?: number;
  items?: Array<{ id?: string; name?: string; quantity?: number; specialInstructions?: string }>;
  createdAt?: string;
  placedAt?: string;
  completedAt?: string;
};

export const KITCHEN_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function getKitchenOrderNumber(order: KitchenOrder) {
  return order.orderNumber || order.displayId || order.id;
}

export function getKitchenCustomerName(order: KitchenOrder) {
  return order.customerName || 'Guest';
}

export function getKitchenTotalItems(order: KitchenOrder) {
  if (typeof order.totalItems === 'number') {
    return order.totalItems;
  }
  return order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
}

export function getKitchenStatusLabel(status?: string) {
  if (!status) return 'New';
  return KITCHEN_STATUS_LABELS[status] || status;
}

export function getKitchenPickupTime(order: KitchenOrder) {
  return order.pickupTime || order.pickupAt || order.scheduledPickupTime || '';
}

export function getKitchenAgeMinutes(order: KitchenOrder) {
  const timestamp = order.createdAt || order.placedAt || order.completedAt || null;
  if (!timestamp) return 0;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, (Date.now() - date.getTime()) / 60000);
}

export function getKitchenWaitLabel(order: KitchenOrder) {
  const minutes = Math.round(getKitchenAgeMinutes(order));
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function getKitchenTotalValue(order: KitchenOrder) {
  if (typeof order.total === 'number') return formatCurrency(order.total);
  if (typeof order.totalDisplay === 'number') return formatCurrency(order.totalDisplay);
  if (typeof order.totalDisplay === 'string') return order.totalDisplay;
  return '—';
}

export function formatKitchenOrderTime(order: KitchenOrder) {
  const timestamp = order.createdAt || order.placedAt || order.completedAt || null;
  return formatTimestamp(timestamp);
}

export function getKitchenItemInstructions(item: { specialInstructions?: string } | undefined) {
  if (!item) return '';
  return item.specialInstructions || '';
}

