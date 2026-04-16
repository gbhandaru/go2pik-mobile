function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

export const ENV = {
  API_BASE_URL: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || ''),
};
