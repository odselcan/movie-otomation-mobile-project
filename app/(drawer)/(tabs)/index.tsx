// app/(drawer)/(tabs)/index.tsx
// i18n: Türkçe / İngilizce tam dil desteği eklendi

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image,
  KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SkeletonPoster } from '../../../components/SkeletonCard';
import { useI18n } from '../../../hooks/useI18n'; // ← i18n import

interface Movie {
  id: string; title: string; img: string;
  imdb: string; year: string; type: string; trailer: string;
}

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const STORAGE_KEY = 'movies_data_v7';

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

function isSafe(item: any): boolean {
  if (item.adult) return false;
  if (!item.poster_path) return false;
  if (item.vote_average < 7.0) return false;
  if (item.vote_count < 1000) return false;
  if (BLOCKED_IDS.has(item.id)) return false;
  if (item.genre_ids?.includes(10749) && item.genre_ids?.length === 1) return false;
  return true;
}

function tmdbToMovie(item: any): Movie {
  return {
    id: String(item.id),
    title: item.title ?? 'Bilinmiyor',
    img: `${IMAGE_BASE}${item.poster_path}`,
    imdb: item.vote_average?.toFixed(1) ?? '0.0',
    year: (item.release_date ?? '').slice(0, 4),
    type: item.genre_ids?.[0] ? (GENRE_MAP[item.genre_ids[0]] ?? 'Film') : 'Film',
    trailer: '',
  };
}

const extractYoutubeId = (input: string): string => {
  const match = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : input;
};

