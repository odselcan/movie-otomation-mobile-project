// app/details/[id].tsx
// mediaType='tv' → TV endpointleri | mediaType='movie' → Film endpointleri
// Dizi sayfasından gelirken mediaType='tv' param'ı gönderilmeli

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Image, Platform, Pressable,
  ScrollView, StyleSheet, Text, ToastAndroid,
  TouchableOpacity, View,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  getCredits, getDetail, getSimilar, getVideos,
  MediaType, TMDB_IMAGE, tmdbToItem,
} from '../../services/tmdb';

interface FavoriteItem {
  id: string; title: string; trailer: string; year: string;
  type: string; img: string; userRating: number; mediaType?: string;
}
interface WatchlistItem {
  id: string; title: string; trailer: string; year: string;
  type: string; img: string; mediaType?: string;
}
interface Actor {
  id: number; name: string; character: string; profile_path: string | null;
}
interface SimilarItem {
  id: string; title: string; img: string; imdb: string;
  year: string; type: string; trailer: string; mediaType: string;
}

function SkeletonBox({ width, height, borderRadius = 8, opacity }: {
  width: number | string; height: number; borderRadius?: number;
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View style={{
      width: width as any, height, borderRadius,
      backgroundColor: '#FFD1DC', opacity, marginBottom: 6,
    }} />
  );
}

const showToast = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
};

