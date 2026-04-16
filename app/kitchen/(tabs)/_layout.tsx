import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function KitchenTabsLayout() {
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
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ready"
        options={{
          title: 'Ready',
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-check-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: 'Done',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

