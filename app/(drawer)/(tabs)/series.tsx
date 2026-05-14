// app/(drawer)/(tabs)/series.tsx
// i18n: Türkçe / İngilizce tam dil desteği

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SkeletonPoster } from '../../../components/SkeletonCard';
import { useI18n } from '../../../hooks/useI18n'; // ← i18n

interface Series {
  id: string; title: string; img: string;
  imdb: string; year: string; type: string; trailer: string;
}

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const STORAGE_KEY = 'series_data_v6';

const BLOCKED_IDS = new Set([
  1396, 1399, 94997, 76479, 60574, 93405, 100088,
  63174, 87108, 66732, 1412, 44217,
]);

const GENRE_MAP: Record<number, string> = {
  10759: 'Aksiyon', 16: 'Animasyon', 35: 'Komedi', 80: 'Suc',
  18: 'Dram', 10751: 'Aile', 10765: 'Bilim Kurgu',
  9648: 'Gizem', 10749: 'Romantik', 10762: 'Cocuk',
};

function isSafe(item: any): boolean {
  if (item.adult) return false;
  if (!item.poster_path) return false;
  if (item.vote_average < 7.0) return false;
  if (item.vote_count < 1000) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  return true;
}

function tmdbTvToSeries(item: any): Series {
  return {
    id: String(item.id),
    title: item.name ?? 'Bilinmiyor',
    img: `${IMAGE_BASE}${item.poster_path}`,
    imdb: item.vote_average?.toFixed(1) ?? '0.0',
    year: (item.first_air_date ?? '').slice(0, 4),
    type: item.genre_ids?.[0] ? (GENRE_MAP[item.genre_ids[0]] ?? 'Dizi') : 'Dizi',
    trailer: '',
  };
}

const extractYoutubeId = (input: string): string => {
  const match = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : input;
};

