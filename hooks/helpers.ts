/**
 * hooks/helpers.ts
 * Pure yardımcı fonksiyonlar — test edilebilir, side-effect yok
 */

// ─── 1. getDistance — Haversine formülü (km) ─────────────────────────────────
export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── 2. toggleFavorite — Favorilere ekle/çıkar ───────────────────────────────
export function toggleFavorite<T extends { id: number }>(
  list: T[],
  item: T,
): T[] {
  const exists = list.some((i) => i.id === item.id);
  if (exists) {
    return list.filter((i) => i.id !== item.id);
  }
  return [...list, item];
}

// ─── 3. isContentAllowed — adult + puan filtresi ─────────────────────────────
export function isContentAllowed(item: {
  adult: boolean;
  vote_average: number;
}): boolean {
  return !item.adult && item.vote_average >= 6.5;
}

// ─── 4. formatRating — Puan formatlama ───────────────────────────────────────
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

// ─── 5. formatDate — Tarih formatlama (YYYY-MM-DD → GG.AA.YYYY) ──────────────
export function formatDate(dateStr: string): string {
  if (!dateStr) return 'Tarih yok';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Geçersiz tarih';
  return date.toLocaleDateString('tr-TR');
}

// ─── 6. getImageUrl — TMDB poster URL ────────────────────────────────────────
export function getImageUrl(
  posterPath: string | null | undefined,
  size: string = 'w500',
): string {
  if (!posterPath) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

// ─── 7. filterByGenre — Tür filtresi ─────────────────────────────────────────
export function filterByGenre<T extends { genre_ids: number[] }>(
  items: T[],
  genreId: number,
): T[] {
  if (genreId === 0) return items;
  return items.filter((item) => item.genre_ids.includes(genreId));
}

// ─── 8. sortByRating — Puana göre sıralama ───────────────────────────────────
export function sortByRating<T extends { vote_average: number }>(
  items: T[],
  order: 'asc' | 'desc' = 'desc',
): T[] {
  return [...items].sort((a, b) =>
    order === 'desc'
      ? b.vote_average - a.vote_average
      : a.vote_average - b.vote_average,
  );
}

// ─── 9. truncateText — Uzun metni kısalt ─────────────────────────────────────
export function truncateText(text: string, limit: number): string {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
}

// ─── 10. isInList — Öğe listede var mı? ──────────────────────────────────────
export function isInList<T extends { id: number }>(
  list: T[],
  id: number,
): boolean {
  return list.some((item) => item.id === id);
}