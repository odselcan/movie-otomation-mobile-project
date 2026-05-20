// app/(drawer)/sensors.tsx — dark tema
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  useBattery, useBrightness, useNetworkStatus,
  useShakeDetector, useUserLocation,
} from '../../hooks/useSensors';
import { C, Radius } from '../../constants/theme';

const RANDOM_FILMS = [
  { title:'Inception',        year:'2010', genre:'Bilim Kurgu' },
  { title:'The Godfather',    year:'1972', genre:'Dram'        },
  { title:'Interstellar',     year:'2014', genre:'Bilim Kurgu' },
  { title:'Parasite',         year:'2019', genre:'Gerilim'     },
  { title:'The Dark Knight',  year:'2008', genre:'Aksiyon'     },
  { title:"Schindler's List", year:'1993', genre:'Tarih'       },
  { title:'Forrest Gump',     year:'1994', genre:'Dram'        },
  { title:'The Matrix',       year:'1999', genre:'Bilim Kurgu' },
  { title:'Goodfellas',       year:'1990', genre:'Suç'         },
  { title:'Fight Club',       year:'1999', genre:'Dram'        },
];

function LocationRow({ label, value }: { label:string; value:string }) {
  return (
    <View style={styles.locationRow}>
      <Text style={styles.locationLabel}>{label}</Text>
      <Text style={styles.locationValue}>{value}</Text>
    </View>
  );
}

