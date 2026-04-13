import AsyncStorage from '@react-native-async-storage/async-storage';

interface FilmNotificationPayload {
  title: string;
  body: string;
  mediaId: string;
  mediaType: 'film' | 'dizi';
  posterUrl?: string;
}

// Expo Push API ile bildirim gönder (backend gerektirmez — ödev için ideal)
export async function sendFilmRecommendationNotification(
  payload: FilmNotificationPayload
) {
  const token = await AsyncStorage.getItem('@push_token');
  if (!token) {
    console.warn('Push token bulunamadı');
    return;
  }

  const message = {
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: {
      mediaId: payload.mediaId,
      mediaType: payload.mediaType,
    },
    channelId: 'film-onerisi', // Android kanalı
    // Ödev notu: Buradaki `data` alanı NotificationResponse içinde erişilir
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Bildirim gönderildi:', result);
    return result;
  } catch (error) {
    console.error('Bildirim gönderilemedi:', error);
  }
}

// Zamanlanmış bildirim — örn: "İzleme listenizde 3 film var!"
export async function scheduleWatchlistReminder(count: number) {
  const { scheduleNotificationAsync } = await import('expo-notifications');
  
  await scheduleNotificationAsync({
    content: {
      title: '🎬 İzleme Listeniz Sizi Bekliyor',
      body: `${count} film/dizi izlemenizi bekliyor. Hadi başlayalım!`,
      sound: 'default',
      color: '#DB7093',
    },
    trigger: {
      seconds: 60 * 60 * 24, // 24 saat sonra
      repeats: false,
    },
  });
}