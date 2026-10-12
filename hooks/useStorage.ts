// hooks/useStorage.ts
// Nielsen #1 Sistem Durumu: loading/error state ile kullanıcı bilgilendirilir
// Nielsen #5 Hata Önleme: try/catch + input validation
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';

export interface MediaItem {
  id: string;
  title: string;
  trailer: string;
  year: string;
  type: string;
  img: string;
  userRating: number;
  userNote: string;
  addedAt: string;
}

export const PAGE_SIZE = 6;

export function useMediaStorage(storageKey: string) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // READ
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await AsyncStorage.getItem(storageKey);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setError('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  // CREATE / UPDATE (upsert)
  const upsert = useCallback(
    async (item: Partial<MediaItem> & { id: string }) => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const list: MediaItem[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...item };
        } else {
          list.unshift({
            userRating: 0,
            userNote: '',
            addedAt: new Date().toISOString(),
            ...item,
          } as MediaItem);
        }
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        setItems([...list]);
      } catch {
        setError('Kayıt işlemi başarısız.');
      }
    },
    [storageKey]
  );

  // DELETE
  const remove = useCallback(
    async (id: string) => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const list: MediaItem[] = raw ? JSON.parse(raw) : [];
        const updated = list.filter((i) => i.id !== id);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
        setItems(updated);
      } catch {
        setError('Silme işlemi başarısız.');
      }
    },
    [storageKey]
  );

  // SEARCH — title, year, type üzerinden
  const searchItems = useCallback((query: string, list: MediaItem[]) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.year.includes(q) ||
        i.type.toLowerCase().includes(q)
    );
  }, []);

  // PAGING
  const getPage = useCallback((list: MediaItem[], page: number) => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    const start = safePage * PAGE_SIZE;
    return {
      data: list.slice(start, start + PAGE_SIZE),
      totalPages,
      currentPage: safePage,
    };
  }, []);

  return { items, loading, error, load, upsert, remove, searchItems, getPage };
}