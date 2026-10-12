// app/(drawer)/(tabs)/index.tsx
// Netflix-style dark redesign
// Animated API: timing · parallel · spring · loop/sequence (core RN — JS thread)
// Teknikler: hero auto-transition, genre carousels, press scale, shake modal

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image,
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { C, CARD, Radius, Spacing } from '../../../constants/theme';
import { SkeletonPoster } from '../../../components/SkeletonCard';
import { useI18n } from '../../../hooks/useI18n';
import { API_KEY } from '../../../services/tmdb';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Movie {
  id: string; title: string; img: string; backdrop: string;
  imdb: string; year: string; type: string; trailer: string; overview: string;
  genreIds: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const IMAGE_BASE    = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const STORAGE_V9 = 'movies_data_v9';   // ← tüm cache temizlenir, fresh fetch
const STORAGE_V7 = 'movies_data_v7';   // eski cache — migration için
const HERO_COUNT    = 5;

const BLOCKED_IDS = new Set([
  27205, 550, 680, 497, 562, 18491, 11216,
  423108, 631842, 361743, 726209, 76341,
  10625, 9268, 11370, 10610, 14658,
]);

const GENRE_MAP: Record<number, string> = {
  28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi',
  80: 'Suç', 18: 'Dram', 14: 'Fantastik', 27: 'Korku',
  10749: 'Romantik', 878: 'Bilim Kurgu', 53: 'Gerilim',
};

// Yatay carousel satır tanımları — sırayla görünür
const ROWS = [
  {
    id: 'trending',   emoji: '🔥', label: 'Bugün Sizin İçin',
    url: () => `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}&language=tr-TR`,
    relaxed: true,
  },
  {
    id: 'nowplaying', emoji: '🎬', label: 'Şu An Vizyonda',
    url: () => `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=tr-TR&region=TR`,
    relaxed: true,
  },
  {
    id: 'upcoming',   emoji: '📅', label: 'Yakında Geliyor',
    url: () => `https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}&language=tr-TR&region=TR`,
    relaxed: true,
  },
  {
    id: 'korean',     emoji: '🇰🇷', label: 'Kore Sineması',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`,
    relaxed: true,
  },
  {
    id: 'anime',      emoji: '🎌', label: 'Anime',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=200&include_adult=false`,
    relaxed: true,
  },
  {
    id: 'action',     emoji: '💥', label: 'Aksiyon & Macera',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=28,12&sort_by=vote_average.desc&vote_count.gte=2000&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'drama',      emoji: '🎭', label: 'Dram',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=18&sort_by=vote_average.desc&vote_count.gte=2000&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'scifi',      emoji: '🌌', label: 'Bilim Kurgu',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=878&sort_by=vote_average.desc&vote_count.gte=2000&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'comedy',     emoji: '😂', label: 'Komedi',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=35&sort_by=vote_average.desc&vote_count.gte=2000&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'crime',      emoji: '🔫', label: 'Suç & Gerilim',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=80,53&sort_by=vote_average.desc&vote_count.gte=2000&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'animation',  emoji: '✨', label: 'Animasyon',
    url: () => `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&with_genres=16&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`,
    relaxed: false,
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSafe(item: any): boolean {
  if (item.adult || !item.poster_path) return false;
  if (item.vote_average < 7.0 || item.vote_count < 1000) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  if (item.genre_ids?.includes(10749) && item.genre_ids?.length === 1) return false;
  return true;
}
function isSafeRelaxed(item: any): boolean {
  if (item.adult || !item.poster_path) return false;
  if (item.vote_average < 6.0) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  return true;
} 
function tmdbToMovie(item: any): Movie {
  return {
    id:       String(item.id),
    title:    item.title ?? 'Bilinmiyor',
    img:      `${IMAGE_BASE}${item.poster_path}`,
    backdrop: item.backdrop_path
      ? `${BACKDROP_BASE}${item.backdrop_path}`
      : `${IMAGE_BASE}${item.poster_path}`,
    imdb:     item.vote_average?.toFixed(1) ?? '0.0',
    year:     (item.release_date ?? '').slice(0, 4),
    type:     item.genre_ids?.[0] ? (GENRE_MAP[item.genre_ids[0]] ?? 'Film') : 'Film',
    trailer:  '',
    overview: item.overview ?? '',
    genreIds: item.genre_ids ?? [],
  };
}

const extractYoutubeId = (s: string) => {
  const m = s.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : s;
};

// ─── NetflixCard ──────────────────────────────────────────────────────────────
// Animated.spring (press scale) — her kart kendi Animated.Value tutar
function NetflixCard({ item, onPress }: { item: Movie; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.91, useNativeDriver: true, friction: 7, tension: 180 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 7, tension: 180 }).start()}
      style={styles.netflixCardWrap}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={{ uri: item.img }} style={styles.netflixPoster} />
        <LinearGradient colors={C.gradientCard} style={styles.cardGradient}>
          <Text style={styles.cardLabel} numberOfLines={2}>{item.title}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────
function CategoryRow({ emoji, label, data, onPress }: {
  emoji: string; label: string; data: Movie[];
  onPress: (item: Movie) => void;
}) {
  if (data.length === 0) return null;
  return (
    <View style={styles.categoryRow}>
      <Text style={styles.categoryLabel}>
        <Text style={styles.categoryEmoji}>{emoji} </Text>{label}
      </Text>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.rowContent}
        renderItem={({ item }) => <NetflixCard item={item} onPress={() => onPress(item)} />}
      />
    </View>
  );
}

// ─── SearchGrid ───────────────────────────────────────────────────────────────
function SearchCard({ item, onPress }: { item: Movie; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[styles.searchCard, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, friction: 7 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start()}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <Image source={{ uri: item.img }} style={styles.searchPoster} />
        <View style={styles.searchImdbBadge}>
          <Text style={styles.searchImdbText}>⭐ {item.imdb}</Text>
        </View>
        <Text style={styles.searchCardTitle} numberOfLines={2}>{item.title}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MoviesScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function MoviesScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const { t }      = useI18n();

  // Drawer başlığı
  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ title: t('tabs.films') });
  }, [t]));

  // ── State ──────────────────────────────────────────────────────────────────
  const [movies, setMovies]               = useState<Movie[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching]         = useState(false);
  const [continueList, setContinueList]   = useState<Movie[]>([]);
  const [genreMovies, setGenreMovies]     = useState<Record<string, Movie[]>>({});
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
const [recommendedBase, setRecommendedBase]     = useState('');

  

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem]   = useState<Movie | null>(null);
  const [form, setForm]                 = useState<Omit<Movie, 'id'>>({
    title: '', img: '', backdrop: '', trailer: '', imdb: '', type: '', year: '', overview: '',   genreIds: [],

  });
  // Shake
  const [shakeModal, setShakeModal]       = useState(false);
  const [suggestedFilm, setSuggestedFilm] = useState<Movie | null>(null);
  const lastShakeTime                     = useRef(0);

  // ── Animated values ────────────────────────────────────────────────────────
  const scaleAnim  = useRef(new Animated.Value(0)).current;  // shake modal
  const shakeHint  = useRef(new Animated.Value(1)).current;  // pulse loop
  const heroOpacity   = useRef(new Animated.Value(1)).current; // hero fade
  const heroTranslate = useRef(new Animated.Value(0)).current; // hero slide
  const heroIndexRef  = useRef(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const moviesRef = useRef<Movie[]>([]);
  useEffect(() => { moviesRef.current = movies; }, [movies]);

  // ── Shake hint pulse: Animated.loop + sequence ─────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeHint, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(shakeHint, { toValue: 1.0,  duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Accelerometer ──────────────────────────────────────────────────────────
  useEffect(() => {
    Accelerometer.setUpdateInterval(200);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > 1.8 && now - lastShakeTime.current > 1500) {
        lastShakeTime.current = now;
        handleShake();
      }
    });
    return () => sub.remove();
  }, [movies]);

  // ── Hero geçiş: Animated.parallel (fade + slide) ──────────────────────────
  const transitionTo = useCallback((next: number) => {
    Animated.parallel([
      Animated.timing(heroOpacity,   { toValue: 0,   duration: 280, useNativeDriver: true }),
      Animated.timing(heroTranslate, { toValue: -30, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      heroIndexRef.current = next;
      setHeroIndex(next);
      heroTranslate.setValue(30);
      Animated.parallel([
        Animated.timing(heroOpacity,   { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(heroTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [heroOpacity, heroTranslate]);

  // ── 5 sn otomatik geçiş ───────────────────────────────────────────────────
  useEffect(() => {
    if (movies.length < 2) return;
    const id = setInterval(() => {
      const next = (heroIndexRef.current + 1) % Math.min(HERO_COUNT, movies.length);
      transitionTo(next);
    }, 5000);
    return () => clearInterval(id);
  }, [movies.length, transitionTo]);

  // ── "Devam Et" — watchlist'ten izlenmeyenler ──────────────────────────────
  useFocusEffect(useCallback(() => {
  // ── Devam Et listesi (watchlist'ten izlenmeyenler)
  AsyncStorage.getItem('watchlist_data').then(raw => {
    if (!raw) return;
    const items = JSON.parse(raw) as any[];
    const mapped: Movie[] = items
      .filter(i => !i.watched)
      .slice(0, 12)
      .map(i => ({
        id: i.id, title: i.title, img: i.img,
        backdrop: i.img, imdb: String(i.userRating || '?'),
        year: i.year, type: i.type, trailer: i.trailer ?? '',
        overview: '', genreIds: [],
      }));
    setContinueList(mapped);
  });

  // ── Favori bazlı öneri (en yüksek puanlı favori → TMDB recommendations)
  AsyncStorage.getItem('favorites_data').then(async raw => {
    if (!raw) return;
    const favs = JSON.parse(raw) as any[];
    if (favs.length === 0) return;
    const top = [...favs].sort((a, b) => (b.userRating || 0) - (a.userRating || 0))[0];
    setRecommendedBase(top.title);
    try {
      const res  = await fetch(
        `https://api.themoviedb.org/3/movie/${top.id}/recommendations?api_key=${API_KEY}&language=tr-TR`
      );
      const data = await res.json();
      setRecommendedMovies(
        (data.results ?? []).filter(isSafeRelaxed).map(tmdbToMovie).slice(0, 20)
      );
    } catch { setRecommendedMovies([]); }
  });
}, []));

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => { loadMovies(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') { setSearchResults([]); return; }
    const timer = setTimeout(() => searchMovies(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

 const loadMovies = async () => {
  setLoading(true);
  try {
    // Eski cache'leri temizle — tek seferlik migration
    await AsyncStorage.multiRemove([STORAGE_V7, 'movies_data_v8']);

    const cached = await AsyncStorage.getItem(STORAGE_V9);
    const parsed = cached ? JSON.parse(cached) : null;
    if (parsed?.length > 0) {
      setMovies(parsed);
      fetchGenreRows();   // ← cache'den gelse de genre'ları fetch et
      return;
    }
    await fetchPage(1, true);
  } catch (e) { console.error(e); }
  finally {
    setLoading(false);
    fetchGenreRows();
  }
};

  const fetchPage = async (pageNum: number, reset = false) => {
    if (pageNum > 1) setLoadingMore(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&language=tr-TR&region=US&page=${pageNum}`),
        fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&sort_by=vote_average.desc&vote_count.gte=5000&without_genres=10749&include_adult=false&page=${pageNum}`),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      const seen = new Set<number>();
      const all  = [...(d1.results ?? []), ...(d2.results ?? [])].filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      const newItems = all.filter(isSafe).map(tmdbToMovie);
      const current  = moviesRef.current;
      const updated  = reset ? newItems : [...current, ...newItems];
      setMovies(updated);
      setPage(pageNum);
      setHasMore(pageNum < 3);
      await AsyncStorage.setItem(STORAGE_V9, JSON.stringify(updated));
    } catch {
      Alert.alert(t('common.error'), t('media.loadError'));
    } finally { setLoadingMore(false); }
  };
   
const fetchGenreRows = async () => {
  const results: Record<string, Movie[]> = {};
  await Promise.all(
    ROWS.map(async (row) => {
      try {
        const res  = await fetch(row.url());
        const data = await res.json();
        const filter = row.relaxed ? isSafeRelaxed : isSafe;
        results[row.id] = (data.results ?? [])
          .filter(filter).map(tmdbToMovie).slice(0, 20);
      } catch { results[row.id] = []; }
    })
  );
  setGenreMovies(results);
};
  const searchMovies = async (query: string) => {
    setSearching(true);
    try {
      const res  = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=tr-TR&query=${encodeURIComponent(query)}&page=1&include_adult=false`
      );
      const data = await res.json();
      setSearchResults((data.results ?? []).filter(isSafe).map(tmdbToMovie).slice(0, 40));
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleShake = () => {
    if (movies.length === 0) return;
    setSuggestedFilm(movies[Math.floor(Math.random() * movies.length)]);
    setShakeModal(true);
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };

  const handleSave = async () => {
    if (!form.title) return Alert.alert(t('common.warning'), t('media.titleRequired'));
    const cleaned = { ...form, trailer: extractYoutubeId(form.trailer) };
    const updated = editingItem
      ? movies.map(m => m.id === editingItem.id ? { ...cleaned, id: m.id } : m)
      : [{ ...cleaned, id: Date.now().toString() }, ...movies];
    setMovies(updated);
    await AsyncStorage.setItem(STORAGE_V9, JSON.stringify(updated));
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false); setEditingItem(null);
    setForm({ title: '', img: '', backdrop: '', trailer: '', imdb: '', type: '', year: '', overview: '' ,genreIds: heroMovie.genreIds,});
  };

  const navigateTo = (item: Movie) =>
    router.push({
      pathname: '/details/[id]',
      params: { id: item.id, title: item.title, trailer: item.trailer, year: item.year, type: item.type, img: item.img, backdrop: item.backdrop, overview: item.overview, mediaType: 'movie' },
    });

  const isSearchMode = searchQuery.trim().length > 0;
  const heroMovie    = movies[heroIndex];

  // ── Hero Banner ────────────────────────────────────────────────────────────
  const HeroBanner = movies.length > 0 ? (
    <View style={styles.heroBanner}>
      <Animated.View style={{ opacity: heroOpacity, transform: [{ translateX: heroTranslate }] }}>
        <Pressable onPress={() => heroMovie && navigateTo(heroMovie)} accessibilityRole="button">
          <Image source={{ uri: heroMovie?.backdrop }} style={styles.heroImage} />
          <LinearGradient colors={C.gradientHero} style={styles.heroGradient}>
            {/* Meta badges */}
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>⭐ {heroMovie?.imdb}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{heroMovie?.type}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{heroMovie?.year}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{heroMovie?.title}</Text>
            {heroMovie?.overview ? (
              <Text style={styles.heroOverview} numberOfLines={2}>{heroMovie.overview}</Text>
            ) : null}

            {/* CTA butonları */}
            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={styles.heroPlayBtn}
                onPress={() => heroMovie && navigateTo(heroMovie)}
              >
                <Ionicons name="play" size={16} color="black" />
                <Text style={styles.heroPlayText}>{t('media.seeDetails')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroInfoBtn}
                onPress={() => {
                  if (!heroMovie) return;
                  setEditingItem(heroMovie);
                  setForm({ title: heroMovie.title, img: heroMovie.img, backdrop: heroMovie.backdrop, trailer: heroMovie.trailer, imdb: heroMovie.imdb, type: heroMovie.type, year: heroMovie.year, overview: heroMovie.overview, genreIds: heroMovie.genreIds 
 });
                  setModalVisible(true);
                }}
              >
                <Ionicons name="information-circle-outline" size={16} color="white" />
                <Text style={styles.heroInfoText}>{t('media.edit')}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Nokta indikatörleri */}
      <View style={styles.heroDots}>
        {Array.from({ length: Math.min(HERO_COUNT, movies.length) }, (_, i) => (
          <Pressable key={i} onPress={() => transitionTo(i)}
            style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
        ))}
      </View>
    </View>
  ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header: Arama + Shake ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('media.searchPlaceholder')}
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel={t('a11y.searchInput')}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </Pressable>
          )}
          {searching && <ActivityIndicator size="small" color={C.accent} />}
        </View>

        <Animated.View style={{ transform: [{ scale: shakeHint }] }}>
          <TouchableOpacity style={styles.shakeBtn} onPress={handleShake}
            accessibilityLabel={t('media.randomSuggestion')} accessibilityRole="button">
            <Text style={{ fontSize: 20 }}>🎲</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── İçerik ────────────────────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton grid */
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => i)}
          numColumns={2}
          keyExtractor={(i) => `sk-${i}`}
          renderItem={() => <SkeletonPoster />}
          scrollEnabled={false}
          contentContainerStyle={{ paddingTop: 8 }}
        />
      ) : isSearchMode ? (
        /* Arama sonuçları — grid */
        <>
          <Text style={styles.resultCount}>
            {searchResults.length} {t('media.resultsFound')} — "{searchQuery}"
          </Text>
          <FlatList
            data={searchResults}
            numColumns={2}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.searchGrid}
            renderItem={({ item }) => (
              <SearchCard item={item} onPress={() => navigateTo(item)} />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t('media.noSearchResults')}</Text>
            }
          />
        </>
      ) : (
        /* Netflix layout — ScrollView + carousel rows */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Hero banner */}
          {HeroBanner}

          {/* Shake ipucu */}
          <Text style={styles.shakeHint}>{t('media.shakeHint')}</Text>

          {/* ▶ Devam Et — watchlist'ten izlenmeyenler */}
          {continueList.length > 0 && (
            <CategoryRow
              emoji="▶" label={t('watchlist.pending')}
              data={continueList}
              onPress={navigateTo}
            />
          )}
          {/* 💡 Favori bazlı öneri */}
{recommendedMovies.length > 0 && (
  <CategoryRow
    emoji="💡"
    label={`"${recommendedBase}" Sevdiyseniz`}
    data={recommendedMovies}
    onPress={navigateTo}
  />
)}

          {/* 🔥 Tüm filmler / Popüler */}
          <CategoryRow
            emoji="🔥" label="Popüler Bu Hafta"
            data={movies.slice(0, 20)}
            onPress={navigateTo}
          />

          {/* Genre carousel'leri */}
          {ROWS.map(row => (
            <CategoryRow
              key={row.id}
              emoji={row.emoji}
              label={row.label}
              data={genreMovies[row.id] ?? []}
              onPress={navigateTo}
            />
          ))}

          {/* Daha fazla yükle */}
          {hasMore && (
            <TouchableOpacity style={styles.loadMoreBtn}
              onPress={() => fetchPage(page + 1)} disabled={loadingMore}>
              {loadingMore
                ? <ActivityIndicator color={C.accent} />
                : <Text style={styles.loadMoreText}>+ {t('common.loadingMore')}</Text>
              }
            </TouchableOpacity>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}
        accessibilityLabel={t('media.add')} accessibilityRole="button">
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* ── Shake Modal ────────────────────────────────────────────────────── */}
      <Modal visible={shakeModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShakeModal(false)}>
          <Animated.View style={[styles.shakeSheet, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable>
              <Text style={styles.shakeTitle}>{t('media.randomSuggestion')}</Text>
              <Text style={styles.shakeSub}>{t('media.shakeSubtitle')}</Text>
              {suggestedFilm && (
                <>
                  <Image source={{ uri: suggestedFilm.img }} style={styles.shakePoster} />
                  <Text style={styles.shakeFilmTitle}>{suggestedFilm.title}</Text>
                  <View style={styles.shakeMetaRow}>
                    {[`⭐ ${suggestedFilm.imdb}`, `🎬 ${suggestedFilm.type}`, `📅 ${suggestedFilm.year}`].map(label => (
                      <View key={label} style={styles.shakeMeta}>
                        <Text style={styles.shakeMetaText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.shakeBtnRow}>
                    <TouchableOpacity style={styles.shakePlayBtn} onPress={() => { setShakeModal(false); navigateTo(suggestedFilm); }}>
                      <Ionicons name="play-circle-outline" size={16} color="black" />
                      <Text style={styles.shakePlayText}>{t('media.seeDetails')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shakeAgainBtn} onPress={() => {
                      const r = movies[Math.floor(Math.random() * movies.length)];
                      setSuggestedFilm(r);
                      scaleAnim.setValue(0.8);
                      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
                    }}>
                      <Ionicons name="refresh-outline" size={16} color={C.accent} />
                      <Text style={styles.shakeAgainText}>{t('media.suggestAgain')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── Film Ekle/Düzenle Modal ─────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editSheet}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.editHeader}>
                {editingItem ? t('media.edit') : t('media.add')}
              </Text>
              {[
                { ph: t('media.movieName'),  key: 'title'   },
                { ph: t('media.imageUrl'),   key: 'img'     },
                { ph: t('media.youtubeLink'), key: 'trailer' },
                { ph: t('media.genre'),      key: 'type'    },
              ].map(({ ph, key }) => (
                <TextInput key={key} style={styles.editInput} placeholder={ph}
                  placeholderTextColor={C.textMuted}
                  value={(form as any)[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))} />
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="IMDb"
                  placeholderTextColor={C.textMuted} value={form.imdb} keyboardType="numeric"
                  onChangeText={v => setForm(f => ({ ...f, imdb: v }))} />
                <TextInput style={[styles.editInput, { flex: 1 }]} placeholder={t('media.year')}
                  placeholderTextColor={C.textMuted} value={form.year} keyboardType="numeric"
                  onChangeText={v => setForm(f => ({ ...f, year: v }))} />
              </View>
              <View style={styles.editBtnRow}>
                <Pressable style={styles.editCancelBtn} onPress={closeModal}>
                  <Text style={{ color: C.textSub, fontWeight: 'bold' }}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.editSaveBtn} onPress={handleSave}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common.save')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 20 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  searchBar:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, padding: 0 },
  shakeBtn:   { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  shakeHint:  { fontSize: 11, color: C.textMuted, textAlign: 'center', marginBottom: 4 },

  // Hero
  heroBanner:     { marginBottom: 4 },
  heroImage:      { width: '100%', height: 320, resizeMode: 'cover', backgroundColor: C.surface },
  heroGradient:   { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 80 },
  heroBadgeRow:   { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  heroBadge:      { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroBadgeText:  { color: C.text, fontSize: 11, fontWeight: '600' },
  heroTitle:      { color: C.text, fontSize: 22, fontWeight: 'bold', marginBottom: 6, lineHeight: 28 },
  heroOverview:   { color: C.textSub, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  heroBtnRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  heroPlayBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.text, paddingVertical: 11, borderRadius: Radius.sm },
  heroPlayText:   { color: 'black', fontWeight: 'bold', fontSize: 14 },
  heroInfoBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(109,109,110,0.7)', paddingVertical: 11, borderRadius: Radius.sm },
  heroInfoText:   { color: C.text, fontWeight: 'bold', fontSize: 14 },
  heroDots:       { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  heroDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh },
  heroDotActive:  { width: 20, backgroundColor: C.accent },

  // Category row
  categoryRow:   { marginBottom: 20 },
  categoryLabel: { color: C.text, fontSize: 15, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 10 },
  categoryEmoji: { fontSize: 14 },
  rowContent:    { paddingHorizontal: 16, gap: 10 },

  // Netflix card
  netflixCardWrap: { marginRight: 0 },
  netflixPoster:   { width: CARD.w, height: CARD.h, borderRadius: Radius.sm, backgroundColor: C.surface, resizeMode: 'cover' },
  cardGradient:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD.h * 0.45, borderBottomLeftRadius: Radius.sm, borderBottomRightRadius: Radius.sm, justifyContent: 'flex-end', padding: 6 },
  cardLabel:       { color: C.text, fontSize: 10, fontWeight: '600', lineHeight: 13 },

  // Load more
  loadMoreBtn:  { alignSelf: 'center', marginVertical: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  loadMoreText: { color: C.textSub, fontSize: 13 },

  // Search grid
  resultCount: { fontSize: 12, color: C.textMuted, paddingHorizontal: 16, marginBottom: 6 },
  searchGrid:  { paddingHorizontal: 10, paddingBottom: 80 },
  searchCard:  { flex: 1, margin: 6, backgroundColor: C.surface, borderRadius: Radius.md, overflow: 'hidden' },
  searchPoster: { width: '100%', height: 200, resizeMode: 'cover', backgroundColor: C.surfaceHigh },
  searchImdbBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  searchImdbText:  { color: C.text, fontWeight: 'bold', fontSize: 11 },
  searchCardTitle: { padding: 8, color: C.text, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  emptyText:       { color: C.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14 },

  // FAB
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: C.accent, width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8 },

  // Modal overlay
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Shake modal
  shakeSheet:     { backgroundColor: C.surface, borderRadius: Radius.xl, padding: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  shakeTitle:     { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 4 },
  shakeSub:       { fontSize: 12, color: C.textMuted, marginBottom: 16 },
  shakePoster:    { width: 130, height: 190, borderRadius: Radius.md, resizeMode: 'cover', marginBottom: 14, backgroundColor: C.surfaceHigh },
  shakeFilmTitle: { fontSize: 17, fontWeight: 'bold', color: C.text, textAlign: 'center', marginBottom: 10 },
  shakeMetaRow:   { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' },
  shakeMeta:      { backgroundColor: C.surfaceHigh, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  shakeMetaText:  { fontSize: 12, color: C.textSub },
  shakeBtnRow:    { flexDirection: 'row', gap: 10, width: '100%' },
  shakePlayBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.text, paddingVertical: 12, borderRadius: Radius.sm },
  shakePlayText:  { color: 'black', fontWeight: 'bold', fontSize: 13 },
  shakeAgainBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.surfaceHigh, paddingVertical: 12, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
  shakeAgainText: { color: C.accent, fontWeight: 'bold', fontSize: 13 },

  // Edit modal
  editSheet:     { backgroundColor: C.surface, borderRadius: Radius.xl, padding: 24, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: C.border },
  editHeader:    { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 18, textAlign: 'center' },
  editInput:     { backgroundColor: C.surfaceHigh, padding: 12, borderRadius: Radius.md, marginBottom: 10, borderWidth: 1, borderColor: C.border, color: C.text, width: '100%' },
  editBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 6 },
  editCancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  editSaveBtn:   { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', backgroundColor: C.accent },
});