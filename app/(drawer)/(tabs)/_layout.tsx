import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useI18n } from '../../../hooks/useI18n'; // ← 1. import

export default function TabLayout() {
  const { t } = useI18n();  // ← 2. hook

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#DB7093',
        tabBarInactiveTintColor: '#c0a0b0',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#FFD1DC',
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.films'),   // ← 3. 'Filmler' yerine
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: t('tabs.series'),  // ← 'Diziler' yerine
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="tv-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'), // ← 'Keşfet' yerine
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}