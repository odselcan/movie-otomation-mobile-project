/**
 * __tests__/tmdb.test.ts
 * services/tmdb.ts — gercek export'lara gore yazildi
 * Export'lar: getDetail, getCredits, getSimilar, getVideos, TMDB_IMAGE, tmdbToItem, tmdbToMovie
 */

import {
  TMDB_IMAGE,
  tmdbToItem,
  tmdbToMovie,
  getDetail,
  getCredits,
  getSimilar,
  getVideos,
} from '../services/tmdb';

global.fetch = jest.fn();
process.env.EXPO_PUBLIC_TMDB_API_KEY = 'test_key';

const ok = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

// ─── TMDB_IMAGE ───────────────────────────────────────────────────────────────
describe('TMDB_IMAGE', () => {
  it('poster path ile tam URL olusturur', () => {
    const url = TMDB_IMAGE('/abc.jpg');
    expect(url).toContain('image.tmdb.org');
    expect(url).toContain('abc.jpg');
  });

  it('https ile baslar', () => {
    expect(TMDB_IMAGE('/test.jpg')).toMatch(/^https/);
  });

  it('w500 boyutunu icerir', () => {
    expect(TMDB_IMAGE('/test.jpg')).toContain('w500');
  });

  it('bos path icin placeholder URL doner', () => {
    const url = TMDB_IMAGE('');
    expect(url).toContain('placeholder');
  });
});

// ─── tmdbToItem ───────────────────────────────────────────────────────────────
describe('tmdbToItem', () => {
  const mockMovie = {
    id: 550,
    title: 'Fight Club',
    poster_path: '/pB8BM7.jpg',
    vote_average: 8.4,
    release_date: '1999-10-15',
    genre_ids: [18],
  };

  const mockTV = {
    id: 1396,
    name: 'Breaking Bad',
    poster_path: '/ggFHV.jpg',
    vote_average: 9.5,
    first_air_date: '2008-01-20',
    genre_ids: [18],
  };

  it('film icin title alani doner', () => {
    const item = tmdbToItem(mockMovie, 'movie');
    expect(item.title).toBe('Fight Club');
  });

  it('dizi icin name alanindan title alir', () => {
    const item = tmdbToItem(mockTV, 'tv');
    expect(item.title).toBe('Breaking Bad');
  });

  it('id string olarak doner', () => {
    const item = tmdbToItem(mockMovie, 'movie');
    expect(typeof item.id).toBe('string');
    expect(item.id).toBe('550');
  });

  it('film icin release_date yilini alir', () => {
    const item = tmdbToItem(mockMovie, 'movie');
    expect(item.year).toBe('1999');
  });

  it('dizi icin first_air_date yilini alir', () => {
    const item = tmdbToItem(mockTV, 'tv');
    expect(item.year).toBe('2008');
  });

  it('imdb alani vote_average iceriyor', () => {
    const item = tmdbToItem(mockMovie, 'movie');
    expect(item.imdb).toBe('8.4');
  });

  it('img alani TMDB URL icerir', () => {
    const item = tmdbToItem(mockMovie, 'movie');
    expect(item.img).toContain('image.tmdb.org');
  });

  it('mediaType alani dogru set edilir', () => {
    const movie = tmdbToItem(mockMovie, 'movie');
    const tv = tmdbToItem(mockTV, 'tv');
    expect(movie.mediaType).toBe('movie');
    expect(tv.mediaType).toBe('tv');
  });
});

// ─── tmdbToMovie ──────────────────────────────────────────────────────────────
describe('tmdbToMovie', () => {
  const mockMovie = {
    id: 278,
    title: 'The Shawshank Redemption',
    poster_path: '/q6y0Go.jpg',
    vote_average: 8.7,
    release_date: '1994-09-23',
    genre_ids: [18],
  };

  it('mediaType movie olarak set edilir', () => {
    const item = tmdbToMovie(mockMovie);
    expect(item.mediaType).toBe('movie');
  });

  it('title dogru alinir', () => {
    const item = tmdbToMovie(mockMovie);
    expect(item.title).toBe('The Shawshank Redemption');
  });

  it('id string olarak doner', () => {
    const item = tmdbToMovie(mockMovie);
    expect(typeof item.id).toBe('string');
  });
});