export default function DetailsScreen() {
  const { id, title, trailer, year, type, img, mediaType: mediaTypeParam } = useLocalSearchParams();
  const router = useRouter();

  // Film mi dizi mi? — series.tsx 'mediaType=tv' gönderir, index.tsx göndermiyor = movie
  const mediaType: MediaType = (mediaTypeParam as string) === 'tv' ? 'tv' : 'movie';
  const isTV = mediaType === 'tv';

  const [playing, setPlaying]             = useState(true);
  const [isFavorite, setIsFavorite]       = useState(false);
  const [isWatchlist, setIsWatchlist]     = useState(false);
  const [loading, setLoading]             = useState(true);
  const [overview, setOverview]           = useState('');
  const [voteAverage, setVoteAverage]     = useState('');
  const [actors, setActors]               = useState<Actor[]>([]);
  const [similarItems, setSimilarItems]   = useState<SimilarItem[]>([]);
  const [trailerKey, setTrailerKey]       = useState((trailer as string) || '');
  const [seasons, setSeasons]             = useState<number>(0);

  const anim = useRef(new Animated.Value(0)).current;
  const skeletonOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    init();
  }, [id]);

  const init = async () => {
    setLoading(true);
    await checkStatus();
    await fetchTMDB();
    setLoading(false);
  };

  const checkStatus = async () => {
    try {
      const favData   = await AsyncStorage.getItem('favorites_data');
      const watchData = await AsyncStorage.getItem('watchlist_data');
      const favs: FavoriteItem[]   = favData   ? JSON.parse(favData)   : [];
      const watch: WatchlistItem[] = watchData ? JSON.parse(watchData) : [];
      setIsFavorite(favs.some((f) => f.id === id));
      setIsWatchlist(watch.some((w) => w.id === id));
    } catch (e) { console.error(e); }
  };

  const fetchTMDB = async () => {
    try {
      const tmdbId = parseInt(id as string);
      if (isNaN(tmdbId)) return;

      // Film mi dizi mi → doğru endpoint
      const [detail, credits, similar, video] = await Promise.all([
        getDetail(tmdbId, mediaType),
        getCredits(tmdbId, mediaType),
        getSimilar(tmdbId, mediaType),
        getVideos(tmdbId, mediaType),
      ]);

      if (detail?.overview) setOverview(detail.overview);
      if (detail?.vote_average) setVoteAverage(detail.vote_average.toFixed(1));
      if (isTV && detail?.number_of_seasons) setSeasons(detail.number_of_seasons);
      if (credits?.length) setActors(credits.slice(0, 8));
      if (similar?.length) setSimilarItems(similar.slice(0, 6).map((m: any) => tmdbToItem(m, mediaType)) as SimilarItem[]);
      if (video) setTrailerKey(video);
    } catch (e) {
      console.error('TMDB fetch error:', e);
    }
  };

  const toggleFavorite = async () => {
    try {
      const favData = await AsyncStorage.getItem('favorites_data');
      let favs: FavoriteItem[] = favData ? JSON.parse(favData) : [];
      if (isFavorite) {
        favs = favs.filter((f) => f.id !== id);
        setIsFavorite(false);
        showToast('💔 Favorilerden çıkarıldı');
      } else {
        favs = [{
          id: id as string, title: title as string, trailer: trailerKey,
          year: year as string, type: type as string, img: img as string,
          userRating: 0, mediaType,
        }, ...favs];
        setIsFavorite(true);
        showToast('💖 Favorilere eklendi');
      }
      await AsyncStorage.setItem('favorites_data', JSON.stringify(favs));
    } catch (e) { console.error(e); }
  };

  const toggleWatchlist = async () => {
    try {
      const watchData = await AsyncStorage.getItem('watchlist_data');
      let watch: WatchlistItem[] = watchData ? JSON.parse(watchData) : [];
      if (isWatchlist) {
        watch = watch.filter((w) => w.id !== id);
        setIsWatchlist(false);
        showToast('📝 İzleme listesinden çıkarıldı');
      } else {
        watch = [{
          id: id as string, title: title as string, trailer: trailerKey,
          year: year as string, type: type as string, img: img as string, mediaType,
        }, ...watch];
        setIsWatchlist(true);
        showToast('✅ İzleme listesine eklendi');
      }
      await AsyncStorage.setItem('watchlist_data', JSON.stringify(watch));
    } catch (e) { console.error(e); }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* HEADER */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#DB7093" />
          <Text style={styles.backText}>Geri Dön</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isTV ? '📺 Dizi Detayı' : '🎬 Film Detayı'}</Text>
      </View>

      {/* FRAGMAN */}
      <View style={styles.videoContainer}>
        {trailerKey ? (
          <YoutubePlayer
            height={250}
            play={playing}
            videoId={trailerKey}
            onChangeState={(state: string) => { if (state === 'ended') setPlaying(false); }}
          />
        ) : (
          <View style={styles.noTrailer}>
            <Ionicons name="film-outline" size={40} color="#FFD1DC" />
            <Text style={styles.noTrailerText}>Fragman yükleniyor...</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 8 }}>
          <SkeletonBox width="70%" height={28} opacity={skeletonOpacity} />
          <SkeletonBox width="40%" height={16} opacity={skeletonOpacity} />
          <SkeletonBox width="100%" height={14} opacity={skeletonOpacity} />
          <SkeletonBox width="90%"  height={14} opacity={skeletonOpacity} />
          <SkeletonBox width="80%"  height={14} opacity={skeletonOpacity} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <SkeletonBox width={62} height={62} borderRadius={31} opacity={skeletonOpacity} />
                <SkeletonBox width={60} height={10} opacity={skeletonOpacity} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} width={110} height={150} borderRadius={16} opacity={skeletonOpacity} />
            ))}
          </View>
        </View>
      ) : (
        <>
          {/* BİLGİ KARTI */}
          <View style={styles.infoCard}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{year}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.genreText}>🎭 {type}</Text>
              <View style={styles.metaRight}>
                {voteAverage ? (
                  <View style={styles.imdbBadge}>
                    <Ionicons name="star" size={12} color="#f39c12" />
                    <Text style={styles.imdbText}>{voteAverage}</Text>
                  </View>
                ) : null}
                {isTV && seasons > 0 ? (
                  <View style={styles.seasonBadge}>
                    <Text style={styles.seasonText}>📺 {seasons} Sezon</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.descriptionText}>
              {overview || 'Bu içerik için açıklama bulunamadı.'}
            </Text>
          </View>

          {/* FAVORİ & WATCHLIST */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, isFavorite && styles.actionBtnActive]}
              onPress={toggleFavorite}
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22}
                color={isFavorite ? 'white' : '#DB7093'} />
              <Text style={[styles.actionBtnText, isFavorite && styles.actionBtnTextActive]}>
                {isFavorite ? 'Favoride' : 'Favorilere Ekle'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, isWatchlist && styles.actionBtnActive]}
              onPress={toggleWatchlist}
            >
              <Ionicons name={isWatchlist ? 'bookmark' : 'bookmark-outline'} size={22}
                color={isWatchlist ? 'white' : '#DB7093'} />
              <Text style={[styles.actionBtnText, isWatchlist && styles.actionBtnTextActive]}>
                {isWatchlist ? 'Listede' : 'Listeye Ekle'}
              </Text>
            </Pressable>
          </View>

          {/* OYUNCULAR */}
          {actors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎬 Oyuncular</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.actorsRow}>
                  {actors.map((actor) => (
                    <View key={actor.id} style={styles.actorCard}>
                      <Image
                        source={{ uri: actor.profile_path ? TMDB_IMAGE(actor.profile_path) : `https://i.pravatar.cc/80?u=${actor.id}` }}
                        style={styles.actorAvatar}
                      />
                      <Text style={styles.actorName} numberOfLines={2}>{actor.name}</Text>
                      <Text style={styles.actorRole} numberOfLines={1}>{actor.character}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* BENZERİ İÇERİKLER */}
          {similarItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isTV ? '📺 Benzer Diziler' : '🎞️ Benzer Filmler'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.similarRow}>
                  {similarItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.similarCard}
                      onPress={() =>
                        router.replace({
                          pathname: '/details/[id]',
                          params: {
                            id: item.id, title: item.title, trailer: item.trailer,
                            year: item.year, type: item.type, img: item.img,
                            mediaType: item.mediaType,
                          },
                        })
                      }
                    >
                      <Image source={{ uri: item.img }} style={styles.similarPoster} />
                      <View style={styles.similarImdb}>
                        <Text style={styles.similarImdbText}>⭐ {item.imdb}</Text>
                      </View>
                      <Text style={styles.similarTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.similarYear}>{item.year}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={{ height: 40 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FFF5F7' },
  headerBar:   { paddingTop: 50, paddingHorizontal: 15, paddingBottom: 15, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#DB7093' },
  backButton:  { flexDirection: 'row', alignItems: 'center' },
  backText:    { color: '#DB7093', fontWeight: 'bold', marginLeft: 5 },
  videoContainer: { width: '100%', backgroundColor: '#000' },
  noTrailer:   { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  noTrailerText: { color: '#FFD1DC', marginTop: 8, fontSize: 13 },
  infoCard:    { margin: 16, padding: 20, backgroundColor: 'white', borderRadius: 25, elevation: 3, shadowColor: '#DB7093', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  titleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  titleText:   { fontSize: 22, fontWeight: 'bold', color: '#4A4A4A', flex: 1, lineHeight: 28 },
  badge:       { backgroundColor: '#DB7093', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText:   { color: 'white', fontWeight: 'bold', fontSize: 12 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  metaRight:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  genreText:   { fontSize: 15, color: '#DB7093' },
  imdbBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF5F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1DC' },
  imdbText:    { fontSize: 13, color: '#f39c12', fontWeight: 'bold' },
  seasonBadge: { backgroundColor: '#FFF5F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1DC' },
  seasonText:  { fontSize: 12, color: '#DB7093', fontWeight: '600' },
  divider:     { height: 1, backgroundColor: '#FFE4E1', marginVertical: 10 },
  descriptionText: { fontSize: 14, color: '#777', lineHeight: 22 },
  actionRow:   { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 8 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#DB7093', backgroundColor: 'white' },
  actionBtnActive:     { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  actionBtnText:       { color: '#DB7093', fontWeight: 'bold', fontSize: 13 },
  actionBtnTextActive: { color: 'white' },
  section:      { marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#DB7093', marginLeft: 16, marginBottom: 12 },
  actorsRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 14 },
  actorCard:    { alignItems: 'center', width: 72 },
  actorAvatar:  { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#FFD1DC', backgroundColor: '#FFE0EB' },
  actorName:    { fontSize: 11, fontWeight: '600', color: '#4A4A4A', marginTop: 6, textAlign: 'center' },
  actorRole:    { fontSize: 10, color: '#DB7093', textAlign: 'center', fontStyle: 'italic' },
  similarRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  similarCard:  { width: 110, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', elevation: 3 },
  similarPoster: { width: '100%', height: 150, backgroundColor: '#FFE0EB', resizeMode: 'cover' },
  similarImdb:  { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  similarImdbText: { fontSize: 10, color: '#DB7093', fontWeight: 'bold' },
  similarTitle: { fontSize: 11, fontWeight: 'bold', color: '#4A4A4A', padding: 8, paddingBottom: 2 },
  similarYear:  { fontSize: 10, color: '#aaa', paddingHorizontal: 8, paddingBottom: 8 },
});