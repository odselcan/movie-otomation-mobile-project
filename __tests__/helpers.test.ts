/**
 * __tests__/helpers.test.ts
 *
 * Pure Fonksiyon Testleri — hooks/helpers.ts
 * 48 test, 10 grup
 *
 * ⚠️ Import yolu farklıysa güncelle:
 *    '../hooks/helpers' veya '../helpers' veya '../utils/helpers'
 */

import {
  getDistance,
  toggleFavorite,
  isContentAllowed,
  formatRating,
  formatDate,
  getImageUrl,
  filterByGenre,
  sortByRating,
  truncateText,
  isInList,
} from '../hooks/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// 1. getDistance — Haversine formülü (km cinsinden iki nokta arası mesafe)
// ─────────────────────────────────────────────────────────────────────────────
describe('getDistance', () => {
  it('aynı koordinatlar için 0 döner', () => {
    expect(getDistance(41.0082, 28.9784, 41.0082, 28.9784)).toBe(0);
  });

  it('İstanbul → Ankara arası ~350 km', () => {
    const dist = getDistance(41.0082, 28.9784, 39.9334, 32.8597);
    expect(dist).toBeGreaterThan(340);
    expect(dist).toBeLessThan(360);
  });

  it('Antalya Istanbul arasi ~480 km', () => {
    const dist = getDistance(36.8841, 30.7056, 41.0082, 28.9784);
    expect(dist).toBeGreaterThan(450);
    expect(dist).toBeLessThan(550);
  });

  it('pozitif değer döner (negatif koordinat olsa bile)', () => {
    const dist = getDistance(-33.8688, 151.2093, 51.5074, -0.1278);
    expect(dist).toBeGreaterThan(0);
  });

  it('sayısal değer döner', () => {
    const dist = getDistance(41.0, 29.0, 40.0, 28.0);
    expect(typeof dist).toBe('number');
    expect(isNaN(dist)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. toggleFavorite — Favorilere ekle/çıkar
// ─────────────────────────────────────────────────────────────────────────────
describe('toggleFavorite', () => {
  const movie1 = { id: 1, title: 'Inception' };
  const movie2 = { id: 2, title: 'Interstellar' };

  it('boş listeye film ekler', () => {
    const result = toggleFavorite([], movie1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(movie1);
  });

  it('listede olmayan film eklenir', () => {
    const result = toggleFavorite([movie1], movie2);
    expect(result).toHaveLength(2);
  });

  it('listede olan film çıkarılır', () => {
    const result = toggleFavorite([movie1, movie2], movie1);
    expect(result).toHaveLength(1);
    expect(result.find((m: { id: number }) => m.id === 1)).toBeUndefined();
  });

  it('çıkarma sonrası kalan öğeler korunur', () => {
    const result = toggleFavorite([movie1, movie2], movie1);
    expect(result[0]).toEqual(movie2);
  });

  it('orijinal diziyi mutate etmez', () => {
    const original = [movie1, movie2];
    toggleFavorite(original, movie1);
    expect(original).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. isContentAllowed — adult filtresi + puan filtresi
// ─────────────────────────────────────────────────────────────────────────────
describe('isContentAllowed', () => {
  it('adult=false ve puan≥6.5 → true döner', () => {
    expect(isContentAllowed({ adult: false, vote_average: 7.0 })).toBe(true);
  });

  it('adult=true → false döner', () => {
    expect(isContentAllowed({ adult: true, vote_average: 8.0 })).toBe(false);
  });

  it('puan<6.5 → false döner', () => {
    expect(isContentAllowed({ adult: false, vote_average: 5.0 })).toBe(false);
  });

  it('puan tam 6.5 → true döner', () => {
    expect(isContentAllowed({ adult: false, vote_average: 6.5 })).toBe(true);
  });

  it('adult=true ve puan düşük → false döner', () => {
    expect(isContentAllowed({ adult: true, vote_average: 4.0 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. formatRating — Puanı string formatına çevirir
// ─────────────────────────────────────────────────────────────────────────────
describe('formatRating', () => {
  it('8.4 → "8.4" döner', () => {
    const result = formatRating(8.4);
    expect(result).toContain('8.4');
  });

  it('10 → "10.0" veya "10" döner', () => {
    const result = formatRating(10);
    expect(result).toMatch(/10/);
  });

  it('0 → "0" veya "0.0" döner', () => {
    const result = formatRating(0);
    expect(result).toMatch(/0/);
  });

  it('string tipinde döner', () => {
    expect(typeof formatRating(7.5)).toBe('string');
  });

  it('9.99 işlenir', () => {
    const result = formatRating(9.99);
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. formatDate — Tarih formatı
// ─────────────────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('geçerli tarih string döner', () => {
    const result = formatDate('1999-10-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('yılı içerir', () => {
    const result = formatDate('1999-10-15');
    expect(result).toContain('1999');
  });

  it('boş string → fallback döner', () => {
    const result = formatDate('');
    expect(result).toBeDefined();
  });

  it('geçersiz tarih → hata vermez', () => {
    expect(() => formatDate('invalid-date')).not.toThrow();
  });

  it('2024 yılı doğru formatlanır', () => {
    const result = formatDate('2024-06-15');
    expect(result).toContain('2024');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. getImageUrl — TMDB poster URL oluşturur
// ─────────────────────────────────────────────────────────────────────────────
describe('getImageUrl', () => {
  it('poster_path ile tam URL döner', () => {
    const url = getImageUrl('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
    expect(url).toContain('image.tmdb.org');
  });

  it('https ile başlar', () => {
    const url = getImageUrl('/test.jpg');
    expect(url).toMatch(/^https/);
  });

  it('null/undefined → fallback URL döner', () => {
    const url = getImageUrl(null);
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('w500 boyutu içerir', () => {
    const url = getImageUrl('/test.jpg', 'w500');
    expect(url).toContain('w500');
  });

  it('path doğrudan dahil edilir', () => {
    const url = getImageUrl('/abc123.jpg');
    expect(url).toContain('abc123');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. filterByGenre — Tür filtresi
// ─────────────────────────────────────────────────────────────────────────────
describe('filterByGenre', () => {
  const movies = [
    { id: 1, title: 'A', genre_ids: [28, 12] },   // Action, Adventure
    { id: 2, title: 'B', genre_ids: [18, 80] },   // Drama, Crime
    { id: 3, title: 'C', genre_ids: [28, 53] },   // Action, Thriller
  ];

  it('belirli türe göre filtreler', () => {
    const result = filterByGenre(movies, 28); // Action
    expect(result).toHaveLength(2);
  });

  it('eşleşme yoksa boş dizi döner', () => {
    const result = filterByGenre(movies, 999);
    expect(result).toHaveLength(0);
  });

  it('genreId=0 (Tümü) tüm listeyi döner', () => {
    const result = filterByGenre(movies, 0);
    expect(result).toHaveLength(3);
  });

  it('sonuç doğru öğeleri içerir', () => {
    const result = filterByGenre(movies, 18);
    expect(result[0].title).toBe('B');
  });

  it('orijinal diziyi değiştirmez', () => {
    filterByGenre(movies, 28);
    expect(movies).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. sortByRating — Puana göre sırala
// ─────────────────────────────────────────────────────────────────────────────
describe('sortByRating', () => {
  const movies = [
    { id: 1, title: 'Low', vote_average: 5.0 },
    { id: 2, title: 'High', vote_average: 9.0 },
    { id: 3, title: 'Mid', vote_average: 7.0 },
  ];

  it('azalan sırada sıralar (varsayılan)', () => {
    const result = sortByRating(movies);
    expect(result[0].vote_average).toBe(9.0);
    expect(result[result.length - 1].vote_average).toBe(5.0);
  });

  it('artan sırada sıralama desteklenir', () => {
    const result = sortByRating(movies, 'asc');
    expect(result[0].vote_average).toBe(5.0);
  });

  it('orijinal diziyi mutate etmez', () => {
    sortByRating(movies);
    expect(movies[0].title).toBe('Low');
  });

  it('boş dizi → boş dizi döner', () => {
    expect(sortByRating([])).toHaveLength(0);
  });

  it('tek elemanlı dizi aynen döner', () => {
    const single = [{ id: 1, title: 'Solo', vote_average: 7.0 }];
    expect(sortByRating(single)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. truncateText — Uzun metni kısalt
// ─────────────────────────────────────────────────────────────────────────────
describe('truncateText', () => {
  it('kısa metin aynen döner', () => {
    expect(truncateText('Kısa metin', 100)).toBe('Kısa metin');
  });

  it('uzun metin kesilir', () => {
    const long = 'A'.repeat(200);
    const result = truncateText(long, 100);
    expect(result.length).toBeLessThanOrEqual(103); // +3 for "..."
  });

  it('... ile biter', () => {
    const long = 'A'.repeat(200);
    const result = truncateText(long, 50);
    expect(result).toContain('...');
  });

  it('boş string → boş string döner', () => {
    expect(truncateText('', 50)).toBe('');
  });

  it('limit 0 → ... döner', () => {
    const result = truncateText('Hello', 0);
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. isInList — Öğe listede var mı?
// ─────────────────────────────────────────────────────────────────────────────
describe('isInList', () => {
  const list = [
    { id: 1, title: 'Movie A' },
    { id: 2, title: 'Movie B' },
    { id: 3, title: 'Movie C' },
  ];

  it('listede olan öğe için true döner', () => {
    expect(isInList(list, 1)).toBe(true);
  });

  it('listede olmayan öğe için false döner', () => {
    expect(isInList(list, 99)).toBe(false);
  });

  it('boş liste için false döner', () => {
    expect(isInList([], 1)).toBe(false);
  });

  it('son elemanı bulur', () => {
    expect(isInList(list, 3)).toBe(true);
  });

  it('boolean döner', () => {
    expect(typeof isInList(list, 1)).toBe('boolean');
  });
});