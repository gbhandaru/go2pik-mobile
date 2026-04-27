import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function CustomerTabsLayout() {
  return (
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 22, default: 10 }),
          height: Platform.select({ ios: 92, default: 72 }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
