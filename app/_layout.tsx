import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { C } from '@/constants/theme';

export default function RootLayout() {
  usePushNotifications();
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { mediaId } = response.notification.request.content.data;
        if (mediaId) router.push(`/(drawer)/details/${mediaId}`);
      }
    );
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="(drawer)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="details/[id]"
          options={{
            headerShown: false,        // ← kendi back butonumuz var
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: C.bg },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}