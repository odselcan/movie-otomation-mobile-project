// app/(drawer)/(tabs)/explore.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SkeletonPoster } from '../../../components/SkeletonCard';

interface MediaItem {
  id: string; title: string; img: string;
  imdb: string; year: string; type: string;
  trailer: string; mediaType: 'movie' | 'tv';
}

const API_KEY = '2486490124fea972467ec0b8e6847a5f';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const BLOCKED_MOVIE_IDS = new Set([27205, 550, 680, 497, 562, 18491, 11216, 423108, 631842, 361743]);
const BLOCKED_TV_IDS    = new Set([1396, 1399, 94997, 76479, 60574, 93405, 100088, 63174, 87108, 66732]);
const BLOCKED_KEYWORDS  = ['sex', 'sexo', 'erotik', 'erotic', 'nude', 'porn', 'xxx', 'inconnu'];

const MOVIE_GENRES = [
  { id: 0, label: 'Tümü' }, { id: 28, label: 'Aksiyon' },
  { id: 35, label: 'Komedi' }, { id: 18, label: 'Dram' },
  { id: 878, label: 'Bilim Kurgu' }, { id: 27, label: 'Korku' },
  { id: 16, label: 'Animasyon' }, { id: 53, label: 'Gerilim' },
  { id: 12, label: 'Macera' }, { id: 14, label: 'Fantastik' },
  { id: 10751, label: 'Aile' }, { id: 36, label: 'Tarih' },
];

const TV_GENRES = [
  { id: 0, label: 'Tümü' }, { id: 10759, label: 'Aksiyon' },
  { id: 35, label: 'Komedi' }, { id: 18, label: 'Dram' },
  { id: 10765, label: 'Bilim Kurgu' }, { id: 9648, label: 'Gizem' },
  { id: 10751, label: 'Aile' }, { id: 16, label: 'Animasyon' },
  { id: 10762, label: 'Çocuk' },
];

const TABS = [
  { key: 'toprated', label: 'En İyi',   icon: 'star-outline'     },
  { key: 'popular',  label: 'Popüler',  icon: 'flame-outline'    },
  { key: 'upcoming', label: 'Yakında',  icon: 'calendar-outline' },
];

function isSafe(item: any, blocked: Set<number>): boolean {
  if (item.adult) return false;
  if (!item.poster_path) return false;
  if (item.vote_average < 6.5) return false;
  if (item.vote_count < 300) return false;
  if (blocked.has(item.id)) return false;
  const title = (item.title ?? item.name ?? '').toLowerCase();
  if (BLOCKED_KEYWORDS.some(kw => title.includes(kw))) return false;
  return true;
}

function toMediaItem(item: any, mediaType: 'movie' | 'tv'): MediaItem {
  const isTV = mediaType === 'tv';
  return {
    id: String(item.id),
    title: (isTV ? item.name : item.title) ?? 'Bilinmiyor',
    img: `${IMAGE_BASE}${item.poster_path}`,
    imdb: item.vote_average?.toFixed(1) ?? '0.0',
    year: ((isTV ? item.first_air_date : item.release_date) ?? '').slice(0, 4),
    type: mediaType === 'movie' ? 'Film' : 'Dizi',
    trailer: '',
    mediaType,
  };
}

