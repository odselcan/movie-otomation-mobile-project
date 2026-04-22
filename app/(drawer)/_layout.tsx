// app/(drawer)/_layout.tsx

import NetworkBanner from '@/components/NetworkBanner';
import { useBrightness } from '@/hooks/useSensors';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';

// ✅ headerRight'ı ayrı component olarak tanımla — closure problemi yok
function BrightnessButton() {
  const { isCinemaMode, toggleCinemaMode } = useBrightness();

  return (
    <TouchableOpacity onPress={toggleCinemaMode} style={{ marginRight: 16 }}>
      <Ionicons
        name={isCinemaMode ? 'film' : 'sunny-outline'}
        size={22}
        color={isCinemaMode ? '#FFD700' : '#DB7093'}
      />
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  return (
    <>
      <NetworkBanner />

      <Drawer
        screenOptions={{
          headerShown: true,
          headerTintColor: '#DB7093',
          drawerActiveTintColor: '#DB7093',
          drawerStyle: { backgroundColor: '#FFF5F7' },
          headerRight: () => <BrightnessButton />,
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{ drawerLabel: '🏠 Ana Sayfa', headerTitle: 'Film Dünyası' }}
        />
        <Drawer.Screen
          name="map"
          options={{ drawerLabel: '📍 Yakındaki Sinemalar', headerTitle: 'Sinemalar' }}
        />
        <Drawer.Screen
          name="favorites"
          options={{ drawerLabel: '💖 Favoriler', headerTitle: 'Favorilerim' }}
        />
        <Drawer.Screen
          name="watchlist"
          options={{ drawerLabel: '📝 İzlenecekler', headerTitle: 'İzleme Listem' }}
        />
        <Drawer.Screen
          name="notifications-test"
          options={{ drawerLabel: '🔔 Bildirimler', headerTitle: '💖 Bildirimler' }}
        />
      </Drawer>
    </>
  );
}