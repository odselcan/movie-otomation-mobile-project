// app/(drawer)/(tabs)/series.tsx
// Netflix-style dark redesign — index.tsx ile birebir aynı yapı, TV endpoint'leri

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image,
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { C, CARD, Radius } from '../../../constants/theme';
import { SkeletonPoster } from '../../../components/SkeletonCard';
import { useI18n } from '../../../hooks/useI18n';
import { API_KEY } from '../../../services/tmdb';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Series {
  id: string; title: string; img: string; backdrop: string;
  imdb: string; year: string; type: string; trailer: string;
  overview: string; genreIds: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const IMAGE_BASE    = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const STORAGE_KEY   = 'series_data_v9';
const HERO_COUNT    = 5;

const BLOCKED_IDS = new Set([
  1396, 1399, 94997, 76479, 60574, 93405, 100088,
  63174, 87108, 66732, 1412, 44217,
]);

const GENRE_MAP: Record<number, string> = {
  10759: 'Aksiyon', 16: 'Animasyon', 35: 'Komedi', 80: 'Suç',
  18: 'Dram', 10751: 'Aile', 10765: 'Bilim Kurgu',
  9648: 'Gizem', 10749: 'Romantik', 10762: 'Çocuk',
};

const ROWS = [
  {
    id: 'trending',   emoji: '🔥', label: 'Bugün Sizin İçin',
    url: () => `https://api.themoviedb.org/3/trending/tv/day?api_key=${API_KEY}&language=tr-TR`,
    relaxed: true,
  },
  {
    id: 'airing',     emoji: '📡', label: 'Şu An Yayında',
    url: () => `https://api.themoviedb.org/3/tv/on_the_air?api_key=${API_KEY}&language=tr-TR`,
    relaxed: true,
  },
  {
    id: 'korean',     emoji: '🇰🇷', label: 'Kore Dizileri',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=200&include_adult=false`,
    relaxed: true,
  },
  {
    id: 'anime',      emoji: '🎌', label: 'Anime',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100&include_adult=false`,
    relaxed: true,
  },
  {
    id: 'medical',    emoji: '🏥', label: 'Tıp & Doktor Temalı',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_keywords=10235|14822&sort_by=vote_average.desc&vote_count.gte=100&include_adult=false`,
    relaxed: true,
  },
  {
    id: 'crime',      emoji: '🔫', label: 'Suç & Gerilim',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_genres=80,9648&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'drama',      emoji: '🎭', label: 'Dram',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_genres=18&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'scifi',      emoji: '🌌', label: 'Bilim Kurgu & Fantastik',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_genres=10765&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'comedy',     emoji: '😂', label: 'Komedi',
    url: () => `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&with_genres=35&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`,
    relaxed: false,
  },
  {
    id: 'toprated',   emoji: '⭐', label: 'En Yüksek Puanlı',
    url: () => `https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}&language=tr-TR`,
    relaxed: false,
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSafe(item: any): boolean {
  if (item.adult || !item.poster_path) return false;
  if (item.vote_average < 7.0 || item.vote_count < 1000) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  return true;
}

function isSafeRelaxed(item: any): boolean {
  if (item.adult || !item.poster_path) return false;
  if (item.vote_average < 6.0) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  return true;
}

function tmdbTvToSeries(item: any): Series {
  return {
    id:       String(item.id),
    title:    item.name ?? 'Bilinmiyor',
    img:      `${IMAGE_BASE}${item.poster_path}`,
    backdrop: item.backdrop_path
      ? `${BACKDROP_BASE}${item.backdrop_path}`
      : `${IMAGE_BASE}${item.poster_path}`,
    imdb:     item.vote_average?.toFixed(1) ?? '0.0',
    year:     (item.first_air_date ?? '').slice(0, 4),
    type:     item.genre_ids?.[0] ? (GENRE_MAP[item.genre_ids[0]] ?? 'Dizi') : 'Dizi',
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
function NetflixCard({ item, onPress }: { item: Series; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.91, useNativeDriver: true, friction: 7, tension: 180 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 7, tension: 180 }).start()}
      style={{ marginRight: 0 }}
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
  emoji: string; label: string; data: Series[];
  onPress: (item: Series) => void;
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
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.rowContent}
        renderItem={({ item }) => <NetflixCard item={item} onPress={() => onPress(item)} />}
      />
    </View>
  );
}

// ─── SearchCard ───────────────────────────────────────────────────────────────
function SearchCard({ item, onPress }: { item: Series; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[styles.searchCard, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, friction: 7 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 7 }).start()}
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
// SeriesScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function SeriesScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const { t }      = useI18n();

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ title: t('tabs.series') });
  }, [t]));

  // ── State ──────────────────────────────────────────────────────────────────
  const [series, setSeries]               = useState<Series[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<Series[]>([]);
  const [searching, setSearching]         = useState(false);
  const [genreRows, setGenreRows]         = useState<Record<string, Series[]>>({});
  const [recommendedItems, setRecommendedItems] = useState<Series[]>([]);
  const [recommendedBase, setRecommendedBase]   = useState('');

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem]   = useState<Series | null>(null);
  const [form, setForm]                 = useState<Omit<Series, 'id'>>({
    title: '', img: '', backdrop: '', trailer: '',
    imdb: '', type: '', year: '', overview: '', genreIds: [],
  });

  // ── Animated values ────────────────────────────────────────────────────────
  const heroOpacity   = useRef(new Animated.Value(1)).current;
  const heroTranslate = useRef(new Animated.Value(0)).current;
  const heroIndexRef  = useRef(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const seriesRef = useRef<Series[]>([]);
  useEffect(() => { seriesRef.current = series; }, [series]);

  // ── Hero geçiş ─────────────────────────────────────────────────────────────
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

  // ── 5sn otomatik geçiş ────────────────────────────────────────────────────
  useEffect(() => {
    if (series.length < 2) return;
    const id = setInterval(() => {
      const next = (heroIndexRef.current + 1) % Math.min(HERO_COUNT, series.length);
      transitionTo(next);
    }, 5000);
    return () => clearInterval(id);
  }, [series.length, transitionTo]);

  // ── Favori bazlı öneri ────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('favorites_data').then(async raw => {
      if (!raw) return;
      const favs = JSON.parse(raw) as any[];
      if (favs.length === 0) return;
      const top = [...favs].sort((a, b) => (b.userRating || 0) - (a.userRating || 0))[0];
      setRecommendedBase(top.title);
      try {
        const res  = await fetch(
          `https://api.themoviedb.org/3/tv/${top.id}/recommendations?api_key=${API_KEY}&language=tr-TR`
        );
        const data = await res.json();
        setRecommendedItems(
          (data.results ?? []).filter(isSafeRelaxed).map(tmdbTvToSeries).slice(0, 20)
        );
      } catch { setRecommendedItems([]); }
    });
  }, []));

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => { loadSeries(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') { setSearchResults([]); return; }
    const timer = setTimeout(() => searchSeries(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSeries = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
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
        fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}&language=tr-TR&page=${pageNum}`),
        fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${API_KEY}&language=tr-TR&page=${pageNum}`),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      const seen = new Set<number>();
      const all  = [...(d1.results ?? []), ...(d2.results ?? [])].filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      const newItems = all.filter(isSafeRelaxed).map(tmdbTvToSeries);
      const current  = seriesRef.current;
      const updated  = reset ? newItems : [...current, ...newItems];
      setSeries(updated);
      setPage(pageNum);
      setHasMore(pageNum < 3);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      Alert.alert(t('common.error'), t('media.seriesLoadError'));
    } finally { setLoadingMore(false); }
  };

  const fetchGenreRows = async () => {
    const results: Record<string, Series[]> = {};
    await Promise.all(
      ROWS.map(async (row) => {
        try {
          const res  = await fetch(row.url());
          const data = await res.json();
          const filter = row.relaxed ? isSafeRelaxed : isSafe;
          results[row.id] = (data.results ?? [])
            .filter(filter).map(tmdbTvToSeries).slice(0, 20);
        } catch { results[row.id] = []; }
      })
    );
    setGenreRows(results);
  };

  const searchSeries = async (query: string) => {
    setSearching(true);
    try {
      const res  = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=tr-TR&query=${encodeURIComponent(query)}&page=1&include_adult=false`
      );
      const data = await res.json();
      setSearchResults(
        (data.results ?? []).filter(isSafeRelaxed).map(tmdbTvToSeries).slice(0, 40)
      );
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSave = async () => {
    if (!form.title) return Alert.alert(t('common.warning'), t('media.titleRequired'));
    const cleaned = { ...form, trailer: extractYoutubeId(form.trailer) };
    const updated = editingItem
      ? series.map(s => s.id === editingItem.id ? { ...cleaned, id: s.id } : s)
      : [{ ...cleaned, id: Date.now().toString() }, ...series];
    setSeries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false); setEditingItem(null);
    setForm({ title: '', img: '', backdrop: '', trailer: '', imdb: '', type: '', year: '', overview: '', genreIds: [] });
  };

  const navigateTo = (item: Series) =>
    router.push({
      pathname: '/details/[id]',
      params: {
        id: item.id, title: item.title, trailer: item.trailer,
        year: item.year, type: item.type, img: item.img,
        backdrop: item.backdrop, overview: item.overview, mediaType: 'tv',
      },
    });

  const isSearchMode = searchQuery.trim().length > 0;
  const heroItem     = series[heroIndex];

  // ── Hero Banner ────────────────────────────────────────────────────────────
  const HeroBanner = series.length > 0 ? (
    <View style={styles.heroBanner}>
      <Animated.View style={{ opacity: heroOpacity, transform: [{ translateX: heroTranslate }] }}>
        <Pressable onPress={() => heroItem && navigateTo(heroItem)} accessibilityRole="button">
          <Image source={{ uri: heroItem?.backdrop }} style={styles.heroImage} />
          <LinearGradient colors={C.gradientHero} style={styles.heroGradient}>
            <View style={styles.heroBadgeRow}>
              {[`⭐ ${heroItem?.imdb}`, heroItem?.type, heroItem?.year].map(label => (
                <View key={label} style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{heroItem?.title}</Text>
            {heroItem?.overview ? (
              <Text style={styles.heroOverview} numberOfLines={2}>{heroItem.overview}</Text>
            ) : null}
            <View style={styles.heroBtnRow}>
              <TouchableOpacity style={styles.heroPlayBtn} onPress={() => heroItem && navigateTo(heroItem)}>
                <Ionicons name="play" size={16} color="black" />
                <Text style={styles.heroPlayText}>{t('media.seeDetails')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroInfoBtn} onPress={() => {
                if (!heroItem) return;
                setEditingItem(heroItem);
                setForm({ title: heroItem.title, img: heroItem.img, backdrop: heroItem.backdrop, trailer: heroItem.trailer, imdb: heroItem.imdb, type: heroItem.type, year: heroItem.year, overview: heroItem.overview, genreIds: heroItem.genreIds });
                setModalVisible(true);
              }}>
                <Ionicons name="information-circle-outline" size={16} color="white" />
                <Text style={styles.heroInfoText}>{t('media.edit')}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      <View style={styles.heroDots}>
        {Array.from({ length: Math.min(HERO_COUNT, series.length) }, (_, i) => (
          <Pressable key={i} onPress={() => transitionTo(i)}
            style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
        ))}
      </View>
    </View>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('media.searchTVPlaceholder')}
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
      </View>

      {/* İçerik */}
      {loading ? (
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => i)}
          numColumns={2}
          keyExtractor={(i) => `sk-${i}`}
          renderItem={() => <SkeletonPoster />}
          scrollEnabled={false}
          contentContainerStyle={{ paddingTop: 8 }}
        />
      ) : isSearchMode ? (
        <>
          <Text style={styles.resultCount}>
            {searchResults.length} {t('media.resultsFound')} — "{searchQuery}"
          </Text>
          <FlatList
            data={searchResults}
            numColumns={2}
            keyExtractor={(s) => s.id}
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {HeroBanner}

          {/* Favori bazlı öneri */}
          {recommendedItems.length > 0 && (
            <CategoryRow
              emoji="💡"
              label={`"${recommendedBase}" Sevdiyseniz`}
              data={recommendedItems}
              onPress={navigateTo}
            />
          )}

          {/* 🔥 Popüler Bu Hafta */}
          <CategoryRow
            emoji="📺" label="Popüler Bu Hafta"
            data={series.slice(0, 20)}
            onPress={navigateTo}
          />

          {/* Genre carousel'leri */}
          {ROWS.map(row => (
            <CategoryRow
              key={row.id}
              emoji={row.emoji}
              label={row.label}
              data={genreRows[row.id] ?? []}
              onPress={navigateTo}
            />
          ))}

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

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editSheet}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.editHeader}>
                {editingItem ? t('media.edit') : t('media.add')}
              </Text>
              {[
                { ph: t('media.seriesName'), key: 'title'   },
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
  container:     { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 20 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  searchBar:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, padding: 0 },

  heroBanner:    { marginBottom: 4 },
  heroImage:     { width: '100%', height: 320, resizeMode: 'cover', backgroundColor: C.surface },
  heroGradient:  { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 80 },
  heroBadgeRow:  { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  heroBadge:     { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroBadgeText: { color: C.text, fontSize: 11, fontWeight: '600' },
  heroTitle:     { color: C.text, fontSize: 22, fontWeight: 'bold', marginBottom: 6, lineHeight: 28 },
  heroOverview:  { color: C.textSub, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  heroBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  heroPlayBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.text, paddingVertical: 11, borderRadius: Radius.sm },
  heroPlayText:  { color: 'black', fontWeight: 'bold', fontSize: 14 },
  heroInfoBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(109,109,110,0.7)', paddingVertical: 11, borderRadius: Radius.sm },
  heroInfoText:  { color: C.text, fontWeight: 'bold', fontSize: 14 },
  heroDots:      { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  heroDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh },
  heroDotActive: { width: 20, backgroundColor: C.accent },

  categoryRow:   { marginBottom: 20 },
  categoryLabel: { color: C.text, fontSize: 15, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 10 },
  categoryEmoji: { fontSize: 14 },
  rowContent:    { paddingHorizontal: 16, gap: 10 },

  netflixPoster: { width: CARD.w, height: CARD.h, borderRadius: Radius.sm, backgroundColor: C.surface, resizeMode: 'cover' },
  cardGradient:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD.h * 0.45, borderBottomLeftRadius: Radius.sm, borderBottomRightRadius: Radius.sm, justifyContent: 'flex-end', padding: 6 },
  cardLabel:     { color: C.text, fontSize: 10, fontWeight: '600', lineHeight: 13 },

  loadMoreBtn:  { alignSelf: 'center', marginVertical: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  loadMoreText: { color: C.textSub, fontSize: 13 },

  resultCount:  { fontSize: 12, color: C.textMuted, paddingHorizontal: 16, marginBottom: 6 },
  searchGrid:   { paddingHorizontal: 10, paddingBottom: 80 },
  searchCard:   { flex: 1, margin: 6, backgroundColor: C.surface, borderRadius: Radius.md, overflow: 'hidden' },
  searchPoster: { width: '100%', height: 200, resizeMode: 'cover', backgroundColor: C.surfaceHigh },
  searchImdbBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  searchImdbText:  { color: C.text, fontWeight: 'bold', fontSize: 11 },
  searchCardTitle: { padding: 8, color: C.text, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  emptyText:       { color: C.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14 },

  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: C.accent, width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8 },

  modalOverlay:  { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  editSheet:     { backgroundColor: C.surface, borderRadius: Radius.xl, padding: 24, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: C.border },
  editHeader:    { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 18, textAlign: 'center' },
  editInput:     { backgroundColor: C.surfaceHigh, padding: 12, borderRadius: Radius.md, marginBottom: 10, borderWidth: 1, borderColor: C.border, color: C.text, width: '100%' },
  editBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 6 },
  editCancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  editSaveBtn:   { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', backgroundColor: C.accent },
});