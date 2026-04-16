export function formatRestaurantAddress(restaurant: Record<string, unknown> | null | undefined) {
  if (!restaurant) return '';

  const line1 =
    (restaurant.address_line1 as string | undefined) ||
    (restaurant.addressLine1 as string | undefined) ||
    (restaurant.address1 as string | undefined) ||
    (restaurant.street as string | undefined) ||
    '';
  const line2 = (restaurant.address_line2 as string | undefined) || (restaurant.addressLine2 as string | undefined) || '';
  const cityStateZip = [
    restaurant.city,
    restaurant.state,
    restaurant.postal_code || restaurant.postalCode || restaurant.zip,
  ]
    .filter(Boolean)
    .join(', ');
  const location = (restaurant.location as string | undefined) || '';

  return [line1, line2, cityStateZip, location].filter(Boolean).join(' • ');
}

