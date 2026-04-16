// services/tmdb.ts
// Film → /movie/ | Dizi → /tv/

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export type MediaType = 'movie' | 'tv';

export const TMDB_IMAGE = (path: string) =>
  path ? `${IMAGE_BASE}${path}` : 'https://via.placeholder.com/500x750?text=Poster+Yok';

// ── Film ──────────────────────────────────────────────────────
async function getMovieDetail(id: number) {
  const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=tr-TR`);
  return res.json();
}
async function getMovieCredits(id: number) {
  const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}&language=tr-TR`);
  const d = await res.json();
  return d.cast?.slice(0, 10) ?? [];
}
async function getSimilarMovies(id: number) {
  const res = await fetch(`${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}&language=tr-TR`);
  const d = await res.json();
  return d.results?.slice(0, 8) ?? [];
}
async function getMovieVideos(id: number): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}&language=tr-TR`);
  const d = await res.json();
  let t = d.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
  if (!t) {
    const r2 = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}&language=en-US`);
    const d2 = await r2.json();
    t = d2.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ?? d2.results?.[0];
  }
  return t?.key ?? null;
}

// ── Dizi (TV) ─────────────────────────────────────────────────
async function getTVDetail(id: number) {
  const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=tr-TR`);
  return res.json();
}
async function getTVCredits(id: number) {
  const res = await fetch(`${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}&language=tr-TR`);
  const d = await res.json();
  return d.cast?.slice(0, 10) ?? [];
}
async function getSimilarTV(id: number) {
  const res = await fetch(`${BASE_URL}/tv/${id}/similar?api_key=${API_KEY}&language=tr-TR`);
  const d = await res.json();
  return d.results?.slice(0, 8) ?? [];
}
async function getTVVideos(id: number): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}&language=tr-TR`);
  const d = await res.json();
  let t = d.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
  if (!t) {
    const r2 = await fetch(`${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}&language=en-US`);
    const d2 = await r2.json();
    t = d2.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ?? d2.results?.[0];
  }
  return t?.key ?? null;
}

// ── Ortak API — mediaType'a göre otomatik seçim ───────────────
export async function getDetail(id: number, mediaType: MediaType) {
  return mediaType === 'tv' ? getTVDetail(id) : getMovieDetail(id);
}
export async function getCredits(id: number, mediaType: MediaType) {
  return mediaType === 'tv' ? getTVCredits(id) : getMovieCredits(id);
}
export async function getSimilar(id: number, mediaType: MediaType) {
  return mediaType === 'tv' ? getSimilarTV(id) : getSimilarMovies(id);
}
export async function getVideos(id: number, mediaType: MediaType): Promise<string | null> {
  return mediaType === 'tv' ? getTVVideos(id) : getMovieVideos(id);
}

// ── TMDB nesnesini uygulama formatına çevir ───────────────────
const GENRE_MAP: Record<number, string> = {
  28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi',
  80: 'Suç', 99: 'Belgesel', 18: 'Dram', 10751: 'Aile',
  14: 'Fantastik', 36: 'Tarih', 27: 'Korku', 9648: 'Gizem',
  10749: 'Romantik', 878: 'Bilim Kurgu', 53: 'Gerilim',
  10759: 'Aksiyon', 10765: 'Bilim Kurgu', 10762: 'Çocuk',
};

export function tmdbToItem(m: any, mediaType: MediaType) {
  const isTV = mediaType === 'tv';
  return {
    id: String(m.id),
    title: (isTV ? m.name : m.title) ?? 'Bilinmiyor',
    img: TMDB_IMAGE(m.poster_path),
    imdb: m.vote_average?.toFixed(1) ?? '0.0',
    year: ((isTV ? m.first_air_date : m.release_date) ?? '').slice(0, 4),
    type: m.genre_ids?.[0] ? (GENRE_MAP[m.genre_ids[0]] ?? (isTV ? 'Dizi' : 'Film')) : (isTV ? 'Dizi' : 'Film'),
    trailer: '',
    mediaType,
  };
}

export const tmdbToMovie = (m: any) => tmdbToItem(m, 'movie');