export default function ExploreScreen() {
  const router = useRouter();
  const [mediaTab, setMediaTab]           = useState<'movie' | 'tv'>('movie');
  const [activeTab, setActiveTab]         = useState('toprated');
  const [selectedGenre, setSelectedGenre] = useState(0);
  const [searchQuery, setSearchQuery]     = useState('');
  const [items, setItems]                 = useState<MediaItem[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [searching, setSearching]         = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);

  useEffect(() => {
    setSelectedGenre(0);
    setPage(1);
    setItems([]);
    fetchItems(1, true);
  }, [mediaTab, activeTab]);

  useEffect(() => {
    if (searchQuery.trim() === '') { setSearchResults([]); return; }
    const timer = setTimeout(() => searchItems(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const blocked = mediaTab === 'movie' ? BLOCKED_MOVIE_IDS : BLOCKED_TV_IDS;

  const getEndpoint = (pageNum: number) => {
    // Discover ile without_genres=10749 (romantik/yetişkin) hariç
    if (selectedGenre > 0) {
      return `discover/${mediaTab}?api_key=${API_KEY}&language=tr-TR&with_genres=${selectedGenre}&without_genres=10749&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false&page=${pageNum}`;
    }
    if (mediaTab === 'movie') {
      const ep = activeTab === 'toprated' ? 'top_rated' : activeTab === 'upcoming' ? 'upcoming' : 'now_playing';
      return `movie/${ep}?api_key=${API_KEY}&language=tr-TR&region=US&page=${pageNum}`;
    } else {
      const ep = activeTab === 'toprated' ? 'top_rated' : activeTab === 'upcoming' ? 'on_the_air' : 'popular';
      return `tv/${ep}?api_key=${API_KEY}&language=tr-TR&page=${pageNum}`;
    }
  };

  const fetchItems = async (pageNum = 1, reset = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/${getEndpoint(pageNum)}`);
      const data = await res.json();
      const newItems = (data.results ?? [])
        .filter((i: any) => isSafe(i, blocked))
        .map((i: any) => toMediaItem(i, mediaTab));

      setItems(prev => reset ? newItems : [...prev, ...newItems]);
      setHasMore(pageNum < 5);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const handleGenreSelect = (genreId: number) => {
    setSelectedGenre(genreId);
    setPage(1);
    setItems([]);
    fetchItems(1, true);
  };

  const searchItems = async (query: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/${mediaTab}?api_key=${API_KEY}&language=tr-TR&query=${encodeURIComponent(query)}&page=1&include_adult=false`
      );
      const data = await res.json();
      setSearchResults(
        (data.results ?? []).filter((i: any) => isSafe(i, blocked))
          .map((i: any) => toMediaItem(i, mediaTab)).slice(0, 40)
      );
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const navigateToDetail = (item: MediaItem) => {
    router.push({
      pathname: '/details/[id]',
      params: { id: item.id, title: item.title, trailer: item.trailer, year: item.year, type: item.type, img: item.img, mediaType: item.mediaType },
    });
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const displayData = isSearchMode ? searchResults : items;
  const genres = mediaTab === 'movie' ? MOVIE_GENRES : TV_GENRES;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#DB7093" />
        <TextInput style={styles.searchInput} placeholder={`${mediaTab === 'movie' ? 'Film' : 'Dizi'} ara...`}
          placeholderTextColor="#c0a0b0" value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')} hitSlop={8}><Ionicons name="close-circle" size={16} color="#DB7093" /></Pressable>}
        {searching && <ActivityIndicator size="small" color="#DB7093" />}
      </View>

      <View style={styles.mediaTabRow}>
        <Pressable style={[styles.mediaTab, mediaTab === 'movie' && styles.mediaTabActive]} onPress={() => { setMediaTab('movie'); setSearchQuery(''); }}>
          <Ionicons name="film-outline" size={15} color={mediaTab === 'movie' ? 'white' : '#DB7093'} />
          <Text style={[styles.mediaTabText, mediaTab === 'movie' && styles.mediaTabTextActive]}>Filmler</Text>
        </Pressable>
        <Pressable style={[styles.mediaTab, mediaTab === 'tv' && styles.mediaTabActive]} onPress={() => { setMediaTab('tv'); setSearchQuery(''); }}>
          <Ionicons name="tv-outline" size={15} color={mediaTab === 'tv' ? 'white' : '#DB7093'} />
          <Text style={[styles.mediaTabText, mediaTab === 'tv' && styles.mediaTabTextActive]}>Diziler</Text>
        </Pressable>
      </View>

      {!isSearchMode && (
        <>
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon as any} size={13} color={activeTab === tab.key ? 'white' : '#DB7093'} />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll} contentContainerStyle={styles.genreRow}>
            {genres.map((g) => (
              <Pressable key={g.id} style={[styles.genreChip, selectedGenre === g.id && styles.genreChipActive]} onPress={() => handleGenreSelect(g.id)}>
                <Text style={[styles.genreText, selectedGenre === g.id && styles.genreTextActive]}>{g.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {isSearchMode && <Text style={styles.resultCount}>{searchResults.length} sonuç — "{searchQuery}"</Text>}
      {!isSearchMode && !loading && <Text style={styles.countText}>{items.length} içerik</Text>}

      {loading ? (
        <FlatList data={Array.from({ length: 6 }, (_, i) => i)} numColumns={2}
          keyExtractor={(i) => `sk-${i}`} renderItem={() => <SkeletonPoster />}
          scrollEnabled={false} contentContainerStyle={{ paddingTop: 4 }} />
      ) : (
        <FlatList
          data={displayData} numColumns={2}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          contentContainerStyle={styles.listContent}
          onEndReached={!isSearchMode && hasMore ? () => fetchItems(page + 1) : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <View style={styles.loadingMore}><ActivityIndicator color="#DB7093" /><Text style={styles.loadingMoreText}>Yükleniyor...</Text></View> : null}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>🔍</Text><Text style={styles.emptyText}>{isSearchMode ? `"${searchQuery}" için sonuç bulunamadı` : 'İçerik bulunamadı'}</Text></View>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigateToDetail(item)}>
              <Image source={{ uri: item.img }} style={styles.poster} />
              <View style={styles.imdbBadge}><Text style={styles.imdbText}>⭐ {item.imdb}</Text></View>
              <View style={styles.typeBadge}><Text style={styles.typeText}>{item.mediaType === 'movie' ? '🎬' : '📺'}</Text></View>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardYear}>{item.year}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#FFF5F7', paddingHorizontal: 12, paddingTop: 10 },
  searchBar:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, elevation: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  searchInput:        { flex: 1, fontSize: 13, color: '#4A4A4A', padding: 0 },
  mediaTabRow:        { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mediaTab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFD1DC', backgroundColor: 'white' },
  mediaTabActive:     { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  mediaTabText:       { fontSize: 13, fontWeight: '600', color: '#DB7093' },
  mediaTabTextActive: { color: 'white' },
  tabRow:             { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FFD1DC', backgroundColor: 'white' },
  tabActive:          { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  tabText:            { fontSize: 11, color: '#DB7093', fontWeight: '600' },
  tabTextActive:      { color: 'white' },
  genreScroll:        { marginBottom: 10, maxHeight: 38 },
  genreRow:           { flexDirection: 'row', gap: 6, paddingRight: 8 },
  genreChip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#FFD1DC' },
  genreChipActive:    { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  genreText:          { fontSize: 12, color: '#DB7093', fontWeight: '600' },
  genreTextActive:    { color: 'white' },
  resultCount:        { fontSize: 12, color: '#a07088', marginBottom: 8, marginLeft: 2 },
  countText:          { fontSize: 11, color: '#c0a0b0', marginBottom: 6, marginLeft: 2 },
  listContent:        { paddingBottom: 80, paddingTop: 2 },
  loadingMore:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText:    { fontSize: 12, color: '#DB7093' },
  empty:              { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyIcon:          { fontSize: 48, marginBottom: 12 },
  emptyText:          { fontSize: 14, color: '#c0a0b0', textAlign: 'center' },
  card:               { flex: 1, margin: 5, backgroundColor: 'white', borderRadius: 16, elevation: 4, overflow: 'hidden' },
  poster:             { width: '100%', height: 200, resizeMode: 'cover', backgroundColor: '#FFE0EB' },
  cardTitle:          { paddingHorizontal: 8, paddingTop: 7, textAlign: 'center', fontWeight: 'bold', color: '#4A4A4A', fontSize: 12 },
  cardYear:           { textAlign: 'center', fontSize: 10, color: '#aaa', paddingBottom: 8, paddingTop: 2 },
  imdbBadge:          { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  imdbText:           { color: '#DB7093', fontWeight: 'bold', fontSize: 11 },
  typeBadge:          { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  typeText:           { fontSize: 12 },
});