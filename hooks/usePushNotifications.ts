import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PUSH_TOKEN_KEY = '@push_token';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [fcmToken, setFcmToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) setExpoPushToken(token);
    });

    setupFCM();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notif: Notifications.Notification) => {
        setNotification(notif);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      Alert.alert('Fiziksel cihaz gerekli', 'Push bildirimler simülatörde çalışmaz.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('İzin reddedildi', 'Push bildirimler için izin gerekli.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('film-onerisi', {
        name: 'Film Önerileri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DB7093',
        sound: 'default',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);

    return token.data;
  }

  async function setupFCM() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const token = await messaging().getToken();
    setFcmToken(token);
    await AsyncStorage.setItem('@fcm_token', token);

    messaging().onTokenRefresh(async (newToken: string) => {
      setFcmToken(newToken);
      await AsyncStorage.setItem('@fcm_token', newToken);
    });

    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      handleNotificationTap(initialNotification.data);
    }

    messaging().onNotificationOpenedApp(
      (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        handleNotificationTap(remoteMessage.data);
      }
    );

    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title ?? '🎬 Yeni Öneri',
          body: remoteMessage.notification?.body ?? '',
          data: remoteMessage.data ?? {},
          sound: 'default',
          color: '#DB7093',
        },
        trigger: null,
      });
    });
  }

  function handleNotificationTap(data: Record<string, any> | undefined) {
    if (!data) return;
    console.log('Bildirime tıklandı, data:', data);
  }

  return { expoPushToken, fcmToken, notification };
}