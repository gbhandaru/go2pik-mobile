export type OrderConfirmation = {
  order: unknown;
  customerName?: string;
};

let latestConfirmation: OrderConfirmation | null = null;

export function saveOrderConfirmation(value: OrderConfirmation | null) {
  latestConfirmation = value;
}

export function getOrderConfirmation() {
  return latestConfirmation;
}

export function clearOrderConfirmation() {
  latestConfirmation = null;
}

