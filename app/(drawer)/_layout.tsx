// app/(drawer)/_layout.tsx
// i18n + LanguageSwitcher header'a eklendi

import NetworkBanner from '@/components/NetworkBanner';
import { useBrightness } from '@/hooks/useSensors';
import { useI18n } from '@/hooks/useI18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity, View } from 'react-native';

// Brightness + Dil seçici — header sağ taraf
function HeaderRight() {
  const { isCinemaMode, toggleCinemaMode } = useBrightness();
  const { t } = useI18n();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
      <LanguageSwitcher />
      <TouchableOpacity
        onPress={toggleCinemaMode}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.cinemaMode')}
      >
        <Ionicons
          name={isCinemaMode ? 'film' : 'sunny-outline'}
          size={22}
          color={isCinemaMode ? '#FFD700' : '#DB7093'}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function DrawerLayout() {
  const { t } = useI18n(); // ← hook

  return (
    <>
      <NetworkBanner />

      <Drawer
        screenOptions={{
          headerShown: true,
          headerTintColor: '#DB7093',
          drawerActiveTintColor: '#DB7093',
          drawerStyle: { backgroundColor: '#FFF5F7' },
          headerRight: () => <HeaderRight />,
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: `🏠 ${t('drawer.home')}`,           // ← çevrildi
            headerTitle: t('drawer.appTitle'),                // ← çevrildi
          }}
        />
        <Drawer.Screen
          name="map"
          options={{
            drawerLabel: `📍 ${t('drawer.nearbyCinemas')}`,  // ← çevrildi
            headerTitle: t('drawer.cinemas'),                 // ← çevrildi
          }}
        />
        <Drawer.Screen
          name="favorites"
          options={{
            drawerLabel: `💖 ${t('tabs.favorites')}`,        // ← mevcut key
            headerTitle: t('favorites.title'),               // ← mevcut key
          }}
        />
        <Drawer.Screen
          name="watchlist"
          options={{
            drawerLabel: `📝 ${t('tabs.watchlist')}`,        // ← mevcut key
            headerTitle: t('watchlist.title'),               // ← mevcut key
          }}
        />
        <Drawer.Screen
          name="notifications-test"
          options={{
            drawerLabel: `🔔 ${t('tabs.notifications')}`,    // ← mevcut key
            headerTitle: `💖 ${t('tabs.notifications')}`,    // ← mevcut key
          }}
        />
      </Drawer>
    </>
  );
}