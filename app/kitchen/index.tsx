import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { getKitchenAuthToken, getKitchenRefreshToken } from '@/lib/auth-storage';
import { replaceRoute } from '@/lib/navigation';

export default function KitchenIndex() {
  const router = useRouter();
  const hasSession = Boolean(getKitchenAuthToken() || getKitchenRefreshToken());
  useEffect(() => {
    replaceRoute(router, hasSession ? '/kitchen/orders' : '/kitchen/login');
  }, [hasSession, router]);
  return null;
}
