export function formatCurrency(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 10) return value;
  const trimmed = digits.slice(-10);
  return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(6)}`;
}

export function formatTimestamp(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPickupLabel(value?: string | null) {
  if (!value) return 'Pickup soon';
  return value;
}

export function formatTimeFromNow(minutes: number) {
  const date = new Date(Date.now() + minutes * 60000);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

