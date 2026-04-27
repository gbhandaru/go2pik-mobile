export function formatRestaurantAddress(restaurant: Record<string, unknown> | null | undefined) {
  const { line1, secondary } = getRestaurantAddressLines(restaurant);
  return [line1, secondary].filter(Boolean).join(' • ');
}

export function getRestaurantAddressLines(restaurant: Record<string, unknown> | null | undefined) {
  if (!restaurant) {
    return { line1: '', secondary: '' };
  }

  const nestedAddress =
    typeof restaurant.address === 'object' && restaurant.address ? (restaurant.address as Record<string, unknown>) : null;
  const line1 =
    String(
      nestedAddress?.line1 ||
        nestedAddress?.address_line1 ||
        nestedAddress?.addressLine1 ||
        nestedAddress?.street ||
        restaurant.address_line1 ||
        restaurant.addressLine1 ||
        restaurant.address1 ||
        restaurant.street ||
        '',
    ).trim();
  const line2 = String(nestedAddress?.line2 || nestedAddress?.address_line2 || nestedAddress?.addressLine2 || '').trim();
  const city = String(nestedAddress?.city || restaurant.city || '').trim();
  const state = String(nestedAddress?.state || restaurant.state || '').trim();
  const postalCode = String(
    nestedAddress?.postal_code ||
      nestedAddress?.postalCode ||
      nestedAddress?.zip ||
      restaurant.postal_code ||
      restaurant.postalCode ||
      restaurant.zip ||
      '',
  ).trim();
  const formatted = String(
    nestedAddress?.formatted ||
      nestedAddress?.formattedAddress ||
      restaurant.formatted ||
      restaurant.formattedAddress ||
      restaurant.formatted_address ||
      '',
  ).trim();
  const cityStateZip = [city, state, postalCode].filter(Boolean).join(', ');
  const secondary = line2 || formatted || cityStateZip;

  return { line1, secondary };
}
