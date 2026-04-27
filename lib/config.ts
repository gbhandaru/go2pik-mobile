function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

const PREVIEW_API_BASE_URL = 'https://go2pik-api-preview-738401830134.us-central1.run.app/api';
const PRODUCTION_API_BASE_URL = 'https://api.go2pik.com/api';

export const ENV = {
  API_BASE_URL: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || ''),
  API_BASE_URLS: Array.from(
    new Set(
      [
        process.env.EXPO_PUBLIC_API_BASE_URL,
        __DEV__ ? PREVIEW_API_BASE_URL : PRODUCTION_API_BASE_URL,
        PREVIEW_API_BASE_URL,
        PRODUCTION_API_BASE_URL,
      ]
        .filter(Boolean)
        .map((value) => normalizeBaseUrl(String(value))),
    ),
  ),
};
