import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function RootLayout() {
  // 1. Bildirim ve Router Hook'larını tanımlıyoruz
  const { expoPushToken, notification } = usePushNotifications();
  const router = useRouter();

  // 2. Bildirim dinleyicisini useEffect içine kuruyoruz
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Bildirimden gelen veriyi alıyoruz
        const { mediaId } = response.notification.request.content.data;
        
        if (mediaId) {
          // Bildirime tıklandığında detay sayfasına yönlendiriyoruz
          // Not: Yolun app klasöründeki yapıya göre "(drawer)/details/${mediaId}" olduğundan emin ol
          router.push(`/(drawer)/details/${mediaId}`);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // 3. Mevcut Layout (Arayüz) kodun
  return (
    <Stack>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="details/[id]" 
        options={{ 
          headerTitle: "Film Detayları", 
          headerTintColor: "#DB7093",
          headerStyle: { backgroundColor: "#FFF5F7" },
          headerBackTitle: "Geri"
        }} 
      />
    </Stack>
  );
}