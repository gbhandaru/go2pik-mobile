import { apiRequest } from '@/lib/api/client';

export function fetchTwilioVerifyHealth() {
  return apiRequest('/health/twilio-verify', {
    auth: false,
    scope: 'customer',
  });
}
