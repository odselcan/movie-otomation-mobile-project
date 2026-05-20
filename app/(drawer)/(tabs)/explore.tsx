// app/(drawer)/(tabs)/explore.tsx
// Netflix dark tema + çok filtreli keşfet sayfası
// Filtreler: Tür (film/dizi), Kategori, IMDb, Yıl, Sıralama
// Tüm filtreler opsiyonel — TMDB discover API'ye doğrudan parametre olarak gönderilir

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Image, Modal,
  Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { C, CARD, Radius, Spacing } from '../../../constants/theme';
import { SkeletonPoster } from '../../../components/SkeletonCard';
import { useI18n } from '../../../hooks/useI18n';
import { API_KEY } from '../../../services/tmdb';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MediaItem {
  id: string; title: string; img: string;
  imdb: string; year: string; type: string;
  trailer: string; mediaType: 'movie' | 'tv';
}

interface Filters {
  mediaType: 'movie' | 'tv' | 'all';
  genreId:   number | null;
  minRating: string;
  year:      string;
  sortBy:    string;
}

type SheetKey = 'mediaType' | 'genre' | 'rating' | 'year' | 'sort' | null;

// ─── Constants ────────────────────────────────────────────────────────────────
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const MOVIE_GENRES = [
  { id: 0,     label: 'Tümü'        },
  { id: 28,    label: 'Aksiyon'     },
  { id: 12,    label: 'Macera'      },
  { id: 16,    label: 'Animasyon'   },
  { id: 35,    label: 'Komedi'      },
  { id: 80,    label: 'Suç'         },
  { id: 18,    label: 'Dram'        },
  { id: 14,    label: 'Fantastik'   },
  { id: 27,    label: 'Korku'       },
  { id: 878,   label: 'Bilim Kurgu' },
  { id: 53,    label: 'Gerilim'     },
  { id: 10752, label: 'Savaş'       },
  { id: 37,    label: 'Western'     },
];

const TV_GENRES = [
  { id: 0,     label: 'Tümü'             },
  { id: 10759, label: 'Aksiyon'          },
  { id: 16,    label: 'Animasyon'        },
  { id: 35,    label: 'Komedi'           },
  { id: 80,    label: 'Suç'              },
  { id: 18,    label: 'Dram'             },
  { id: 10765, label: 'Bilim Kurgu'      },
  { id: 9648,  label: 'Gizem'            },
  { id: 10749, label: 'Romantik'         },
  { id: 10751, label: 'Aile'             },
];

const MEDIA_TYPES = [
  { value: 'all',   label: '🎬📺 Tümü' },
  { value: 'movie', label: '🎬 Film'   },
  { value: 'tv',    label: '📺 Dizi'   },
];

const RATINGS = [
  { value: '',    label: 'Tüm Puanlar' },
  { value: '6',   label: '6.0+ IMDb'  },
  { value: '7',   label: '7.0+ IMDb'  },
  { value: '7.5', label: '7.5+ IMDb'  },
  { value: '8',   label: '8.0+ IMDb'  },
  { value: '8.5', label: '8.5+ IMDb'  },
  { value: '9',   label: '9.0+ IMDb'  },
];

const YEARS = [
  { value: '',        label: 'Tüm Yıllar'      },
  { value: '2025',    label: '2025'             },
  { value: '2024',    label: '2024'             },
  { value: '2023',    label: '2023'             },
  { value: '2022',    label: '2022'             },
  { value: '2021',    label: '2021'             },
  { value: '2020s',   label: '2020\'ler'        },
  { value: '2010s',   label: '2010\'lar'        },
  { value: '2000s',   label: '2000\'ler'        },
  { value: 'classic', label: 'Klasikler (−2000)'},
];

const SORT_OPTIONS = [
  { value: 'popularity.desc',            label: '🔥 En Popüler'    },
  { value: 'vote_average.desc',          label: '⭐ IMDb Puanı'    },
  { value: 'primary_release_date.desc',  label: '📅 En Yeni'       },
  { value: 'primary_release_date.asc',   label: '📅 En Eski'       },
  { value: 'revenue.desc',               label: '💰 En Çok Gişe'   },
];

