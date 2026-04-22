// hooks/useSensors.ts
// ✅ 4 Sensör:
//   1. Accelerometer  — sallama algılama
//   2. expo-location  — GPS konum, hız, yön, irtifa
//   3. expo-brightness — ekran parlaklığı (sinema modu toggle)
//   4. expo-battery   — batarya seviyesi & şarj durumu
//   5. expo-network   — ağ tipi & bağlantı durumu (NetworkBanner'da kullanılıyor)

import * as Battery from 'expo-battery';
import * as Brightness from 'expo-brightness';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// 1. Accelerometer — sallama algılama
// ─────────────────────────────────────────────────────────────
export function useShakeDetector(onShake: () => void, threshold = 1.8) {
  const lastShake = useRef(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(200);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const total = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (total > threshold && now - lastShake.current > 1000) {
        lastShake.current = now;
        onShake();
      }
    });
    return () => sub.remove();
  }, [onShake, threshold]);
}

// ─────────────────────────────────────────────────────────────
// 2. expo-location — GPS konum, hız, yön, irtifa
// ─────────────────────────────────────────────────────────────
export interface UserLocation {
  lat: number;
  lng: number;
  altitude: number | null;   // irtifa (metre)
  speed: number | null;      // hız (m/s)
  heading: number | null;    // yön (derece, 0=kuzey)
  accuracy: number | null;   // doğruluk (metre)
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Konum izni reddedildi.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setLocation({
        lat:      loc.coords.latitude,
        lng:      loc.coords.longitude,
        altitude: loc.coords.altitude,
        speed:    loc.coords.speed,
        heading:  loc.coords.heading,
        accuracy: loc.coords.accuracy,
      });
      setLocationError(null);
    } catch (e) {
      setLocationError('Konum alınamadı.');
    } finally {
      setLocationLoading(false);
    }
  };

  return { location, locationError, locationLoading, getLocation };
}

// ─────────────────────────────────────────────────────────────
// 3. expo-brightness — sinema / normal mod toggle
// ─────────────────────────────────────────────────────────────
export function useBrightness() {
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  const toggleCinemaMode = useCallback(async () => {
    try {
      const next = !isCinemaMode;
      setIsCinemaMode(next);
      if (next) {
        await Brightness.setBrightnessAsync(0.1);  // sinema: karanlık
      } else {
        await Brightness.useSystemBrightnessAsync(); // normal: sisteme dön
      }
    } catch (e) {
      console.log('Brightness error:', e);
    }
  }, [isCinemaMode]);

  return { isCinemaMode, toggleCinemaMode };
}

// ─────────────────────────────────────────────────────────────
// 4. expo-battery — batarya seviyesi & şarj durumu
// ─────────────────────────────────────────────────────────────
export interface BatteryInfo {
  level: number;           // 0.0 – 1.0
  percentage: number;      // 0 – 100
  isCharging: boolean;
  state: string;           // 'Charging' | 'Discharging' | 'Full' | 'Unknown'
}

export function useBattery() {
  const [battery, setBattery] = useState<BatteryInfo | null>(null);

  useEffect(() => {
    let chargeSub: Battery.Subscription;
    let levelSub:  Battery.Subscription;

    const init = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        updateBattery(level, state);

        // Şarj durumu değişince güncelle
        chargeSub = Battery.addBatteryStateListener(({ batteryState }) => {
          Battery.getBatteryLevelAsync().then((lvl) => updateBattery(lvl, batteryState));
        });

        // Seviye değişince güncelle
        levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          Battery.getBatteryStateAsync().then((st) => updateBattery(batteryLevel, st));
        });
      } catch (e) {
        console.log('Battery error:', e);
      }
    };

    init();
    return () => {
      chargeSub?.remove();
      levelSub?.remove();
    };
  }, []);

  const updateBattery = (level: number, state: Battery.BatteryState) => {
    const stateMap: Record<Battery.BatteryState, string> = {
      [Battery.BatteryState.CHARGING]:    'Şarj Oluyor',
      [Battery.BatteryState.FULL]:        'Dolu',
      [Battery.BatteryState.UNPLUGGED]:   'Pil ile Çalışıyor',
      [Battery.BatteryState.UNKNOWN]:     'Bilinmiyor',
    };
    setBattery({
      level,
      percentage: Math.round(level * 100),
      isCharging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
      state: stateMap[state] ?? 'Bilinmiyor',
    });
  };

  return { battery };
}

// ─────────────────────────────────────────────────────────────
// 5. expo-network — ağ tipi & bağlantı durumu
// ─────────────────────────────────────────────────────────────
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState<string>('Bilinmiyor');

  useEffect(() => {
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsConnected(state.isConnected ?? true);

        const typeMap: Record<string, string> = {
          WIFI:     'Wi-Fi',
          CELLULAR: 'Mobil Veri',
          NONE:     'Bağlantı Yok',
          UNKNOWN:  'Bilinmiyor',
        };
        setNetworkType(typeMap[state.type ?? 'UNKNOWN'] ?? 'Bilinmiyor');
      } catch (e) {
        console.log('Network error:', e);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return { isConnected, networkType };
}