import { Stack } from 'expo-router';

export default function KitchenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="users/new" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

