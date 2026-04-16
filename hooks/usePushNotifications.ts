// hooks/usePushNotifications.ts
// Firebase KALDIRILDI — sadece expo-notifications (local notification)
// Expo Go ile uyumlu ✅

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const STORAGE_KEY = '@bildirimler';

export type BildirimItem = {
  id: string;
  title: string;
  body: string;
  tarih: string;
};

export function usePushNotifications() {
  const [izinVar, setIzinVar] = useState(false);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [bildirimler, setBildirimler] = useState<BildirimItem[]>([]);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    izinIste();
    bildirimleriYukle();

    // Uygulama açıkken gelen bildirimi yakala
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (notif: Notifications.Notification) => {
        setNotification(notif);
        const yeni: BildirimItem = {
          id: notif.request.identifier,
          title: notif.request.content.title ?? 'Bildirim',
          body: notif.request.content.body ?? '',
          tarih: new Date().toLocaleString('tr-TR'),
        };
        await bildirimEkle(yeni);
      }
    );

    // Bildirime tıklanınca
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

  async function izinIste() {
    const { status: mevcutDurum } = await Notifications.getPermissionsAsync();
    let sonDurum = mevcutDurum;

    if (mevcutDurum !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      sonDurum = status;
    }

    if (sonDurum !== 'granted') {
      Alert.alert('İzin Gerekli', 'Bildirimler için izin verilmedi.');
      setIzinVar(false);
      return;
    }

    setIzinVar(true);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('film-onerisi', {
        name: 'Film Önerileri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DB7093',
        sound: 'default',
      });
    }
  }

  async function bildirimleriYukle() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setBildirimler(JSON.parse(json));
    } catch {}
  }

  async function bildirimEkle(yeni: BildirimItem) {
    setBildirimler((prev) => {
      const guncellenmis = [yeni, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(guncellenmis));
      return guncellenmis;
    });
  }

  // Local bildirim gönder
  async function bildirimGonder(title: string, body: string, data?: Record<string, any>) {
    if (!izinVar) {
      Alert.alert('İzin Gerekli', 'Lütfen bildirim iznine izin verin.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data ?? {},
        color: '#DB7093',
      },
      trigger: null, // Anında gönder
    });
  }

  // Gecikmeli bildirim (saniye cinsinden)
  async function zamanlanmisBildirimGonder(
    title: string,
    body: string,
    saniye: number,
    data?: Record<string, any>
  ) {
    if (!izinVar) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', data: data ?? {}, color: '#DB7093' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: saniye },
    });
  }

  async function tumBildirimleriIptalEt() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async function listeyiTemizle() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setBildirimler([]);
  }

  function handleNotificationTap(data: Record<string, any> | undefined) {
    if (!data) return;
    console.log('Bildirime tıklandı, data:', data);
  }

  return {
    izinVar,
    notification,
    bildirimler,
    bildirimGonder,
    zamanlanmisBildirimGonder,
    tumBildirimleriIptalEt,
    listeyiTemizle,
  };
}