// ─── getDetail ────────────────────────────────────────────────────────────────
describe('getDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('film detayini getirir (movie)', async () => {
    const detail = { id: 550, title: 'Fight Club', runtime: 139 };
    (fetch as jest.Mock).mockResolvedValueOnce(ok(detail));
    const data = await getDetail(550, 'movie');
    expect(data).toBeDefined();
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/movie/550');
  });

  it('dizi detayini getirir (tv)', async () => {
    const detail = { id: 1396, name: 'Breaking Bad' };
    (fetch as jest.Mock).mockResolvedValueOnce(ok(detail));
    const data = await getDetail(1396, 'tv');
    expect(data).toBeDefined();
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/tv/1396');
  });
});

// ─── getCredits ───────────────────────────────────────────────────────────────
describe('getCredits', () => {
  beforeEach(() => jest.clearAllMocks());

  it('film oyuncu listesini getirir', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ cast: [{ id: 1, name: 'Brad Pitt' }] }));
    const data = await getCredits(550, 'movie');
    expect(Array.isArray(data)).toBe(true);
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/movie/550/credits');
  });

  it('dizi oyuncu listesini getirir', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ cast: [{ id: 1, name: 'Bryan Cranston' }] }));
    const data = await getCredits(1396, 'tv');
    expect(Array.isArray(data)).toBe(true);
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/tv/1396/credits');
  });

  it('cast bos gelirse bos dizi doner', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ cast: [] }));
    const data = await getCredits(1, 'movie');
    expect(data).toEqual([]);
  });
});

// ─── getSimilar ───────────────────────────────────────────────────────────────
describe('getSimilar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('benzer filmleri getirir', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ results: [{ id: 1 }, { id: 2 }] }));
    const data = await getSimilar(550, 'movie');
    expect(Array.isArray(data)).toBe(true);
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/movie/550/similar');
  });

  it('benzer dizileri getirir', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ results: [{ id: 10 }] }));
    const data = await getSimilar(1396, 'tv');
    expect(Array.isArray(data)).toBe(true);
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/tv/1396/similar');
  });
});

// ─── getVideos — fallback dal testleri ───────────────────────────────────────
describe('TMDB Service - Video Fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('film: TR trailer yoksa EN endpoint cagrilir', async () => {
    // 1. fetch: TR - trailer yok
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ results: [] }));
    // 2. fetch: EN - trailer var
    (fetch as jest.Mock).mockResolvedValueOnce(ok({
      results: [{ key: 'abc123', type: 'Trailer', site: 'YouTube' }]
    }));
    const { getVideos } = require('../services/tmdb');
    const key = await getVideos(550, 'movie');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(key).toBe('abc123');
  });

  it('dizi: TR trailer yoksa EN endpoint cagrilir', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ results: [] }));
    (fetch as jest.Mock).mockResolvedValueOnce(ok({
      results: [{ key: 'xyz789', type: 'Trailer', site: 'YouTube' }]
    }));
    const { getVideos } = require('../services/tmdb');
    const key = await getVideos(1396, 'tv');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(key).toBe('xyz789');
  });

  it('film: TR trailer varsa tek fetch yapilir', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({
      results: [{ key: 'tr123', type: 'Trailer', site: 'YouTube' }]
    }));
    const { getVideos } = require('../services/tmdb');
    const key = await getVideos(550, 'movie');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(key).toBe('tr123');
  });

  it('hic trailer yoksa null doner', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ results: [] }));
    (fetch as jest.Mock).mockResolvedValueOnce(ok({ results: [] }));
    const { getVideos } = require('../services/tmdb');
    const key = await getVideos(550, 'movie');
    expect(key).toBeNull();
  });
});