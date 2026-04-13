import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ 
      headerShown: true,
      headerTintColor: '#DB7093',
      drawerActiveTintColor: '#DB7093',
      drawerStyle: { backgroundColor: '#FFF5F7' }
    }}>
      <Drawer.Screen 
        name="(tabs)" 
        options={{ 
          drawerLabel: '🏠 Ana Sayfa', 
          headerTitle: 'Film Dünyası' 
        }} 
      />
      <Drawer.Screen 
        name="map" 
        options={{ 
          drawerLabel: '📍 Yakındaki Sinemalar', 
          headerTitle: 'Sinemalar' 
        }} 
      />
      <Drawer.Screen 
        name="favorites" 
        options={{ 
          drawerLabel: '💖 Favoriler', 
          headerTitle: 'Favorilerim' 
        }} 
      />
      <Drawer.Screen 
        name="watchlist" 
        options={{ 
          drawerLabel: '📝 İzlenecekler', 
          headerTitle: 'İzleme Listem' 
        }} 
      />

      {/* ✅ EKLENDİ */}
      <Drawer.Screen 
        name="notifications-test" 
        options={{ 
          drawerLabel: '🔔 Bildirimler', 
          headerTitle: '💖 Bildirimler' 
        }} 
      />
    </Drawer>
  );
}