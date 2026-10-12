/**
 * __tests__/useStorage.test.ts
 * hooks/useStorage.ts — gercek export: useMediaStorage, PAGE_SIZE
 */

import { renderHook, act } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMediaStorage, PAGE_SIZE } from '../hooks/useStorage';
import type { MediaItem } from '../hooks/useStorage';

const makeItem = (id: string, title: string): MediaItem => ({
  id,
  title,
  trailer: '',
  year: '2024',
  type: 'movie',
  img: 'https://via.placeholder.com/80x110',
  userRating: 0,
  userNote: '',
  addedAt: new Date().toISOString(),
});

const ITEM_A = makeItem('1', 'Inception');
const ITEM_B = makeItem('2', 'Interstellar');
const ITEM_C = makeItem('3', 'Tenet');

// ─── PAGE_SIZE ────────────────────────────────────────────────────────────────
describe('PAGE_SIZE sabiti', () => {
  it('pozitif sayi olmali', () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });

  it('sayi tipinde olmali', () => {
    expect(typeof PAGE_SIZE).toBe('number');
  });
});

// ─── load ─────────────────────────────────────────────────────────────────────
describe('useMediaStorage - load', () => {
  beforeEach(() => jest.clearAllMocks());

  it('AsyncStorage bossa bos liste doner', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.load(); });
    expect(result.current.items).toEqual([]);
  });

  it('kayitli veriyi parse eder', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([ITEM_A, ITEM_B]));
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.load(); });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].title).toBe('Inception');
  });

  it('dogru key ile AsyncStorage cagrilir', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useMediaStorage('watchlist'));
    await act(async () => { await result.current.load(); });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('watchlist');
  });

  it('yukleme sonrasi loading false olur', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.load(); });
    expect(result.current.loading).toBe(false);
  });
});

// ─── upsert (CREATE) ──────────────────────────────────────────────────────────
describe('useMediaStorage - upsert (ekle)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('yeni item ekler', async () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.upsert(ITEM_A); });
    expect(result.current.items.find(i => i.id === '1')).toBeDefined();
  });

  it('AsyncStorage.setItem cagrilir', async () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.upsert(ITEM_A); });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('var olan item guncellenir (update)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([ITEM_A]));
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => {
      await result.current.upsert({ id: '1', title: 'Inception Updated', userRating: 9 });
    });
    const updated = result.current.items.find(i => i.id === '1');
    expect(updated?.userRating).toBe(9);
  });
});

// ─── remove (DELETE) ──────────────────────────────────────────────────────────
describe('useMediaStorage - remove (sil)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([ITEM_A, ITEM_B, ITEM_C]));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('ID ile item siler', async () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.remove('2'); });
    expect(result.current.items.find(i => i.id === '2')).toBeUndefined();
  });

  it('silme sonrasi diger itemlar korunur', async () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.remove('2'); });
    expect(result.current.items.find(i => i.id === '1')).toBeDefined();
    expect(result.current.items.find(i => i.id === '3')).toBeDefined();
  });

  it('silme sonrasi AsyncStorage guncellenir', async () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await act(async () => { await result.current.remove('1'); });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('olmayan ID silinince hata vermez', async () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    await expect(
      act(async () => { await result.current.remove('9999'); })
    ).resolves.not.toThrow();
  });
});

// ─── searchItems ──────────────────────────────────────────────────────────────
describe('useMediaStorage - searchItems', () => {
  const list: MediaItem[] = [
    makeItem('1', 'Inception'),
    makeItem('2', 'Interstellar'),
    makeItem('3', 'Fight Club'),
  ];

  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('eslesen filmleri bulur', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const found = result.current.searchItems('inter', list);
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('Interstellar');
  });

  it('bos query tum listeyi doner', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const found = result.current.searchItems('', list);
    expect(found).toHaveLength(3);
  });

  it('buyuk-kucuk harf duyarsiz arama', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const found = result.current.searchItems('INCEPTION', list);
    expect(found).toHaveLength(1);
  });

  it('eslesen yok ise bos dizi doner', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const found = result.current.searchItems('zzzzz', list);
    expect(found).toHaveLength(0);
  });
});

// ─── getPage ─────────────────────────────────────────────────────────────────
describe('useMediaStorage - getPage', () => {
  const bigList: MediaItem[] = Array.from({ length: 15 }, (_, i) =>
    makeItem(String(i), `Film ${i}`)
  );

  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('ilk sayfa dogru boyutta doner', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const { data } = result.current.getPage(bigList, 0);
    expect(data).toHaveLength(PAGE_SIZE);
  });

  it('toplam sayfa sayisi dogru hesaplanir', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const { totalPages } = result.current.getPage(bigList, 0);
    expect(totalPages).toBe(Math.ceil(15 / PAGE_SIZE));
  });

  it('bos liste icin totalPages 1 doner', () => {
    const { result } = renderHook(() => useMediaStorage('favorites'));
    const { totalPages } = result.current.getPage([], 0);
    expect(totalPages).toBe(1);
  });
});