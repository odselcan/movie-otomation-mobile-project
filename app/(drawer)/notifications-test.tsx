// app/(drawer)/notifications-test.tsx — dark tema
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet,
  Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { C, Radius, Spacing } from '../../constants/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true,
    shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true,
  }),
});

type BildirimItem = { id: string; title: string; body: string; tarih: string; };
const STORAGE_KEY    = '@bildirimler';
const SMS_SCHED_KEY  = '@sms_schedule_active';

export default function NotificationsScreen() {
  const [izinVar,    setIzinVar]    = useState(false);
  const [bildirimler,setBildirimler]= useState<BildirimItem[]>([]);
  const [smsAktif,   setSmsAktif]   = useState(false);
  const listenerRef = useRef<Notifications.Subscription|null>(null);

  useEffect(() => {
    izinIste(); bildirimleriYukle(); smsAktiflikYukle();
    listenerRef.current = Notifications.addNotificationReceivedListener(async notif => {
      await bildirimEkle({
        id: notif.request.identifier,
        title: notif.request.content.title ?? 'Bildirim',
        body:  notif.request.content.body  ?? '',
        tarih: new Date().toLocaleString('tr-TR'),
      });
    });
    return () => listenerRef.current?.remove();
  }, []);

  async function izinIste() {
    const { status } = await Notifications.requestPermissionsAsync();
    setIzinVar(status === 'granted');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('genel', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: C.accent,
      });
    }
  }

  async function bildirimleriYukle() {
    const json = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (json) setBildirimler(JSON.parse(json));
  }

  async function smsAktiflikYukle() {
    const d = await AsyncStorage.getItem(SMS_SCHED_KEY).catch(() => null);
    setSmsAktif(d === 'true');
  }

  async function bildirimEkle(yeni: BildirimItem) {
    setBildirimler(prev => {
      const g = [yeni, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(g));
      return g;
    });
  }

  async function anlikBildirimGonder(title: string, body: string) {
    if (!izinVar) { Alert.alert('İzin Gerekli', 'Bildirim iznine izin verin.'); return; }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' }, trigger: null,
    });
  }

  async function smsSend() {
    if (!await SMS.isAvailableAsync()) { Alert.alert('Hata', 'SMS gönderilemıyor.'); return; }
    await SMS.sendSMSAsync([], [
      '🎬 Film Önerisi!',
      'Bu hafta mutlaka izlemelisin:',
      '⭐ Interstellar (2014) - IMDb 8.7',
      '⭐ Oppenheimer (2023) - IMDb 8.3',
      '⭐ Dune: Part Two (2024) - IMDb 8.5',
      '📱 Film Dünyası uygulamasını aç!',
    ].join('\n'));
  }

  function bugunSaat20Saniye(): number {
    const simdi = new Date(), hedef = new Date();
    hedef.setHours(20, 0, 0, 0);
    if (hedef <= simdi) hedef.setDate(hedef.getDate() + 1);
    return Math.floor((hedef.getTime() - simdi.getTime()) / 1000);
  }

  async function smsZamanlaToggle(aktif: boolean) {
    setSmsAktif(aktif);
    await AsyncStorage.setItem(SMS_SCHED_KEY, aktif.toString());
    if (aktif) {
      const saniye = bugunSaat20Saniye();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎬 Akşam Film Vakti!',
          body: 'Bu akşam izleyecek film seçtin mi?',
          sound: 'default', data: { tip: 'aksam_hatirlat' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: saniye, repeats: false,
        },
      });
      const saatStr = new Date(Date.now() + saniye * 1000)
        .toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
      Alert.alert('✅ Zamanlı SMS Aktif', `Her gün 20:00'de hatırlatıcı gelecek.\nBugün: ${saatStr}`);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('❌ İptal Edildi', 'Günlük hatırlatıcı kapatıldı.');
    }
  }

  async function testSmsBildirim() {
    await anlikBildirimGonder('🎬 Akşam Film Vakti!', 'Bu akşam izleyecek film seçtin mi?');
    await smsSend();
  }

  const NOTIFICATION_BTNS = [
    { label: '🎬 Film Önerisi Bildirimi',     title: '🎬 Film Önerisi',  body: 'Interstellar izleme listenize eklendi!' },
    { label: '📝 İzleme Listesi Hatırlatıcısı', title: '📝 Hatırlatıcı', body: 'İzleme listende 3 film seni bekliyor!' },
    { label: '⭐ Yeni Çıkan Film Bildirimi',  title: '⭐ Yeni Çıkan',   body: 'Bu hafta 5 yeni film vizyona girdi!' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.pageTitle}>🔔 Bildirimler</Text>

      {/* İzin durumu */}
      <View style={[styles.izinBadge, { backgroundColor: izinVar ? '#1a4a2e' : '#4a1a1a' }]}>
        <Text style={{ color: izinVar ? '#2ecc71' : '#e74c3c', fontSize: 13, fontWeight: '600' }}>
          {izinVar ? '✅ Bildirim izni verildi' : '❌ Bildirim izni yok'}
        </Text>
      </View>

      {/* Zamanlı SMS kartı */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>📅 Günlük SMS Hatırlatıcı</Text>
            <Text style={styles.cardSub}>Her gün saat 20:00'de SMS gönderir</Text>
          </View>
          <Switch
            value={smsAktif}
            onValueChange={smsZamanlaToggle}
            trackColor={{ false: C.surfaceHigh, true: C.accent }}
            thumbColor="white"
          />
        </View>
        <TouchableOpacity style={styles.testBtn} onPress={testSmsBildirim}>
          <Text style={styles.testBtnText}>🧪 Hemen Test Et (Bildirim + SMS)</Text>
        </TouchableOpacity>
      </View>

      {/* Bildirim butonları */}
      {NOTIFICATION_BTNS.map(btn => (
        <TouchableOpacity key={btn.label} style={styles.notifBtn}
          onPress={() => anlikBildirimGonder(btn.title, btn.body)}>
          <Text style={styles.notifBtnText}>{btn.label}</Text>
        </TouchableOpacity>
      ))}

      {/* Geçmiş */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>📋 Geçmiş ({bildirimler.length})</Text>
        {bildirimler.length > 0 && (
          <TouchableOpacity onPress={async () => {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setBildirimler([]);
          }}>
            <Text style={styles.clearText}>Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      {bildirimler.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Henüz bildirim yok</Text>
          <Text style={styles.emptySub}>Yukarıdaki butonlara tıklayarak test edin</Text>
        </View>
      ) : bildirimler.map(item => (
        <View key={item.id} style={styles.notifCard}>
          <Text style={styles.notifCardTitle}>{item.title}</Text>
          <Text style={styles.notifCardBody}>{item.body}</Text>
          <Text style={styles.notifCardDate}>{item.tarih}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:C.bg, padding:16 },
  pageTitle: { fontSize:22, fontWeight:'700', color:C.text, marginBottom:12 },

  izinBadge: { borderRadius:Radius.md, padding:10, marginBottom:16, alignItems:'center' },

  card: { backgroundColor:C.surface, borderRadius:Radius.lg, padding:16, marginBottom:16, borderWidth:1, borderColor:C.border },
  cardTop:  { flexDirection:'row', alignItems:'center', marginBottom:12 },
  cardTitle:{ fontSize:15, fontWeight:'700', color:C.text },
  cardSub:  { fontSize:12, color:C.textMuted, marginTop:2 },

  testBtn:     { backgroundColor:'#6c3483', borderRadius:Radius.md, padding:12, alignItems:'center' },
  testBtnText: { color:'white', fontWeight:'600', fontSize:14 },

  notifBtn:     { backgroundColor:C.accent, borderRadius:Radius.md, padding:16, alignItems:'center', marginBottom:10 },
  notifBtnText: { color:'white', fontWeight:'600', fontSize:15 },

  historyHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:24, marginBottom:12 },
  historyTitle:  { fontSize:16, fontWeight:'600', color:C.text },
  clearText:     { fontSize:13, color:C.accent, fontWeight:'500' },

  emptyBox:  { backgroundColor:C.surface, borderRadius:Radius.md, padding:30, alignItems:'center', borderWidth:1, borderColor:C.border },
  emptyText: { fontSize:16, color:C.text, fontWeight:'600' },
  emptySub:  { fontSize:13, color:C.textMuted, marginTop:6, textAlign:'center' },

  notifCard:      { backgroundColor:C.surface, borderRadius:Radius.md, padding:14, marginBottom:10, borderLeftWidth:4, borderLeftColor:C.accent, borderWidth:1, borderColor:C.border },
  notifCardTitle: { fontSize:15, fontWeight:'600', color:C.text },
  notifCardBody:  { fontSize:13, color:C.textSub, marginTop:4 },
  notifCardDate:  { fontSize:11, color:C.textMuted, marginTop:6 },
});