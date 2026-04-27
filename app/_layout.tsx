import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { CustomerAuthProvider } from '@/hooks/useCustomerAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hydrateAuthStorage } from '@/lib/auth-storage';
import { hydrateOrderVerificationStorage, hydratePendingOrderStorage } from '@/lib/pending-order';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    void Promise.all([hydrateAuthStorage(), hydratePendingOrderStorage(), hydrateOrderVerificationStorage()]).finally(() => {
      if (mounted) {
        setHydrated(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!hydrated) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
          <ActivityIndicator color="#f97316" />
        </View>
        <StatusBar style="dark" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CustomerAuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f9fafb' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="password-update" />
          <Stack.Screen name="restaurants/[restaurantId]" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="order-confirmation" />
          <Stack.Screen name="verification" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="order/[orderNumber]" />
          <Stack.Screen name="kitchen" />
          <Stack.Screen name="not-found" />
        </Stack>
      </CustomerAuthProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