export default function SeriesScreen() {
  const router = useRouter();
  const { t } = useI18n(); // ← hook

  const [series, setSeries]               = useState<Series[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<Series[]>([]);
  const [searching, setSearching]         = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [editingItem, setEditingItem]     = useState<Series | null>(null);
  const [form, setForm]                   = useState<Omit<Series, 'id'>>({
    title: '', img: '', trailer: '', imdb: '', type: '', year: '',
  });

  useEffect(() => { loadSeries(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') { setSearchResults([]); return; }
    const timer = setTimeout(() => searchSeries(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSeries = async () => {
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) { setSeries(JSON.parse(cached)); setLoading(false); return; }
      await fetchPage(1, true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPage = async (pageNum: number, reset = false) => {
    if (pageNum > 1) setLoadingMore(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}&language=tr-TR&page=${pageNum}`),
        fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=tr-TR&sort_by=vote_average.desc&vote_count.gte=1000&without_genres=10749&page=${pageNum}`),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      const seen = new Set<number>();
      const all = [...(d1.results ?? []), ...(d2.results ?? [])].filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      const newItems = all.filter(isSafe).map(tmdbTvToSeries);
      const updated = reset ? newItems : [...series, ...newItems];
      setSeries(updated);
      setPage(pageNum);
      setHasMore(pageNum < 3);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      Alert.alert(t('common.error'), t('media.seriesLoadError')); // ← çevrildi
    } finally { setLoadingMore(false); }
  };

  const searchSeries = async (query: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=tr-TR&query=${encodeURIComponent(query)}&page=1&include_adult=false`
      );
      const data = await res.json();
      setSearchResults(
        (data.results ?? []).filter(isSafe).map(tmdbTvToSeries).slice(0, 40)
      );
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSave = async () => {
    if (!form.title) return Alert.alert(
      t('common.warning'),        // ← çevrildi
      t('media.titleRequired'),   // ← çevrildi
    );
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
    setForm({ title: '', img: '', trailer: '', imdb: '', type: '', year: '' });
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const displayData  = isSearchMode ? searchResults : series;

  return (
    <View style={styles.container}>

      {/* ARAMA */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#DB7093" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('media.searchTVPlaceholder')} // ← çevrildi
          placeholderTextColor="#c0a0b0"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel={t('a11y.searchInput')}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#DB7093" />
          </Pressable>
        )}
        {searching && <ActivityIndicator size="small" color="#DB7093" />}
      </View>

      {/* Sayaçlar */}
      {isSearchMode && (
        <Text style={styles.resultCount}>
          {searchResults.length} {t('media.resultsFound')} — "{searchQuery}" {/* ← çevrildi */}
        </Text>
      )}
      {!isSearchMode && !loading && (
        <Text style={styles.countText}>
          {series.length} {t('tabs.series').toLowerCase()} {/* ← çevrildi */}
        </Text>
      )}

      {loading ? (
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => i)}
          numColumns={2}
          keyExtractor={(i) => `sk-${i}`}
          renderItem={() => <SkeletonPoster />}
          scrollEnabled={false}
          contentContainerStyle={{ paddingTop: 4 }}
        />
      ) : (
        <FlatList
          data={displayData}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={!isSearchMode && hasMore ? () => fetchPage(page + 1) : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color="#DB7093" />
                <Text style={styles.loadingMoreText}>
                  {t('common.loadingMore')} {/* ← çevrildi */}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📺</Text>
              <Text style={styles.emptyText}>
                {isSearchMode
                  ? `"${searchQuery}" ${t('media.noSearchResults')}` // ← çevrildi
                  : t('media.noContentFound')                         // ← çevrildi
                }
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                onPress={() => router.push({
                  pathname: '/details/[id]',
                  params: {
                    id: item.id, title: item.title, trailer: item.trailer,
                    year: item.year, type: item.type, img: item.img, mediaType: 'tv',
                  },
                })}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.imdb} ${t('common.rating')}`}
              >
                <Image source={{ uri: item.img }} style={styles.poster} />
                <View style={styles.imdbBadge}>
                  <Text style={styles.imdbText}>⭐ {item.imdb}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardYear}>{item.year}</Text>
              </Pressable>

              <Pressable
                style={styles.editBtn}
                onPress={() => {
                  setEditingItem(item);
                  setForm({ title: item.title, img: item.img, trailer: item.trailer, imdb: item.imdb, type: item.type, year: item.year });
                  setModalVisible(true);
                }}
                accessibilityLabel={`${item.title} ${t('media.edit')}`}
                accessibilityRole="button"
              >
                <Ionicons name="pencil" size={14} color="white" />
              </Pressable>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={t('media.add')}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.modalHeader}>
                {editingItem ? t('media.edit') : t('media.add')} {/* ← çevrildi */}
              </Text>
              <TextInput style={styles.input} placeholder={t('media.seriesName')} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
              <TextInput style={styles.input} placeholder={t('media.imageUrl')} value={form.img} onChangeText={(v) => setForm({ ...form, img: v })} />
              <TextInput style={styles.input} placeholder={t('media.youtubeLink')} value={form.trailer} onChangeText={(v) => setForm({ ...form, trailer: v })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="IMDb" value={form.imdb} onChangeText={(v) => setForm({ ...form, imdb: v })} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('media.year')} value={form.year} onChangeText={(v) => setForm({ ...form, year: v })} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder={t('media.genre')} value={form.type} onChangeText={(v) => setForm({ ...form, type: v })} />
              <View style={styles.modalButtons}>
                <Pressable style={[styles.btn, { backgroundColor: '#FFD1DC' }]} onPress={closeModal}>
                  <Text style={{ color: '#DB7093', fontWeight: 'bold' }}>{t('common.cancel')}</Text> {/* ← çevrildi */}
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: '#DB7093' }]} onPress={handleSave}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common.save')}</Text> {/* ← çevrildi */}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFF5F7', paddingHorizontal: 10, paddingTop: 10 },
  searchBar:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, elevation: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  searchInput:     { flex: 1, fontSize: 13, color: '#4A4A4A', padding: 0 },
  resultCount:     { fontSize: 12, color: '#a07088', marginBottom: 6, marginLeft: 2 },
  countText:       { fontSize: 11, color: '#c0a0b0', marginBottom: 6, marginLeft: 2 },
  listContent:     { paddingBottom: 80 },
  loadingMore:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText: { fontSize: 12, color: '#DB7093' },
  empty:           { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyIcon:       { fontSize: 48, marginBottom: 12 },
  emptyText:       { fontSize: 14, color: '#c0a0b0', textAlign: 'center' },
  card:            { flex: 1, margin: 6, backgroundColor: 'white', borderRadius: 18, elevation: 4, overflow: 'hidden' },
  poster:          { width: '100%', height: 210, resizeMode: 'cover', backgroundColor: '#FFE0EB' },
  cardTitle:       { padding: 8, textAlign: 'center', fontWeight: 'bold', color: '#4A4A4A', fontSize: 12 },
  cardYear:        { textAlign: 'center', fontSize: 10, color: '#aaa', paddingBottom: 8 },
  imdbBadge:       { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  imdbText:        { color: '#DB7093', fontWeight: 'bold', fontSize: 11 },
  editBtn:         { position: 'absolute', bottom: 46, right: 8, backgroundColor: '#DB7093', padding: 6, borderRadius: 14 },
  fab:             { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#DB7093', width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalContent:    { margin: 20, backgroundColor: '#FFF5F7', borderRadius: 30, padding: 25, alignItems: 'center', maxHeight: '80%', borderWidth: 2, borderColor: '#FFD1DC' },
  modalHeader:     { fontSize: 22, fontWeight: 'bold', color: '#DB7093', marginBottom: 20 },
  input:           { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFD1DC', width: '100%' },
  modalButtons:    { flexDirection: 'row', gap: 10 },
  btn:             { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
});