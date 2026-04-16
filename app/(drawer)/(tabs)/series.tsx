// app/(drawer)/(tabs)/series.tsx
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

interface Series {
  id: string; title: string; img: string;
  imdb: string; year: string; type: string; trailer: string;
}

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const STORAGE_KEY = 'series_data_v5';

const BLOCKED_IDS = new Set([
  1396, 1399, 94997, 76479, 60574, 93405, 100088,
  63174, 87108, 66732, 1412, 44217,
]);

//const BLOCKED_KEYWORDS = ['sex', 'sexo', 'erotik', 'erotic', 'nude', 'porn', 'xxx', 'adult'];

const GENRE_MAP: Record<number, string> = {
  10759: 'Aksiyon', 16: 'Animasyon', 35: 'Komedi', 80: 'Suç',
  18: 'Dram', 10751: 'Aile', 10765: 'Bilim Kurgu',
  9648: 'Gizem', 10749: 'Romantik', 10762: 'Çocuk',
};

function isSafe(item: any): boolean {
  if (item.adult) return false;
  if (!item.poster_path) return false;
  if (item.vote_average < 6.5) return false;
  if (item.vote_count < 200) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  const title = (item.name ?? item.title ?? '').toLowerCase();
  //if (BLOCKED_KEYWORDS.some(kw => title.includes(kw))) return false;
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
  const [series, setSeries]             = useState<Series[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<Series[]>([]);
  const [searching, setSearching]       = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem]   = useState<Series | null>(null);
  const [form, setForm]                 = useState<Omit<Series, 'id'>>({
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
    } catch (e) { Alert.alert('Hata', 'Diziler yüklenemedi.'); }
    finally { setLoadingMore(false); }
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
    if (!form.title) return Alert.alert('Uyarı', 'Başlık zorunludur!');
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
  const displayData = isSearchMode ? searchResults : series;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#DB7093" />
        <TextInput style={styles.searchInput} placeholder="Dizi ara..." placeholderTextColor="#c0a0b0"
          value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')} hitSlop={8}><Ionicons name="close-circle" size={16} color="#DB7093" /></Pressable>}
        {searching && <ActivityIndicator size="small" color="#DB7093" />}
      </View>

      {isSearchMode && <Text style={styles.resultCount}>{searchResults.length} sonuç — "{searchQuery}"</Text>}
      {!isSearchMode && !loading && <Text style={styles.countText}>{series.length} dizi</Text>}

      {loading ? (
        <FlatList data={Array.from({ length: 6 }, (_, i) => i)} numColumns={2}
          keyExtractor={(i) => `sk-${i}`} renderItem={() => <SkeletonPoster />}
          scrollEnabled={false} contentContainerStyle={{ paddingTop: 4 }} />
      ) : (
        <FlatList
          data={displayData} numColumns={2} keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={!isSearchMode && hasMore ? () => fetchPage(page + 1) : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <View style={styles.loadingMore}><ActivityIndicator color="#DB7093" /><Text style={styles.loadingMoreText}>Yükleniyor...</Text></View> : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => router.push({
                pathname: '/details/[id]',
                params: { id: item.id, title: item.title, trailer: item.trailer, year: item.year, type: item.type, img: item.img, mediaType: 'tv' }
              })}>
                <Image source={{ uri: item.img }} style={styles.poster} />
                <View style={styles.imdbBadge}><Text style={styles.imdbText}>⭐ {item.imdb}</Text></View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              </Pressable>
              {!isSearchMode && (
                <Pressable style={styles.editBtn} onPress={() => { setEditingItem(item); setForm(item); setModalVisible(true); }}>
                  <Ionicons name="pencil" size={14} color="white" />
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      {!isSearchMode && <Pressable style={styles.fab} onPress={() => setModalVisible(true)}><Ionicons name="tv-outline" size={28} color="white" /></Pressable>}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.modalHeader}>{editingItem ? 'Düzenle' : 'Yeni Ekle'}</Text>
              <TextInput style={styles.input} placeholder="Dizi Adı" value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
              <TextInput style={styles.input} placeholder="Resim URL" value={form.img} onChangeText={(t) => setForm({ ...form, img: t })} />
              <TextInput style={styles.input} placeholder="Youtube ID veya Link" value={form.trailer} onChangeText={(t) => setForm({ ...form, trailer: t })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="IMDb" value={form.imdb} onChangeText={(t) => setForm({ ...form, imdb: t })} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Yıl" value={form.year} onChangeText={(t) => setForm({ ...form, year: t })} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder="Tür" value={form.type} onChangeText={(t) => setForm({ ...form, type: t })} />
              <View style={styles.modalButtons}>
                <Pressable style={[styles.btn, { backgroundColor: '#FFD1DC' }]} onPress={closeModal}><Text style={{ color: '#DB7093', fontWeight: 'bold' }}>İptal</Text></Pressable>
                <Pressable style={[styles.btn, { backgroundColor: '#DB7093' }]} onPress={handleSave}><Text style={{ color: 'white', fontWeight: 'bold' }}>Kaydet</Text></Pressable>
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
  searchBar:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, elevation: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  searchInput:     { flex: 1, fontSize: 13, color: '#4A4A4A', padding: 0 },
  resultCount:     { fontSize: 12, color: '#a07088', marginBottom: 6, marginLeft: 2 },
  countText:       { fontSize: 11, color: '#c0a0b0', marginBottom: 6, marginLeft: 2 },
  listContent:     { paddingBottom: 80 },
  loadingMore:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText: { fontSize: 12, color: '#DB7093' },
  card:            { flex: 1, margin: 6, backgroundColor: 'white', borderRadius: 18, elevation: 4, overflow: 'hidden' },
  poster:          { width: '100%', height: 210, resizeMode: 'cover', backgroundColor: '#FFE0EB' },
  cardTitle:       { padding: 8, textAlign: 'center', fontWeight: 'bold', color: '#4A4A4A', fontSize: 12 },
  imdbBadge:       { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  imdbText:        { color: '#DB7093', fontWeight: 'bold', fontSize: 11 },
  editBtn:         { position: 'absolute', bottom: 38, right: 8, backgroundColor: '#DB7093', padding: 6, borderRadius: 14 },
  fab:             { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#DB7093', width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalContent:    { margin: 20, backgroundColor: '#FFF5F7', borderRadius: 30, padding: 25, alignItems: 'center', maxHeight: '80%', borderWidth: 2, borderColor: '#FFD1DC' },
  modalHeader:     { fontSize: 22, fontWeight: 'bold', color: '#DB7093', marginBottom: 20 },
  input:           { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFD1DC', width: '100%' },
  modalButtons:    { flexDirection: 'row', gap: 10 },
  btn:             { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
});