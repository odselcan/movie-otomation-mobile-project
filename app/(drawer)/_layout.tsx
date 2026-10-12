// app/(drawer)/_layout.tsx
import NetworkBanner from '@/components/NetworkBanner';
import { useBrightness } from '@/hooks/useSensors';
import { useI18n } from '@/hooks/useI18n';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity, View } from 'react-native';
import { C } from '@/constants/theme';

// Brightness butonu — header sağ (dil switcher buradan kaldırıldı → Ayarlar sayfası)
function HeaderRight() {
  const { isCinemaMode, toggleCinemaMode } = useBrightness();
  const { t } = useI18n();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <TouchableOpacity
        onPress={toggleCinemaMode}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.cinemaMode')}
      >
        <Ionicons
          name={isCinemaMode ? 'film' : 'sunny-outline'}
          size={22}
          color={isCinemaMode ? '#FFD700' : C.textSub}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function DrawerLayout() {
  const { t } = useI18n();

  return (
    <>
      <NetworkBanner />

      <Drawer
        screenOptions={{
          headerShown: true,
          headerStyle:           { backgroundColor: C.bg },
          headerTintColor:       C.text,
          headerTitleStyle:      { fontSize: 16, fontWeight: '700', color: C.text },
          headerTitleAlign:      'left',
          headerTitleContainerStyle: { left: 50, right: 60 },
          headerRight:           () => <HeaderRight />,
          drawerStyle:           { backgroundColor: C.surface },
          drawerActiveTintColor:   C.accent,
          drawerInactiveTintColor: C.textSub,
          drawerLabelStyle:      { fontSize: 14, fontWeight: '600' },
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel:  `🏠 ${t('drawer.home')}`,
            headerTitle:  t('drawer.appTitle'),
          }}
        />
        <Drawer.Screen
          name="map"
          options={{
            drawerLabel:  `📍 ${t('drawer.nearbyCinemas')}`,
            headerTitle:  t('drawer.cinemas'),
          }}
        />
        <Drawer.Screen
          name="favorites"
          options={{
            drawerLabel:  `💖 ${t('tabs.favorites')}`,
            headerTitle:  t('favorites.title'),
          }}
        />
        <Drawer.Screen
          name="watchlist"
          options={{
            drawerLabel:  `📝 ${t('tabs.watchlist')}`,
            headerTitle:  t('watchlist.title'),
          }}
        />
        <Drawer.Screen
          name="notifications-test"
          options={{
            drawerLabel:  `🔔 ${t('tabs.notifications')}`,
            headerTitle:  t('tabs.notifications'),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel:  `⚙️ ${t('drawer.settings')}`,
            headerTitle:  t('drawer.settings'),
          }}
        />
      </Drawer>
    </>
  );
}