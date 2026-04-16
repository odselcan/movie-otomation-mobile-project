import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
const SMS_SCHEDULE_KEY = '@sms_schedule_active';

export default function NotificationsScreen() {
  const [izinVar, setIzinVar] = useState(false);
  const [bildirimler, setBildirimler] = useState<BildirimItem[]>([]);
  const [smsAktif, setSmsAktif] = useState(false);
  const listenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    izinIste();
    bildirimleriYukle();
    smsAktiflikYukle();

    listenerRef.current = Notifications.addNotificationReceivedListener(
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

  async function smsAktiflikYukle() {
    try {
      const deger = await AsyncStorage.getItem(SMS_SCHEDULE_KEY);
      setSmsAktif(deger === 'true');
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

  // ── SMS gönder ────────────────────────────────────────────────
async function smsSend() {
  const available = await SMS.isAvailableAsync();
  if (!available) {
    Alert.alert('Hata', 'Bu cihazda SMS gönderilemıyor.');
    return;
  }
  const mesaj =
    '🎬 Film Önerisi!\n\n' +
    'Bu hafta mutlaka izlemelisin:\n' +
    '⭐ Interstellar (2014) - IMDb 8.7\n' +
    '⭐ Oppenheimer (2023) - IMDb 8.3\n' +
    '⭐ Dune: Part Two (2024) - IMDb 8.5\n\n' +
    '📱 Film Dünyası uygulamasını aç ve izleme listene ekle!';
  await SMS.sendSMSAsync([], mesaj);
}
  // ── Her gün 20:00 için kalan saniyeyi hesapla ─────────────────
  function bugunSaat20Saniye(): number {
    const simdi = new Date();
    const hedef = new Date();
    hedef.setHours(20, 0, 0, 0);
    if (hedef <= simdi) {
      hedef.setDate(hedef.getDate() + 1);
    }
    return Math.floor((hedef.getTime() - simdi.getTime()) / 1000);
  }

  // ── Zamanlı SMS toggle ────────────────────────────────────────
  async function smsZamanlaToggle(aktif: boolean) {
    setSmsAktif(aktif);
    await AsyncStorage.setItem(SMS_SCHEDULE_KEY, aktif.toString());

    if (aktif) {
      const saniye = bugunSaat20Saniye();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎬 Akşam Film Vakti!',
          body: 'Bu akşam izleyecek film seçtin mi? SMS gönder ve arkadaşlarını davet et!',
          sound: 'default',
          data: { tip: 'aksam_hatirlat' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: saniye,
          repeats: false,
        },
      });

      const saatStr = new Date(Date.now() + saniye * 1000).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      Alert.alert(
        '✅ Zamanlı SMS Aktif',
        `Her gün saat 20:00'de hatırlatıcı gelecek.\nBugün: ${saatStr}'de bildirim alacaksınız.`
      );
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('❌ Zamanlı SMS İptal', 'Günlük hatırlatıcı kapatıldı.');
    }
  }

  // ── TEST: Anında bildirim + SMS ───────────────────────────────
  async function testSmsBildirim() {
    await anlikBildirimGonder(
      '🎬 Akşam Film Vakti!',
      'Bu akşam izleyecek film seçtin mi?'
    );
    await smsSend();
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.baslik}>🔔 Bildirimler</Text>

      {/* İzin durumu */}
      <View style={[styles.izinBadge, { backgroundColor: izinVar ? '#d4edda' : '#f8d7da' }]}>
        <Text style={{ color: izinVar ? '#155724' : '#721c24', fontSize: 13, fontWeight: '600' }}>
          {izinVar ? '✅ Bildirim izni verildi' : '❌ Bildirim izni yok'}
        </Text>
      </View>

      {/* ── Zamanlı SMS Kartı ── */}
      <View style={styles.smsKart}>
        <View style={styles.smsKartUst}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smsKartBaslik}>📅 Günlük SMS Hatırlatıcı</Text>
            <Text style={styles.smsKartAlt}>Her gün saat 20:00'de SMS gönderir</Text>
          </View>
          <Switch
            value={smsAktif}
            onValueChange={smsZamanlaToggle}
            trackColor={{ false: '#FFD1DC', true: '#DB7093' }}
            thumbColor={smsAktif ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* TEST Butonu */}
        <TouchableOpacity style={styles.testButon} onPress={testSmsBildirim}>
          <Text style={styles.testButonYazi}>🧪 Hemen Test Et (Bildirim + SMS)</Text>
        </TouchableOpacity>
      </View>

      {/* Diğer bildirim butonları */}
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

      {/* Geçmiş listesi */}
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
  baslik: { fontSize: 24, fontWeight: '700', color: '#DB7093', marginBottom: 12 },
  izinBadge: {
    borderRadius: 10, padding: 10, marginBottom: 16, alignItems: 'center',
  },
  smsKart: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFD1DC',
    elevation: 2,
  },
  smsKartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  smsKartBaslik: { fontSize: 15, fontWeight: '700', color: '#4A2030' },
  smsKartAlt: { fontSize: 12, color: '#B07090', marginTop: 2 },
  testButon: {
    backgroundColor: '#9b59b6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  testButonYazi: { color: '#fff', fontWeight: '600', fontSize: 14 },
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