export default function SensorsScreen() {
  const [accel,      setAccel]      = useState({ x:0, y:0, z:0 });
  const [shakeCount, setShakeCount] = useState(0);
  const [randomFilm, setRandomFilm] = useState(RANDOM_FILMS[0]);
  const shakeAnim = useRef(new Animated.Value(1)).current;

  const { location, locationError, locationLoading, getLocation } = useUserLocation();
  const { isCinemaMode, toggleCinemaMode }                        = useBrightness();
  const { battery }                                               = useBattery();
  const { isConnected, networkType }                              = useNetworkStatus();

  useEffect(() => {
    Accelerometer.setUpdateInterval(300);
    const sub = Accelerometer.addListener(setAccel);
    return () => sub.remove();
  }, []);

  useShakeDetector(() => {
    const film = RANDOM_FILMS[Math.floor(Math.random() * RANDOM_FILMS.length)];
    setRandomFilm(film);
    setShakeCount(c => c + 1);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:1.2, duration:100, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:0.9, duration:100, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:1.0, duration:100, useNativeDriver:true }),
    ]).start();
  });

  const batteryColor = !battery ? C.textMuted
    : battery.isCharging ? '#2ecc71'
    : battery.percentage > 50 ? '#2ecc71'
    : battery.percentage > 20 ? '#f39c12'
    : '#e74c3c';

  const networkIcon = isConnected
    ? networkType === 'Wi-Fi' ? 'wifi' : 'cellular'
    : 'wifi-outline';

  const getHeadingText = (h: number|null) => {
    if (h===null) return '—';
    return ['Kuzey','KD','Doğu','GD','Güney','GB','Batı','KB'][Math.round(h/45)%8];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom:40 }}>
      <Text style={styles.pageTitle}>📡 Sensörler</Text>

      {/* ── 1. Accelerometer ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait-outline" size={20} color={C.accent} />
          <Text style={styles.cardTitle}>Accelerometer</Text>
        </View>
        <View style={styles.accelRow}>
          {(['x','y','z'] as const).map(axis => (
            <View key={axis} style={styles.accelItem}>
              <Text style={styles.accelLabel}>{axis.toUpperCase()}</Text>
              <Text style={styles.accelValue}>{accel[axis].toFixed(3)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={styles.cardSubTitle}>🎬 Sallayarak Film Öner</Text>
        <Text style={styles.cardDesc}>Telefonu salla → rastgele film önerisi al</Text>
        <Animated.View style={[styles.filmBox, { transform:[{ scale:shakeAnim }] }]}>
          <Text style={styles.filmBoxEmoji}>🎬</Text>
          <Text style={styles.filmBoxTitle}>{randomFilm.title}</Text>
          <Text style={styles.filmBoxMeta}>{randomFilm.year} • {randomFilm.genre}</Text>
        </Animated.View>
        <Text style={styles.shakeCount}>Sallama sayısı: {shakeCount}</Text>
      </View>

      {/* ── 2. GPS ───────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="location-outline" size={20} color={C.accent} />
          <Text style={styles.cardTitle}>GPS Konum</Text>
          <View style={[styles.badge, { backgroundColor: location ? '#1a4a2e' : C.surfaceHigh }]}>
            <Text style={[styles.badgeText, { color: location ? '#2ecc71' : C.textMuted }]}>
              {location ? 'AKTİF' : 'PASİF'}
            </Text>
          </View>
        </View>
        {location ? (
          <View style={styles.locationBox}>
            <LocationRow label="Enlem"    value={location.lat.toFixed(6)+'°'} />
            <LocationRow label="Boylam"   value={location.lng.toFixed(6)+'°'} />
            <LocationRow label="İrtifa"   value={location.altitude!==null ? location.altitude.toFixed(1)+' m' : '—'} />
            <LocationRow label="Hız"      value={location.speed!==null ? (location.speed*3.6).toFixed(1)+' km/h' : '—'} />
            <LocationRow label="Yön"      value={getHeadingText(location.heading)} />
            <LocationRow label="Doğruluk" value={location.accuracy!==null ? '±'+location.accuracy.toFixed(0)+' m' : '—'} />
          </View>
        ) : (
          <Text style={styles.cardDesc}>{locationError ?? 'Konum henüz alınmadı'}</Text>
        )}
        <TouchableOpacity style={[styles.btn, locationLoading && { opacity:0.6 }]}
          onPress={getLocation} disabled={locationLoading}>
          <Ionicons name="locate-outline" size={16} color="white" />
          <Text style={styles.btnText}>{locationLoading ? 'Alınıyor...' : 'Konumu Al'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. Parlaklık ─────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={isCinemaMode ? 'film' : 'sunny-outline'} size={20} color={C.accent} />
          <Text style={styles.cardTitle}>Ekran Parlaklığı</Text>
          <View style={[styles.badge, { backgroundColor: isCinemaMode ? '#3d1a6b' : '#3d2a00' }]}>
            <Text style={[styles.badgeText, { color: isCinemaMode ? '#a855f7' : '#f39c12' }]}>
              {isCinemaMode ? 'SİNEMA' : 'NORMAL'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDesc}>
          {isCinemaMode ? '🎬 Ekran karartıldı — film izleme modu aktif' : '☀️ Normal parlaklık'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={toggleCinemaMode}>
          <Ionicons name={isCinemaMode ? 'sunny-outline' : 'moon-outline'} size={16} color="white" />
          <Text style={styles.btnText}>{isCinemaMode ? 'Normal Moda Geç' : 'Sinema Moduna Geç'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. Batarya ───────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="battery-half-outline" size={20} color={batteryColor} />
          <Text style={styles.cardTitle}>Batarya</Text>
          {battery && (
            <View style={[styles.badge, { backgroundColor:batteryColor+'22' }]}>
              <Text style={[styles.badgeText, { color:batteryColor }]}>%{battery.percentage}</Text>
            </View>
          )}
        </View>
        {battery ? (
          <>
            <View style={styles.batteryBarWrap}>
              <View style={styles.batteryBarBg}>
                <View style={[styles.batteryBarFill, { width:`${battery.percentage}%` as any, backgroundColor:batteryColor }]} />
              </View>
              <Text style={[styles.batteryPct, { color:batteryColor }]}>%{battery.percentage}</Text>
            </View>
            <View style={styles.locationBox}>
              <LocationRow label="Durum"  value={battery.state} />
              <LocationRow label="Şarjda" value={battery.isCharging ? 'Evet ⚡' : 'Hayır'} />
            </View>
          </>
        ) : <Text style={styles.cardDesc}>Batarya bilgisi alınıyor...</Text>}
      </View>

      {/* ── 5. Network ───────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={networkIcon as any} size={20} color={C.accent} />
          <Text style={styles.cardTitle}>Ağ Bağlantısı</Text>
        </View>
        <View style={[styles.networkStatus, { backgroundColor: isConnected ? '#1a4a2e' : '#4a1a1a' }]}>
          <Ionicons name={isConnected ? 'checkmark-circle' : 'close-circle'} size={24}
            color={isConnected ? '#2ecc71' : '#e74c3c'} />
          <View>
            <Text style={[styles.networkText, { color: isConnected ? '#2ecc71' : '#e74c3c' }]}>
              {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
            </Text>
            <Text style={styles.networkType}>{networkType}</Text>
          </View>
        </View>
        <Text style={styles.cardDesc}>
          {isConnected ? "TMDB API'den canlı veri çekiliyor." : 'Önbellekteki veriler gösteriliyor.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:C.bg, padding:16 },
  pageTitle: { fontSize:22, fontWeight:'bold', color:C.text, marginBottom:16 },

  card: { backgroundColor:C.surface, borderRadius:Radius.lg, padding:16, marginBottom:14, borderWidth:1, borderColor:C.border },
  cardHeader:   { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 },
  cardTitle:    { flex:1, fontSize:16, fontWeight:'bold', color:C.text },
  cardSubTitle: { fontSize:14, fontWeight:'600', color:C.accent, marginBottom:4 },
  cardDesc:     { fontSize:12, color:C.textMuted, marginBottom:12 },
  divider:      { height:1, backgroundColor:C.border, marginVertical:12 },

  badge:     { paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  badgeText: { fontSize:10, fontWeight:'bold' },

  accelRow:   { flexDirection:'row', gap:8, marginBottom:4 },
  accelItem:  { flex:1, backgroundColor:C.surfaceHigh, borderRadius:12, padding:10, alignItems:'center', borderWidth:1, borderColor:C.border },
  accelLabel: { fontSize:11, color:C.accent, fontWeight:'bold' },
  accelValue: { fontSize:14, fontWeight:'600', color:C.text, marginTop:2 },

  filmBox:      { backgroundColor:C.surfaceHigh, borderRadius:Radius.md, padding:16, alignItems:'center', borderWidth:1, borderColor:C.border, marginBottom:8 },
  filmBoxEmoji: { fontSize:32, marginBottom:6 },
  filmBoxTitle: { fontSize:16, fontWeight:'bold', color:C.accent },
  filmBoxMeta:  { fontSize:12, color:C.textMuted, marginTop:3 },
  shakeCount:   { fontSize:11, color:C.textMuted, textAlign:'center' },

  locationBox:   { backgroundColor:C.surfaceHigh, borderRadius:12, padding:12, marginBottom:12, borderWidth:1, borderColor:C.border, gap:6 },
  locationRow:   { flexDirection:'row', justifyContent:'space-between' },
  locationLabel: { fontSize:12, color:C.accent, fontWeight:'600' },
  locationValue: { fontSize:12, color:C.text, fontFamily:'monospace' },

  batteryBarWrap: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  batteryBarBg:   { flex:1, height:12, backgroundColor:C.surfaceHigh, borderRadius:6, overflow:'hidden' },
  batteryBarFill: { height:'100%', borderRadius:6 },
  batteryPct:     { fontSize:13, fontWeight:'bold', minWidth:40 },

  networkStatus: { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14, marginBottom:10 },
  networkText:   { fontSize:15, fontWeight:'bold' },
  networkType:   { fontSize:12, color:C.textMuted, marginTop:2 },

  btn:        { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.accent, paddingVertical:11, borderRadius:Radius.md },
  btnText:    { color:'white', fontWeight:'bold', fontSize:13 },
});