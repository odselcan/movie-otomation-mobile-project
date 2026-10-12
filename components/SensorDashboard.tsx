// components/SensorDashboard.tsx
// 4 sensörü canlı olarak gösteren dashboard kartı
// Kullanım: istediğin ekrana <SensorDashboard /> olarak ekle

import { useBattery, useBrightness, useNetworkStatus, useUserLocation } from '@/hooks/useSensors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SensorDashboard() {
  // ── Sensör hook'ları ──────────────────────────────────────
  const { location, locationLoading, locationError, getLocation } = useUserLocation();
  const { isCinemaMode, toggleCinemaMode }                        = useBrightness();
  const { battery }                                               = useBattery();
  const { isConnected, networkType }                              = useNetworkStatus();

  // ── Batarya rengi ─────────────────────────────────────────
  const batteryColor = !battery
    ? '#aaa'
    : battery.isCharging
    ? '#2ecc71'
    : battery.percentage > 50
    ? '#2ecc71'
    : battery.percentage > 20
    ? '#f39c12'
    : '#e74c3c';

  // ── Batarya ikonu ─────────────────────────────────────────
  const batteryIcon = !battery
    ? 'battery-dead-outline'
    : battery.isCharging
    ? 'battery-charging-outline'
    : battery.percentage > 75
    ? 'battery-full-outline'
    : battery.percentage > 50
    ? 'battery-half-outline'
    : battery.percentage > 20
    ? 'battery-half-outline'
    : 'battery-dead-outline';

  // ── Yön metni ─────────────────────────────────────────────
  const getHeadingText = (heading: number | null) => {
    if (heading === null) return '—';
    const dirs = ['Kuzey', 'KD', 'Doğu', 'GD', 'Güney', 'GB', 'Batı', 'KB'];
    return dirs[Math.round(heading / 45) % 8];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 Sensör Paneli</Text>

      {/* ── 1. GPS Konum ──────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="location" size={18} color="#DB7093" />
          <Text style={styles.cardTitle}>GPS Konum</Text>
          <View style={[styles.badge, { backgroundColor: location ? '#2ecc71' : '#e74c3c' }]}>
            <Text style={styles.badgeText}>{location ? 'AKTİF' : 'PASİF'}</Text>
          </View>
        </View>

        {location ? (
          <View style={styles.cardBody}>
            <Row icon="navigate-outline" label="Enlem"   value={location.lat.toFixed(5) + '°'} />
            <Row icon="navigate-outline" label="Boylam"  value={location.lng.toFixed(5) + '°'} />
            <Row icon="trending-up-outline" label="İrtifa"
              value={location.altitude !== null ? location.altitude.toFixed(1) + ' m' : '—'} />
            <Row icon="speedometer-outline" label="Hız"
              value={location.speed !== null ? (location.speed * 3.6).toFixed(1) + ' km/h' : '—'} />
            <Row icon="compass-outline" label="Yön"
              value={getHeadingText(location.heading)} />
            <Row icon="radio-outline" label="Doğruluk"
              value={location.accuracy !== null ? '±' + location.accuracy.toFixed(0) + ' m' : '—'} />
          </View>
        ) : (
          <Text style={styles.emptyText}>
            {locationError ?? 'Konum henüz alınmadı'}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.btn, locationLoading && styles.btnDisabled]}
          onPress={getLocation}
          disabled={locationLoading}
        >
          {locationLoading
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="locate-outline" size={16} color="white" />
          }
          <Text style={styles.btnText}>
            {locationLoading ? 'Alınıyor...' : 'Konumu Al'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. Ekran Parlaklığı ───────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={isCinemaMode ? 'film' : 'sunny'} size={18} color="#DB7093" />
          <Text style={styles.cardTitle}>Ekran Parlaklığı</Text>
          <View style={[styles.badge, { backgroundColor: isCinemaMode ? '#6C3483' : '#f39c12' }]}>
            <Text style={styles.badgeText}>{isCinemaMode ? 'SİNEMA' : 'NORMAL'}</Text>
          </View>
        </View>

        <Text style={styles.emptyText}>
          {isCinemaMode
            ? '🎬 Ekran karartıldı — film izleme modu aktif'
            : '☀️ Normal parlaklık — sistem ayarında'}
        </Text>

        <TouchableOpacity style={styles.btn} onPress={toggleCinemaMode}>
          <Ionicons
            name={isCinemaMode ? 'sunny-outline' : 'film-outline'}
            size={16} color="white"
          />
          <Text style={styles.btnText}>
            {isCinemaMode ? 'Normal Moda Geç' : 'Sinema Moduna Geç'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. Batarya ────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={batteryIcon as any} size={18} color={batteryColor} />
          <Text style={styles.cardTitle}>Batarya</Text>
          {battery && (
            <View style={[styles.badge, { backgroundColor: batteryColor }]}>
              <Text style={styles.badgeText}>%{battery.percentage}</Text>
            </View>
          )}
        </View>

        {battery ? (
          <View style={styles.cardBody}>
            {/* Görsel batarya çubuğu */}
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
            <Row icon="flash-outline"  label="Durum"  value={battery.state} />
            <Row icon="power-outline"  label="Şarjda" value={battery.isCharging ? 'Evet ⚡' : 'Hayır'} />
          </View>
        ) : (
          <Text style={styles.emptyText}>Batarya bilgisi alınıyor...</Text>
        )}
      </View>

      {/* ── 4. Ağ Bağlantısı ─────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={isConnected ? 'wifi' : 'wifi-outline'}
            size={18}
            color={isConnected ? '#2ecc71' : '#e74c3c'}
          />
          <Text style={styles.cardTitle}>Ağ Bağlantısı</Text>
          <View style={[styles.badge, { backgroundColor: isConnected ? '#2ecc71' : '#e74c3c' }]}>
            <Text style={styles.badgeText}>{isConnected ? 'BAĞLI' : 'KESİK'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Row icon="cellular-outline"  label="Bağlantı"  value={isConnected ? 'Var' : 'Yok'} />
          <Row icon="globe-outline"     label="Ağ Tipi"   value={networkType} />
        </View>
      </View>
    </View>
  );
}

// ── Küçük yardımcı satır componenti ──────────────────────────
function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={13} color="#DB7093" style={{ marginTop: 1 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ─── Stiller ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 16, fontWeight: 'bold', color: '#DB7093', marginBottom: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD1DC',
    elevation: 2,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  cardTitle: {
    flex: 1, fontSize: 14, fontWeight: '700', color: '#2C2C2C',
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white', fontSize: 10, fontWeight: 'bold',
  },
  cardBody: { gap: 6 },
  emptyText: {
    fontSize: 12, color: '#888', fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  rowLabel: {
    flex: 1, fontSize: 12, color: '#888',
  },
  rowValue: {
    fontSize: 12, fontWeight: '600', color: '#2C2C2C',
  },
  batteryBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  batteryBarBg: {
    flex: 1, height: 10, backgroundColor: '#f0f0f0',
    borderRadius: 5, overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%', borderRadius: 5,
  },
  batteryPct: {
    fontSize: 12, fontWeight: 'bold', minWidth: 36,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#DB7093',
    paddingVertical: 10, borderRadius: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: 'white', fontWeight: 'bold', fontSize: 13,
  },
});
