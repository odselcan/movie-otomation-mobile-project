/**
 * __tests__/useSensors.test.ts
 * hooks/useSensors.ts — gercek export'lar:
 *   useShakeDetector, useUserLocation, useBrightness, useBattery, useNetworkStatus
 */

import { renderHook, act } from '@testing-library/react-native';

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    setUpdateInterval: jest.fn(),
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 36.8841,
        longitude: 30.7056,
        altitude: 35,
        speed: 0,
        heading: 0,
        accuracy: 5,
      },
    })
  ),
  Accuracy: { BestForNavigation: 6 },
}));

jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(() => Promise.resolve(0.75)),
  getBatteryStateAsync: jest.fn(() => Promise.resolve(2)),
  addBatteryStateListener: jest.fn(() => ({ remove: jest.fn() })),
  addBatteryLevelListener: jest.fn(() => ({ remove: jest.fn() })),
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3 },
}));

jest.mock('expo-brightness', () => ({
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
  useSystemBrightnessAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({ isConnected: true, type: 'WIFI' })
  ),
}));

import { useShakeDetector, useUserLocation, useBrightness, useBattery, useNetworkStatus } from '../hooks/useSensors';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Brightness from 'expo-brightness';
import * as Network from 'expo-network';

// ─── useShakeDetector ─────────────────────────────────────────────────────────
describe('useShakeDetector', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Accelerometer.addListener cagrilir', () => {
    const onShake = jest.fn();
    renderHook(() => useShakeDetector(onShake));
    expect(Accelerometer.addListener).toHaveBeenCalled();
  });

  it('setUpdateInterval cagrilir', () => {
    renderHook(() => useShakeDetector(jest.fn()));
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(200);
  });

  it('unmount edilince listener kaldirilir', () => {
    const removeMock = jest.fn();
    (Accelerometer.addListener as jest.Mock).mockReturnValueOnce({ remove: removeMock });
    const { unmount } = renderHook(() => useShakeDetector(jest.fn()));
    unmount();
    expect(removeMock).toHaveBeenCalled();
  });

  it('onShake callback sallaninca cagrilir', () => {
    const onShake = jest.fn();
    let listenerCallback: Function;
    (Accelerometer.addListener as jest.Mock).mockImplementationOnce((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });
    renderHook(() => useShakeDetector(onShake, 1.5));
    // Yuksek ivme degeri ile sallama simule et
    act(() => { listenerCallback({ x: 2.0, y: 2.0, z: 2.0 }); });
    expect(onShake).toHaveBeenCalled();
  });

  it('dusuk ivmede onShake cagrilmaz', () => {
    const onShake = jest.fn();
    let listenerCallback: Function;
    (Accelerometer.addListener as jest.Mock).mockImplementationOnce((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });
    renderHook(() => useShakeDetector(onShake, 1.8));
    act(() => { listenerCallback({ x: 0.1, y: 0.1, z: 1.0 }); });
    expect(onShake).not.toHaveBeenCalled();
  });
});

// ─── useUserLocation ──────────────────────────────────────────────────────────
describe('useUserLocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('baslangicta location null', () => {
    const { result } = renderHook(() => useUserLocation());
    expect(result.current.location).toBeNull();
  });

  it('getLocation cagrilinca izin istenir', async () => {
    const { result } = renderHook(() => useUserLocation());
    await act(async () => { await result.current.getLocation(); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it('izin verince konum doner', async () => {
    const { result } = renderHook(() => useUserLocation());
    await act(async () => { await result.current.getLocation(); });
    expect(result.current.location).not.toBeNull();
    expect(result.current.location?.lat).toBe(36.8841);
  });

  it('izin reddedilince locationError set edilir', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied', granted: false,
    });
    const { result } = renderHook(() => useUserLocation());
    await act(async () => { await result.current.getLocation(); });
    expect(result.current.locationError).not.toBeNull();
  });

  it('loading baslangicta false', () => {
    const { result } = renderHook(() => useUserLocation());
    expect(result.current.locationLoading).toBe(false);
  });
});

// ─── useBrightness ────────────────────────────────────────────────────────────
describe('useBrightness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('baslangicta isCinemaMode false', () => {
    const { result } = renderHook(() => useBrightness());
    expect(result.current.isCinemaMode).toBe(false);
  });

  it('toggleCinemaMode cagrilinca isCinemaMode degisir', async () => {
    const { result } = renderHook(() => useBrightness());
    await act(async () => { await result.current.toggleCinemaMode(); });
    expect(result.current.isCinemaMode).toBe(true);
  });

  it('sinema modunda setBrightnessAsync cagrilir', async () => {
    const { result } = renderHook(() => useBrightness());
    await act(async () => { await result.current.toggleCinemaMode(); });
    expect(Brightness.setBrightnessAsync).toHaveBeenCalledWith(0.1);
  });

  it('sinema modu kapaninca useSystemBrightnessAsync cagrilir', async () => {
    const { result } = renderHook(() => useBrightness());
    await act(async () => { await result.current.toggleCinemaMode(); }); // ac
    await act(async () => { await result.current.toggleCinemaMode(); }); // kapat
    expect(Brightness.useSystemBrightnessAsync).toHaveBeenCalled();
  });
});

// ─── useBattery ───────────────────────────────────────────────────────────────
describe('useBattery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('batarya bilgisi doner', async () => {
    const { result } = renderHook(() => useBattery());
    await act(async () => { await Promise.resolve(); });
    expect(Battery.getBatteryLevelAsync).toHaveBeenCalled();
  });

  it('getBatteryStateAsync cagrilir', async () => {
    renderHook(() => useBattery());
    await act(async () => { await Promise.resolve(); });
    expect(Battery.getBatteryStateAsync).toHaveBeenCalled();
  });
});

// ─── useNetworkStatus ─────────────────────────────────────────────────────────
describe('useNetworkStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('baslangicta isConnected true', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);
  });

  it('getNetworkStateAsync cagrilir', async () => {
    renderHook(() => useNetworkStatus());
    await act(async () => { await Promise.resolve(); });
    expect(Network.getNetworkStateAsync).toHaveBeenCalled();
  });

  it('baglantisiz durumda isConnected false olur', async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      isConnected: false, type: 'NONE',
    });
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.isConnected).toBe(false);
  });

  it('networkType string doner', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => { await Promise.resolve(); });
    expect(typeof result.current.networkType).toBe('string');
  });
});