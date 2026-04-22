// app/(drawer)/sensors.tsx
// Sensör verileri ekranı — Accelerometer, GPS, Brightness, Battery, Network

import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import {
  useBattery,
  useBrightness,
  useNetworkStatus,
  useShakeDetector,
  useUserLocation,
} from '../../hooks/useSensors';

// Örnek filmler — sallayınca rastgele biri gelir
const RANDOM_FILMS = [
  { title: 'Inception',         year: '2010', genre: 'Bilim Kurgu' },
  { title: 'The Godfather',     year: '1972', genre: 'Dram'        },
  { title: 'Interstellar',      year: '2014', genre: 'Bilim Kurgu' },
  { title: 'Parasite',          year: '2019', genre: 'Gerilim'     },
  { title: 'The Dark Knight',   year: '2008', genre: 'Aksiyon'     },
  { title: "Schindler's List",  year: '1993', genre: 'Tarih'       },
  { title: 'Forrest Gump',      year: '1994', genre: 'Dram'        },
  { title: 'The Matrix',        year: '1999', genre: 'Bilim Kurgu' },
  { title: 'Goodfellas',        year: '1990', genre: 'Suç'         },
  { title: 'Fight Club',        year: '1999', genre: 'Dram'        },
];

export default function SensorsScreen() {
  // ── Accelerometer raw data ────────────────────────────────
  const [accel, setAccel]           = useState({ x: 0, y: 0, z: 0 });
  const [shakeCount, setShakeCount] = useState(0);
  const [randomFilm, setRandomFilm] = useState(RANDOM_FILMS[0]);
  const shakeAnim = useRef(new Animated.Value(1)).current;

  // ── Sensör hook'ları ──────────────────────────────────────
  const { location, locationError, locationLoading, getLocation } = useUserLocation();
  const { isCinemaMode, toggleCinemaMode }                        = useBrightness();   // ✅ düzeltildi
  const { battery }                                               = useBattery();
  const { isConnected, networkType }                              = useNetworkStatus();

  // Accelerometer raw data
  useEffect(() => {
    Accelerometer.setUpdateInterval(300);
    const sub = Accelerometer.addListener(setAccel);
    return () => sub.remove();
  }, []);

  // Shake detector
  useShakeDetector(() => {
    const film = RANDOM_FILMS[Math.floor(Math.random() * RANDOM_FILMS.length)];
    setRandomFilm(film);
    setShakeCount(c => c + 1);

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();
  });

  // ── Yardımcı ─────────────────────────────────────────────
  const getHeadingText = (heading: number | null) => {
    if (heading === null) return '—';
    const dirs = ['Kuzey', 'KD', 'Doğu', 'GD', 'Güney', 'GB', 'Batı', 'KB'];
    return dirs[Math.round(heading / 45) % 8];
  };

  const batteryColor = !battery
    ? '#aaa'
    : battery.isCharging
    ? '#2ecc71'
    : battery.percentage > 50
    ? '#2ecc71'
    : battery.percentage > 20
    ? '#f39c12'
    : '#e74c3c';

  const networkIcon = isConnected
    ? networkType === 'Wi-Fi' ? 'wifi' : 'cellular'
    : 'wifi-outline';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.pageTitle}>📡 Sensörler</Text>

      {/* ── 1. ACCELEROMETER & SALLAMA ─────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait-outline" size={20} color="#DB7093" />
          <Text style={styles.cardTitle}>Accelerometer</Text>
        </View>

        <View style={styles.accelRow}>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <View key={axis} style={styles.accelItem}>
              <Text style={styles.accelLabel}>{axis.toUpperCase()}</Text>
              <Text style={styles.accelValue}>{accel[axis].toFixed(3)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.cardSubTitle}>🎬 Sallayarak Film Öner</Text>
        <Text style={styles.cardDesc}>Telefonu salla → rastgele film önerisi al</Text>

        <Animated.View style={[styles.filmBox, { transform: [{ scale: shakeAnim }] }]}>
          <Text style={styles.filmBoxEmoji}>🎬</Text>
          <Text style={styles.filmBoxTitle}>{randomFilm.title}</Text>
          <Text style={styles.filmBoxMeta}>{randomFilm.year} • {randomFilm.genre}</Text>
        </Animated.View>

        <Text style={styles.shakeCount}>Sallama sayısı: {shakeCount}</Text>
      </View>

      {/* ── 2. GPS KONUM ───────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="location-outline" size={20} color="#DB7093" />
          <Text style={styles.cardTitle}>GPS Konum</Text>
          <View style={[styles.badge, { backgroundColor: location ? '#2ecc71' : '#ccc' }]}>
            <Text style={styles.badgeText}>{location ? 'AKTİF' : 'PASİF'}</Text>
          </View>
        </View>

        {location ? (
          <View style={styles.locationBox}>
            <LocationRow label="Enlem"    value={location.lat.toFixed(6) + '°'} />
            <LocationRow label="Boylam"   value={location.lng.toFixed(6) + '°'} />
            <LocationRow label="İrtifa"
              value={location.altitude !== null ? location.altitude.toFixed(1) + ' m' : '—'} />
            <LocationRow label="Hız"
              value={location.speed !== null ? (location.speed * 3.6).toFixed(1) + ' km/h' : '—'} />
            <LocationRow label="Yön"      value={getHeadingText(location.heading)} />
            <LocationRow label="Doğruluk"
              value={location.accuracy !== null ? '±' + location.accuracy.toFixed(0) + ' m' : '—'} />
          </View>
        ) : (
          <Text style={styles.cardDesc}>
            {locationError ?? 'Konum henüz alınmadı'}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.btn, locationLoading && styles.btnDisabled]}
          onPress={getLocation}
          disabled={locationLoading}
        >
          <Ionicons name="locate-outline" size={16} color="white" />
          <Text style={styles.btnText}>
            {locationLoading ? 'Konum Alınıyor...' : 'Konumu Al'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. EKRAN PARLAKLIĞI ────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={isCinemaMode ? 'film' : 'sunny-outline'} size={20} color="#DB7093" />
          <Text style={styles.cardTitle}>Ekran Parlaklığı</Text>
          <View style={[styles.badge, { backgroundColor: isCinemaMode ? '#6C3483' : '#f39c12' }]}>
            <Text style={styles.badgeText}>{isCinemaMode ? 'SİNEMA' : 'NORMAL'}</Text>
          </View>
        </View>

        <Text style={styles.cardDesc}>
          {isCinemaMode
            ? '🎬 Ekran karartıldı — film izleme modu aktif'
            : '☀️ Normal parlaklık — sistem ayarında'}
        </Text>

        <TouchableOpacity style={styles.btn} onPress={toggleCinemaMode}>
          <Ionicons
            name={isCinemaMode ? 'sunny-outline' : 'moon-outline'}
            size={16} color="white"
          />
          <Text style={styles.btnText}>
            {isCinemaMode ? 'Normal Moda Geç' : 'Sinema Moduna Geç'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. BATARYA ─────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="battery-half-outline" size={20} color={batteryColor} />
          <Text style={styles.cardTitle}>Batarya</Text>
          {battery && (
            <View style={[styles.badge, { backgroundColor: batteryColor }]}>
              <Text style={styles.badgeText}>%{battery.percentage}</Text>
            </View>
          )}
        </View>

        {battery ? (
          <>
            {/* Görsel bar */}
            <View style={styles.batteryBarWrap}>
              <View style={styles.batteryBarBg}>
                <View style={[
                  styles.batteryBarFill,
                  { width: `${battery.percentage}%` as any, backgroundColor: batteryColor },
                ]} />
              </View>
              <Text style={[styles.batteryPct, { color: batteryColor }]}>
                %{battery.percentage}
              </Text>
            </View>
            <View style={styles.locationBox}>
              <LocationRow label="Durum"  value={battery.state} />
              <LocationRow label="Şarjda" value={battery.isCharging ? 'Evet ⚡' : 'Hayır'} />
            </View>
          </>
        ) : (
          <Text style={styles.cardDesc}>Batarya bilgisi alınıyor...</Text>
        )}
      </View>

      {/* ── 5. NETWORK DURUMU ──────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={networkIcon as any} size={20} color="#DB7093" />
          <Text style={styles.cardTitle}>Ağ Bağlantısı</Text>
        </View>

        <View style={[
          styles.networkStatus,
          { backgroundColor: isConnected ? '#d4edda' : '#f8d7da' },
        ]}>
          <Ionicons
            name={isConnected ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={isConnected ? '#155724' : '#721c24'}
          />
          <View>
            <Text style={[styles.networkText, { color: isConnected ? '#155724' : '#721c24' }]}>
              {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
            </Text>
            <Text style={styles.networkType}>{networkType}</Text>
          </View>
        </View>

        <Text style={styles.cardDesc}>
          {isConnected
            ? "TMDB API'den canlı veri çekiliyor."
            : 'Önbellekteki veriler gösteriliyor. İnternet bağlantısı kurun.'}
        </Text>
      </View>

    </ScrollView>
  );
}

// ── Küçük yardımcı ────────────────────────────────────────────
function LocationRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.locationRow}>
      <Text style={styles.locationLabel}>{label}</Text>
      <Text style={styles.locationValue}>{value}</Text>
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FFF5F7', padding: 16 },
  pageTitle:  { fontSize: 22, fontWeight: 'bold', color: '#DB7093', marginBottom: 16 },

  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    marginBottom: 14, elevation: 3,
    shadowColor: '#DB7093', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
    borderWidth: 1, borderColor: '#FFD1DC',
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle:    { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#4A4A4A' },
  cardSubTitle: { fontSize: 14, fontWeight: '600', color: '#DB7093', marginBottom: 4 },
  cardDesc:     { fontSize: 12, color: '#aaa', marginBottom: 12 },
  divider:      { height: 1, backgroundColor: '#FFD1DC', marginVertical: 12 },

  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  // Accelerometer
  accelRow:   { flexDirection: 'row', gap: 8, marginBottom: 4 },
  accelItem:  {
    flex: 1, backgroundColor: '#FFF5F7', borderRadius: 12,
    padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#FFD1DC',
  },
  accelLabel: { fontSize: 11, color: '#DB7093', fontWeight: 'bold' },
  accelValue: { fontSize: 14, fontWeight: '600', color: '#4A4A4A', marginTop: 2 },

  filmBox: {
    backgroundColor: '#FFF5F7', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD1DC', marginBottom: 8,
  },
  filmBoxEmoji: { fontSize: 32, marginBottom: 6 },
  filmBoxTitle: { fontSize: 16, fontWeight: 'bold', color: '#DB7093' },
  filmBoxMeta:  { fontSize: 12, color: '#aaa', marginTop: 3 },
  shakeCount:   { fontSize: 11, color: '#c0a0b0', textAlign: 'center' },

  // Location
  locationBox:   {
    backgroundColor: '#FFF5F7', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#FFD1DC', gap: 6,
  },
  locationRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  locationLabel: { fontSize: 12, color: '#DB7093', fontWeight: '600' },
  locationValue: { fontSize: 12, color: '#4A4A4A', fontFamily: 'monospace' },

  // Battery
  batteryBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  batteryBarBg: {
    flex: 1, height: 12, backgroundColor: '#f0f0f0',
    borderRadius: 6, overflow: 'hidden',
  },
  batteryBarFill: { height: '100%', borderRadius: 6 },
  batteryPct:     { fontSize: 13, fontWeight: 'bold', minWidth: 40 },

  // Network
  networkStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 10,
  },
  networkText: { fontSize: 15, fontWeight: 'bold' },
  networkType: { fontSize: 12, color: '#666', marginTop: 2 },

  // Butonlar
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#DB7093', paddingVertical: 11, borderRadius: 14,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: 'white', fontWeight: 'bold', fontSize: 13 },
});