const DEFAULT_FILTERS: Filters = {
  mediaType: 'all',
  genreId:   null,
  minRating: '',
  year:      '',
  sortBy:    'popularity.desc',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSafe(item: any): boolean {
  if (item.adult || !(item.poster_path)) return false;
  if (item.vote_average < 5.0) return false;
  return true;
}

function toMediaItem(item: any, mediaType: 'movie' | 'tv'): MediaItem {
  return {
    id:        String(item.id),
    title:     item.title ?? item.name ?? 'Bilinmiyor',
    img:       `${IMAGE_BASE}${item.poster_path}`,
    imdb:      item.vote_average?.toFixed(1) ?? '0.0',
    year:      ((item.release_date ?? item.first_air_date) ?? '').slice(0, 4),
    type:      mediaType === 'tv' ? 'Dizi' : 'Film',
    trailer:   '',
    mediaType,
  };
}

// Filtrelerden TMDB URL üret — film veya dizi için ayrı
function buildUrl(filters: Filters, mediaType: 'movie' | 'tv', page: number): string {
  const isTV   = mediaType === 'tv';
  const base   = isTV
    ? `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&include_adult=false`
    : `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&include_adult=false`;

  const params: string[] = [`page=${page}`];

  // Sıralama — TV'de revenue yok, popülariteye dön
  const sort = (isTV && filters.sortBy === 'revenue.desc')
    ? 'popularity.desc'
    : isTV
      ? filters.sortBy
          .replace('primary_release_date', 'first_air_date')
      : filters.sortBy;
  params.push(`sort_by=${sort}`);

  // Kategori
  if (filters.genreId) params.push(`with_genres=${filters.genreId}`);

  // IMDb minimum
  if (filters.minRating) {
    params.push(`vote_average.gte=${filters.minRating}`);
    params.push('vote_count.gte=100');
  } else {
    params.push('vote_count.gte=200');
  }

  // Yıl
  const dateKey = isTV ? 'first_air_date' : 'primary_release_date';
  if (filters.year === '2020s') {
    params.push(`${dateKey}.gte=2020-01-01`, `${dateKey}.lte=2029-12-31`);
  } else if (filters.year === '2010s') {
    params.push(`${dateKey}.gte=2010-01-01`, `${dateKey}.lte=2019-12-31`);
  } else if (filters.year === '2000s') {
    params.push(`${dateKey}.gte=2000-01-01`, `${dateKey}.lte=2009-12-31`);
  } else if (filters.year === 'classic') {
    params.push(`${dateKey}.lte=1999-12-31`);
  } else if (filters.year) {
    if (isTV) {
      params.push(`${dateKey}.gte=${filters.year}-01-01`, `${dateKey}.lte=${filters.year}-12-31`);
    } else {
      params.push(`primary_release_year=${filters.year}`);
    }
  }

  return `${base}&${params.join('&')}`;
}

// Kaç filtre aktif?
function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.mediaType !== 'all') n++;
  if (f.genreId) n++;
  if (f.minRating) n++;
  if (f.year) n++;
  if (f.sortBy !== 'popularity.desc') n++;
  return n;
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ label, isActive, onPress }: {
  label: string; isActive: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, isActive && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, isActive && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={11}
        color={isActive ? 'white' : C.textMuted}
      />
    </Pressable>
  );
}

