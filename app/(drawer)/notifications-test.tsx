import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, 
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

type BildirimItem = {
  id: string;
  title: string;
  body: string;
  tarih: string;
};

const STORAGE_KEY = '@bildirimler';

export default function NotificationsScreen() {
  const [izinVar, setIzinVar] = useState(false);
  const [bildirimler, setBildirimler] = useState<BildirimItem[]>([]);
  const listenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    izinIste();
    bildirimleriYukle();

    listenerRef.current = Notifications.addNotificationReceivedListener( // Uygulama açıkken bildirim gelirse yakalar
      async (notif: Notifications.Notification) => {
        const yeni: BildirimItem = {
          id: notif.request.identifier,
          title: notif.request.content.title ?? 'Bildirim',
          body: notif.request.content.body ?? '',
          tarih: new Date().toLocaleString('tr-TR'),
        };
        await bildirimEkle(yeni);
      }
    );

    return () => {
      listenerRef.current?.remove();
    };
  }, []);

  async function izinIste() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    setIzinVar(status === 'granted');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('genel', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DB7093',
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

  async function anlikBildirimGonder(title: string, body: string) {
    if (!izinVar) {
      Alert.alert('İzin Gerekli', 'Lütfen bildirim iznine izin verin.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null,
    });
  }

  async function listeyiTemizle() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setBildirimler([]);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.baslik}>🔔 Bildirimler</Text>

      {/* Butonlar */}
      <TouchableOpacity
        style={styles.buton}
        onPress={() =>
          anlikBildirimGonder('🎬 Film Önerisi', 'Interstellar izleme listenize eklendi!')
        }
      >
        <Text style={styles.butonYazi}>🎬 Film Önerisi Bildirimi</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buton, { backgroundColor: '#C45E7D' }]}
        onPress={() =>
          anlikBildirimGonder('📝 Hatırlatıcı', 'İzleme listende 3 film seni bekliyor!')
        }
      >
        <Text style={styles.butonYazi}>📝 İzleme Listesi Hatırlatıcısı</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buton, { backgroundColor: '#A0455F' }]}
        onPress={() =>
          anlikBildirimGonder('⭐ Yeni Çıkan', 'Bu hafta 5 yeni film vizyona girdi!')
        }
      >
        <Text style={styles.butonYazi}>⭐ Yeni Çıkan Film Bildirimi</Text>
      </TouchableOpacity>

      {/* Liste başlığı */}
      <View style={styles.listeBaslikRow}>
        <Text style={styles.listeBaslik}>
          📋 Geçmiş Bildirimler ({bildirimler.length})
        </Text>
        {bildirimler.length > 0 && (
          <TouchableOpacity onPress={listeyiTemizle}>
            <Text style={styles.temizle}>Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bildirim listesi */}
      {bildirimler.length === 0 ? (
        <View style={styles.bosKutu}>
          <Text style={styles.bosYazi}>Henüz bildirim yok</Text>
          <Text style={styles.bosAlt}>Yukarıdaki butonlara tıklayarak test edin</Text>
        </View>
      ) : (
        bildirimler.map((item) => (
          <View key={item.id} style={styles.bildirimKart}>
            <Text style={styles.bildirimBaslik}>{item.title}</Text>
            <Text style={styles.bildirimBody}>{item.body}</Text>
            <Text style={styles.bildirimTarih}>{item.tarih}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7', padding: 20 },
  baslik: { fontSize: 24, fontWeight: '700', color: '#DB7093', marginBottom: 20 },
  buton: {
    backgroundColor: '#DB7093',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  butonYazi: { color: '#fff', fontWeight: '600', fontSize: 15 },
  listeBaslikRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  listeBaslik: { fontSize: 16, fontWeight: '600', color: '#9B4F6A' },
  temizle: { fontSize: 13, color: '#DB7093', fontWeight: '500' },
  bosKutu: {
    backgroundColor: '#FFD1DC',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginTop: 8,
  },
  bosYazi: { fontSize: 16, color: '#9B4F6A', fontWeight: '600' },
  bosAlt: { fontSize: 13, color: '#C47090', marginTop: 6, textAlign: 'center' },
  bildirimKart: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#DB7093',
    shadowColor: '#DB7093',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  bildirimBaslik: { fontSize: 15, fontWeight: '600', color: '#4A2030' },
  bildirimBody: { fontSize: 13, color: '#7A3050', marginTop: 4 },
  bildirimTarih: { fontSize: 11, color: '#B07090', marginTop: 6 },
});