export default function MoviesScreen() {
  const router = useRouter();
  const { t } = useI18n(); // ← hook

  const [movies, setMovies]               = useState<Movie[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching]         = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [editingItem, setEditingItem]     = useState<Movie | null>(null);
  const [form, setForm]                   = useState<Omit<Movie, 'id'>>({
    title: '', img: '', trailer: '', imdb: '', type: '', year: '',
  });

  const [shakeModal, setShakeModal]       = useState(false);
  const [suggestedFilm, setSuggestedFilm] = useState<Movie | null>(null);
  const lastShakeTime                     = useRef(0);
  const scaleAnim                         = useRef(new Animated.Value(0)).current;
  const shakeHint                         = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeHint, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(shakeHint, { toValue: 1.0,  duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Accelerometer.setUpdateInterval(200);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const total = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (total > 1.8 && now - lastShakeTime.current > 1500) {
        lastShakeTime.current = now;
        handleShake();
      }
    });
    return () => sub.remove();
  }, [movies]);

  const handleShake = () => {
    if (movies.length === 0) return;
    const random = movies[Math.floor(Math.random() * movies.length)];
    setSuggestedFilm(random);
    setShakeModal(true);
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1, useNativeDriver: true,
      friction: 5, tension: 100,
    }).start();
  };

  useEffect(() => { loadMovies(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') { setSearchResults([]); return; }
    const timer = setTimeout(() => searchMovies(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMovies = async () => {
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = cached ? JSON.parse(cached) : null;
      if (parsed && parsed.length > 0) { setMovies(parsed); setLoading(false); return; }
      await fetchPage(1, true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
      const all = [...(d1.results ?? []), ...(d2.results ?? [])].filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      const newItems = all.filter(isSafe).map(tmdbToMovie);
      const updated = reset ? newItems : [...movies, ...newItems];
      setMovies(updated);
      setPage(pageNum);
      setHasMore(pageNum < 3);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      Alert.alert(t('common.error'), t('media.loadError')); // ← çevrildi
    } finally { setLoadingMore(false); }
  };

  const searchMovies = async (query: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=tr-TR&query=${encodeURIComponent(query)}&page=1&include_adult=false&region=US`
      );
      const data = await res.json();
      setSearchResults((data.results ?? []).filter(isSafe).map(tmdbToMovie).slice(0, 40));
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSave = async () => {
    if (!form.title) return Alert.alert(
      t('common.warning'),       // ← çevrildi
      t('media.titleRequired'),  // ← çevrildi
    );
    const cleaned = { ...form, trailer: extractYoutubeId(form.trailer) };
    const updated = editingItem
      ? movies.map(m => m.id === editingItem.id ? { ...cleaned, id: m.id } : m)
      : [{ ...cleaned, id: Date.now().toString() }, ...movies];
    setMovies(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false); setEditingItem(null);
    setForm({ title: '', img: '', trailer: '', imdb: '', type: '', year: '' });
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const displayData  = isSearchMode ? searchResults : movies;

  return (
    <View style={styles.container}>

      {/* Arama + Shake Butonu */}
      <View style={styles.topRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#DB7093" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('media.searchPlaceholder')} // ← çevrildi
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

        <Animated.View style={{ transform: [{ scale: shakeHint }] }}>
          <TouchableOpacity
            style={styles.shakeBtn}
            onPress={handleShake}
            accessibilityLabel={t('media.randomSuggestion')}
            accessibilityRole="button"
          >
            <Text style={styles.shakeBtnEmoji}>🎲</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Shake ipucu */}
      {!isSearchMode && !loading && (
        <Text style={styles.shakeHintText}>{t('media.shakeHint')}</Text> // ← çevrildi
      )}

      {/* Sonuç sayısı */}
      {isSearchMode && (
        <Text style={styles.resultCount}>
          {searchResults.length} {t('media.resultsFound')} — "{searchQuery}" // ← çevrildi
        </Text>
      )}
      {!isSearchMode && !loading && (
        <Text style={styles.countText}>
          {movies.length} {t('media.moviesCount')} // ← çevrildi
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
                  {t('common.loadingMore')} // ← çevrildi
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                onPress={() => router.push({
                  pathname: '/details/[id]',
                  params: {
                    id: item.id, title: item.title, trailer: item.trailer,
                    year: item.year, type: item.type, img: item.img, mediaType: 'movie',
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
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={t('media.add')}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Shake Modal */}
      <Modal visible={shakeModal} transparent animationType="fade">
        <Pressable style={styles.shakeOverlay} onPress={() => setShakeModal(false)}>
          <Animated.View style={[styles.shakeSheet, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable>
              <Text style={styles.shakeTitle}>{t('media.randomSuggestion')}</Text>         // ← çevrildi
              <Text style={styles.shakeSubTitle}>{t('media.shakeSubtitle')}</Text>         // ← çevrildi

              {suggestedFilm && (
                <>
                  <Image source={{ uri: suggestedFilm.img }} style={styles.shakePoster} />
                  <Text style={styles.shakeFilmTitle}>{suggestedFilm.title}</Text>
                  <View style={styles.shakeMetaRow}>
                    <View style={styles.shakeMeta}>
                      <Text style={styles.shakeMetaText}>⭐ {suggestedFilm.imdb}</Text>
                    </View>
                    <View style={styles.shakeMeta}>
                      <Text style={styles.shakeMetaText}>🎬 {suggestedFilm.type}</Text>
                    </View>
                    <View style={styles.shakeMeta}>
                      <Text style={styles.shakeMetaText}>📅 {suggestedFilm.year}</Text>
                    </View>
                  </View>

                  <View style={styles.shakeBtnRow}>
                    <TouchableOpacity
                      style={styles.shakeWatchBtn}
                      onPress={() => {
                        setShakeModal(false);
                        router.push({
                          pathname: '/details/[id]',
                          params: {
                            id: suggestedFilm.id, title: suggestedFilm.title,
                            trailer: suggestedFilm.trailer, year: suggestedFilm.year,
                            type: suggestedFilm.type, img: suggestedFilm.img, mediaType: 'movie',
                          },
                        });
                      }}
                    >
                      <Ionicons name="play-circle-outline" size={18} color="white" />
                      <Text style={styles.shakeWatchBtnText}>{t('media.seeDetails')}</Text> // ← çevrildi
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shakeAgainBtn}
                      onPress={() => {
                        const random = movies[Math.floor(Math.random() * movies.length)];
                        setSuggestedFilm(random);
                        scaleAnim.setValue(0.8);
                        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
                      }}
                    >
                      <Ionicons name="refresh-outline" size={18} color="#DB7093" />
                      <Text style={styles.shakeAgainBtnText}>{t('media.suggestAgain')}</Text> // ← çevrildi
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Film Ekle/Düzenle Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.modalHeader}>
                {editingItem ? t('media.edit') : t('media.add')} // ← çevrildi
              </Text>
              <TextInput style={styles.input} placeholder={t('media.movieName')} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
              <TextInput style={styles.input} placeholder={t('media.imageUrl')} value={form.img} onChangeText={(v) => setForm({ ...form, img: v })} />
              <TextInput style={styles.input} placeholder={t('media.youtubeLink')} value={form.trailer} onChangeText={(v) => setForm({ ...form, trailer: v })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="IMDb" value={form.imdb} onChangeText={(v) => setForm({ ...form, imdb: v })} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('media.year')} value={form.year} onChangeText={(v) => setForm({ ...form, year: v })} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder={t('media.genre')} value={form.type} onChangeText={(v) => setForm({ ...form, type: v })} />
              <View style={styles.modalButtons}>
                <Pressable style={[styles.btn, { backgroundColor: '#FFD1DC' }]} onPress={closeModal}>
                  <Text style={{ color: '#DB7093', fontWeight: 'bold' }}>{t('common.cancel')}</Text> // ← çevrildi
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: '#DB7093' }]} onPress={handleSave}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common.save')}</Text>    // ← çevrildi
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
  container:        { flex: 1, backgroundColor: '#FFF5F7', paddingHorizontal: 10, paddingTop: 10 },
  topRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  searchBar:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, elevation: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  searchInput:      { flex: 1, fontSize: 13, color: '#4A4A4A', padding: 0 },
  shakeBtn:         { width: 46, height: 46, borderRadius: 14, backgroundColor: '#DB7093', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  shakeBtnEmoji:    { fontSize: 22 },
  shakeHintText:    { fontSize: 11, color: '#c0a0b0', marginBottom: 6, marginLeft: 2, textAlign: 'center' },
  resultCount:      { fontSize: 12, color: '#a07088', marginBottom: 6, marginLeft: 2 },
  countText:        { fontSize: 11, color: '#c0a0b0', marginBottom: 6, marginLeft: 2 },
  listContent:      { paddingBottom: 80 },
  loadingMore:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText:  { fontSize: 12, color: '#DB7093' },
  card:             { flex: 1, margin: 6, backgroundColor: 'white', borderRadius: 18, elevation: 4, overflow: 'hidden' },
  poster:           { width: '100%', height: 210, resizeMode: 'cover', backgroundColor: '#FFE0EB' },
  cardTitle:        { padding: 8, textAlign: 'center', fontWeight: 'bold', color: '#4A4A4A', fontSize: 12 },
  imdbBadge:        { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  imdbText:         { color: '#DB7093', fontWeight: 'bold', fontSize: 11 },
  editBtn:          { position: 'absolute', bottom: 38, right: 8, backgroundColor: '#DB7093', padding: 6, borderRadius: 14 },
  fab:              { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#DB7093', width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  shakeOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  shakeSheet:       { backgroundColor: 'white', borderRadius: 28, padding: 24, width: '100%', alignItems: 'center', elevation: 20, borderWidth: 2, borderColor: '#FFD1DC' },
  shakeTitle:       { fontSize: 22, fontWeight: 'bold', color: '#DB7093', marginBottom: 4 },
  shakeSubTitle:    { fontSize: 12, color: '#aaa', marginBottom: 16 },
  shakePoster:      { width: 140, height: 200, borderRadius: 16, resizeMode: 'cover', marginBottom: 16, backgroundColor: '#FFE0EB' },
  shakeFilmTitle:   { fontSize: 18, fontWeight: 'bold', color: '#4A4A4A', textAlign: 'center', marginBottom: 12 },
  shakeMetaRow:     { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' },
  shakeMeta:        { backgroundColor: '#FFF5F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1DC' },
  shakeMetaText:    { fontSize: 12, color: '#DB7093', fontWeight: '600' },
  shakeBtnRow:      { flexDirection: 'row', gap: 10, width: '100%' },
  shakeWatchBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#DB7093', paddingVertical: 13, borderRadius: 16 },
  shakeWatchBtnText:{ color: 'white', fontWeight: 'bold', fontSize: 14 },
  shakeAgainBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF0F4', paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFD1DC' },
  shakeAgainBtnText:{ color: '#DB7093', fontWeight: 'bold', fontSize: 14 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalContent:     { margin: 20, backgroundColor: '#FFF5F7', borderRadius: 30, padding: 25, alignItems: 'center', maxHeight: '80%', borderWidth: 2, borderColor: '#FFD1DC' },
  modalHeader:      { fontSize: 22, fontWeight: 'bold', color: '#DB7093', marginBottom: 20 },
  input:            { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFD1DC', width: '100%' },
  modalButtons:     { flexDirection: 'row', gap: 10 },
  btn:              { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
});