// ─── FilterSheet ──────────────────────────────────────────────────────────────
function FilterSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string;
  options: { value: any; label: string }[];
  selected: any; onSelect: (v: any) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContent}>
          {/* Handle */}
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {options.map(opt => {
              const active = selected === opt.value ||
                (opt.value === 0 && !selected) ||
                (opt.value === '' && !selected);
              return (
                <Pressable
                  key={String(opt.value)}
                  style={[styles.sheetOption, active && styles.sheetOptionActive]}
                  onPress={() => {
                    const val = (opt.value === 0 || opt.value === '') ? null : opt.value;
                    onSelect(val ?? opt.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {opt.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={18} color={C.accent} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────
function ResultCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[styles.resultCard, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, friction: 7 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 7 }).start()}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <Image source={{ uri: item.img }} style={styles.resultPoster} />
        {/* Tür badge */}
        <View style={[styles.typeBadge, { backgroundColor: item.mediaType === 'tv' ? '#1a6b8a' : C.accent }]}>
          <Text style={styles.typeBadgeText}>{item.mediaType === 'tv' ? '📺' : '🎬'}</Text>
        </View>
        {/* IMDb badge */}
        <View style={styles.imdbBadge}>
          <Text style={styles.imdbText}>⭐ {item.imdb}</Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.resultYear}>{item.year}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ExploreScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function ExploreScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const { t }      = useI18n();

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ title: t('tabs.explore') });
  }, [t]));

  // ── Filtre state ───────────────────────────────────────────────────────────
  const [filters, setFilters]     = useState<Filters>(DEFAULT_FILTERS);
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);

  // ── Sonuç state ────────────────────────────────────────────────────────────
  const [results, setResults]   = useState<MediaItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  // filtre değişince sayfa sıfırla + yeniden fetch
  useEffect(() => {
    setPage(1);
    setResults([]);
    fetchResults(filters, 1, true);
  }, [filters]);

  const fetchResults = async (f: Filters, pageNum: number, reset = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const mediaTypes: Array<'movie' | 'tv'> =
        f.mediaType === 'all' ? ['movie', 'tv'] : [f.mediaType];

      // Her aktif media type için TMDB'den çek, birleştir
      const allItems: MediaItem[] = [];
      let total = 0;

      await Promise.all(mediaTypes.map(async (mt) => {
        const url = buildUrl(f, mt, pageNum);
        const res  = await fetch(url);
        const data = await res.json();
        total += data.total_results ?? 0;
        const items = (data.results ?? [])
          .filter(isSafe)
          .map((i: any) => toMediaItem(i, mt));
        allItems.push(...items);
      }));

      // Karıştır ve sırala (imdb'ye göre, eğer "all" modundaysa)
      const sorted = f.mediaType === 'all'
        ? allItems.sort((a, b) => parseFloat(b.imdb) - parseFloat(a.imdb))
        : allItems;

      // Duplicate ID temizle
      const seen = new Set<string>();
      const unique = sorted.filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id); return true;
      });

      setTotalResults(total);
      setResults(prev => reset ? unique : [...prev, ...unique]);
      setHasMore(unique.length > 0 && pageNum < 10);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchResults(filters, next);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      // Kategori değişince genre sıfırla (film vs dizi genre ID'leri farklı)
      if (key === 'mediaType') updated.genreId = null;
      return updated;
    });
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const navigateTo = (item: MediaItem) =>
    router.push({
      pathname: '/details/[id]',
      params: {
        id: item.id, title: item.title, trailer: item.trailer,
        year: item.year, type: item.type, img: item.img, mediaType: item.mediaType,
      },
    });

  // ── Chip label hesapla ─────────────────────────────────────────────────────
  const genreList  = filters.mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES;
  const genreLabel = filters.genreId
    ? (genreList.find(g => g.id === filters.genreId)?.label ?? 'Kategori')
    : 'Kategori';
  const ratingLabel = filters.minRating ? `${filters.minRating}+ IMDb` : 'IMDb';
  const yearLabel   = filters.year
    ? (YEARS.find(y => y.value === filters.year)?.label ?? filters.year)
    : 'Yıl';
  const sortLabel   = SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label ?? 'Sırala';
  const mediaLabel  = MEDIA_TYPES.find(m => m.value === filters.mediaType)?.label ?? 'Tümü';
  const activeCount = activeFilterCount(filters);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Filtre satırı ─────────────────────────────────────────────────── */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* Tür */}
          <FilterChip
            label={mediaLabel}
            isActive={filters.mediaType !== 'all'}
            onPress={() => setOpenSheet('mediaType')}
          />
          {/* Kategori */}
          <FilterChip
            label={genreLabel}
            isActive={!!filters.genreId}
            onPress={() => setOpenSheet('genre')}
          />
          {/* IMDb */}
          <FilterChip
            label={ratingLabel}
            isActive={!!filters.minRating}
            onPress={() => setOpenSheet('rating')}
          />
          {/* Yıl */}
          <FilterChip
            label={yearLabel}
            isActive={!!filters.year}
            onPress={() => setOpenSheet('year')}
          />
          {/* Sıralama */}
          <FilterChip
            label={sortLabel}
            isActive={filters.sortBy !== 'popularity.desc'}
            onPress={() => setOpenSheet('sort')}
          />
          {/* Sıfırla */}
          {activeCount > 0 && (
            <Pressable style={styles.resetBtn} onPress={resetFilters}>
              <Ionicons name="close-circle" size={14} color={C.accent} />
              <Text style={styles.resetText}>Sıfırla ({activeCount})</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Sonuç sayısı */}
        {!loading && (
          <Text style={styles.resultCount}>
            {results.length > 0
              ? `${results.length} sonuç gösteriliyor`
              : 'Sonuç bulunamadı'}
          </Text>
        )}
      </View>

      {/* ── Sonuçlar ──────────────────────────────────────────────────────── */}
      {loading ? (
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => i)}
          numColumns={2}
          keyExtractor={(i) => `sk-${i}`}
          renderItem={() => <SkeletonPoster />}
          scrollEnabled={false}
          contentContainerStyle={{ padding: 10 }}
        />
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
          <Text style={styles.emptySubtitle}>Filtrelerinizi değiştirerek tekrar deneyin</Text>
          <TouchableOpacity style={styles.emptyResetBtn} onPress={resetFilters}>
            <Text style={styles.emptyResetText}>Filtreleri Sıfırla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          contentContainerStyle={styles.grid}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={C.accent} />
                <Text style={styles.loadingMoreText}>{t('common.loadingMore')}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ResultCard item={item} onPress={() => navigateTo(item)} />
          )}
        />
      )}

      {/* ── Filter Sheets ─────────────────────────────────────────────────── */}
      <FilterSheet
        visible={openSheet === 'mediaType'}
        title="İçerik Türü"
        options={MEDIA_TYPES}
        selected={filters.mediaType}
        onSelect={v => updateFilter('mediaType', v as Filters['mediaType'])}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'genre'}
        title="Kategori"
        options={genreList.map(g => ({ value: g.id, label: g.label }))}
        selected={filters.genreId ?? 0}
        onSelect={v => updateFilter('genreId', v === 0 ? null : v)}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'rating'}
        title="Minimum IMDb Puanı"
        options={RATINGS}
        selected={filters.minRating}
        onSelect={v => updateFilter('minRating', v ?? '')}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'year'}
        title="Yıl"
        options={YEARS}
        selected={filters.year}
        onSelect={v => updateFilter('year', v ?? '')}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'sort'}
        title="Sıralama"
        options={SORT_OPTIONS}
        selected={filters.sortBy}
        onSelect={v => updateFilter('sortBy', v)}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Filtre bölümü
  filterSection: { paddingTop: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  filterRow:     { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surface, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  chipActive:     { backgroundColor: C.accent, borderColor: C.accent },
  chipText:       { color: C.textSub, fontSize: 12, fontWeight: '500' },
  chipTextActive: { color: 'white', fontWeight: 'bold' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surfaceHigh, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.accent + '40',
  },
  resetText:   { color: C.accent, fontSize: 12, fontWeight: '600' },
  resultCount: { color: C.textMuted, fontSize: 11, paddingHorizontal: 16, paddingBottom: 8 },

  // Grid
  grid:          { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 80 },
  resultCard:    { flex: 1, margin: 6, backgroundColor: C.surface, borderRadius: Radius.md, overflow: 'hidden' },
  resultPoster:  { width: '100%', height: 210, resizeMode: 'cover', backgroundColor: C.surfaceHigh },
  typeBadge:     { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 12 },
  imdbBadge:     { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  imdbText:      { color: C.text, fontWeight: 'bold', fontSize: 11 },
  resultInfo:    { padding: 8 },
  resultTitle:   { color: C.text, fontWeight: 'bold', fontSize: 12, lineHeight: 16 },
  resultYear:    { color: C.textMuted, fontSize: 10, marginTop: 2 },

  // Boş durum
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:     { fontSize: 56, marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 20 },
  emptyResetBtn: { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyResetText:{ color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Load more
  loadingMore:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText: { color: C.textMuted, fontSize: 12 },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContent: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: C.border,
  },
  sheetHandle:   { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:    { color: C.text, fontSize: 17, fontWeight: 'bold', marginBottom: 14 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sheetOptionActive:     { },
  sheetOptionText:       { color: C.textSub, fontSize: 15 },
  sheetOptionTextActive: { color: C.text, fontWeight: 'bold' },
});