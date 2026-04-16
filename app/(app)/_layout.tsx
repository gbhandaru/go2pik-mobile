import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#8ca0be',
        tabBarStyle: {
          backgroundColor: '#111b2e',
          borderTopColor: 'rgba(159, 177, 202, 0.12)',
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

