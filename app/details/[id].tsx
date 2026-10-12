// app/details/[id].tsx — Netflix dark tema + watch providers + fullscreen trailer

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Image, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, ToastAndroid,
  TouchableOpacity, View,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  getCredits, getDetail, getSimilar, getVideos,
  MediaType, TMDB_IMAGE, tmdbToItem, API_KEY,
} from '../../services/tmdb';
import { useI18n } from '../../hooks/useI18n';
import { C, Radius, Spacing } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
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
interface WatchProvider {
  provider_id: number; provider_name: string; logo_path: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SkeletonBox({ width, height, borderRadius = 8, opacity }: {
  width: number | string; height: number; borderRadius?: number;
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View style={{
      width: width as any, height, borderRadius,
      backgroundColor: C.surfaceHigh, opacity, marginBottom: 6,
    }} />
  );
}

const showToast = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function DetailsScreen() {
  const {
    id, title, trailer, year, type, img,
    backdrop: backdropParam, overview: overviewParam,
    mediaType: mediaTypeParam,
  } = useLocalSearchParams();

  const router = useRouter();
  const { t }  = useI18n();

  const mediaType: MediaType = (mediaTypeParam as string) === 'tv' ? 'tv' : 'movie';
  const isTV = mediaType === 'tv';

  // ── State ──────────────────────────────────────────────────────────────────
  const [trailerModal, setTrailerModal]   = useState(false);
  const [playing, setPlaying]             = useState(false);
  const [isFavorite, setIsFavorite]       = useState(false);
  const [isWatchlist, setIsWatchlist]     = useState(false);
  const [loading, setLoading]             = useState(true);
  const [overview, setOverview]           = useState((overviewParam as string) || '');
  const [voteAverage, setVoteAverage]     = useState('');
  const [actors, setActors]               = useState<Actor[]>([]);
  const [similarItems, setSimilarItems]   = useState<SimilarItem[]>([]);
  const [trailerKey, setTrailerKey]       = useState((trailer as string) || '');
  const [seasons, setSeasons]             = useState(0);
  const [providers, setProviders]         = useState<WatchProvider[]>([]);
  const [providerLink, setProviderLink]   = useState('');
  const [heroImg, setHeroImg]             = useState(
    (backdropParam as string) || (img as string) || ''
  );

  // ── Skeleton animasyonu ────────────────────────────────────────────────────
  const anim            = useRef(new Animated.Value(0)).current;
  const skeletonOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] });

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
    await Promise.all([checkStatus(), fetchTMDB()]);
    setLoading(false);
  };

  const checkStatus = async () => {
    try {
      const [favData, watchData] = await Promise.all([
        AsyncStorage.getItem('favorites_data'),
        AsyncStorage.getItem('watchlist_data'),
      ]);
      const favs:  FavoriteItem[]  = favData   ? JSON.parse(favData)   : [];
      const watch: WatchlistItem[] = watchData ? JSON.parse(watchData) : [];
      setIsFavorite(favs.some(f => f.id === id));
      setIsWatchlist(watch.some(w => w.id === id));
    } catch (e) { console.error(e); }
  };

  const fetchTMDB = async () => {
    try {
      const tmdbId = parseInt(id as string);
      if (isNaN(tmdbId)) return;

      const [detail, credits, similar, video, provRes] = await Promise.all([
        getDetail(tmdbId, mediaType),
        getCredits(tmdbId, mediaType),
        getSimilar(tmdbId, mediaType),
        getVideos(tmdbId, mediaType),
        fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/watch/providers?api_key=${API_KEY}`),
      ]);

      if (detail?.overview)                  setOverview(detail.overview);
      if (detail?.vote_average)              setVoteAverage(detail.vote_average.toFixed(1));
      if (isTV && detail?.number_of_seasons) setSeasons(detail.number_of_seasons);
      if (detail?.backdrop_path)             setHeroImg(`https://image.tmdb.org/t/p/w1280${detail.backdrop_path}`);
      if (credits?.length)                   setActors(credits.slice(0, 10));
      if (similar?.length)                   setSimilarItems(
        similar.slice(0, 10).map((m: any) => tmdbToItem(m, mediaType)) as SimilarItem[]
      );
      if (video) setTrailerKey(video);

      // Watch providers — TR bölgesi önce, yoksa US
      const provData = await provRes.json();
      const region   = provData?.results?.TR ?? provData?.results?.US ?? null;
      if (region) {
        setProviderLink(region.link || '');
        const seen = new Set<number>();
        const all: WatchProvider[] = [
          ...(region.flatrate ?? []),
          ...(region.rent     ?? []),
          ...(region.buy      ?? []),
        ].filter(p => {
          if (seen.has(p.provider_id)) return false;
          seen.add(p.provider_id); return true;
        });
        setProviders(all.slice(0, 8));
      }
    } catch (e) { console.error('TMDB fetch error:', e); }
  };

  const toggleFavorite = async () => {
    try {
      const raw  = await AsyncStorage.getItem('favorites_data');
      let favs: FavoriteItem[] = raw ? JSON.parse(raw) : [];
      if (isFavorite) {
        favs = favs.filter(f => f.id !== id);
        setIsFavorite(false);
        showToast(t('detail.removeFromFavorites'));
      } else {
        favs = [{ id: id as string, title: title as string, trailer: trailerKey,
          year: year as string, type: type as string,
          img: img as string, userRating: 0, mediaType }, ...favs];
        setIsFavorite(true);
        showToast(t('detail.addToFavorites'));
      }
      await AsyncStorage.setItem('favorites_data', JSON.stringify(favs));
    } catch (e) { console.error(e); }
  };

  const toggleWatchlist = async () => {
    try {
      const raw  = await AsyncStorage.getItem('watchlist_data');
      let watch: WatchlistItem[] = raw ? JSON.parse(raw) : [];
      if (isWatchlist) {
        watch = watch.filter(w => w.id !== id);
        setIsWatchlist(false);
        showToast(t('detail.removeFromWatchlist'));
      } else {
        watch = [{ id: id as string, title: title as string, trailer: trailerKey,
          year: year as string, type: type as string,
          img: img as string, mediaType }, ...watch];
        setIsWatchlist(true);
        showToast(t('detail.addToWatchlist'));
      }
      await AsyncStorage.setItem('watchlist_data', JSON.stringify(watch));
    } catch (e) { console.error(e); }
  };

  const openProvider = (link: string) => {
    const url = link || providerLink ||
      `https://www.justwatch.com/tr/search?q=${encodeURIComponent(title as string)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Hata', 'Bağlantı açılamadı.')
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero backdrop ────────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: heroImg }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(20,20,20,0.15)', C.bg]}
            style={styles.heroGradient}
          />

          {/* Geri */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </Pressable>

          {/* Tür etiketi */}
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>
              {isTV ? '📺 Dizi' : '🎬 Film'}
            </Text>
          </View>
        </View>

        {/* ── Başlık + meta ─────────────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>{title}</Text>
          <View style={styles.metaRow}>
            {voteAverage ? (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={11} color="#f39c12" />
                <Text style={styles.metaPillText}>{voteAverage}</Text>
              </View>
            ) : null}
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{year}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{type}</Text>
            </View>
            {isTV && seasons > 0 && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{seasons} {t('detail.seasons')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Aksiyon butonları ─────────────────────────────────────────────── */}
        <View style={styles.actionSection}>
          {/* Fragman */}
          {trailerKey ? (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => { setPlaying(true); setTrailerModal(true); }}
            >
              <Ionicons name="play" size={18} color="black" />
              <Text style={styles.playBtnText}>▶ Fragmanı İzle</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.secondaryBtns}>
            {/* Favorilere */}
            <Pressable
              style={[styles.secondaryBtn, isFavorite && styles.secondaryBtnActive]}
              onPress={toggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? 'white' : C.textSub}
              />
              <Text style={[styles.secondaryBtnText, isFavorite && { color: 'white' }]}>
                {isFavorite ? t('detail.inFavorites') : t('detail.addToFavorites')}
              </Text>
            </Pressable>

            {/* İzleme Listesi */}
            <Pressable
              style={[styles.secondaryBtn, isWatchlist && styles.secondaryBtnWatchlist]}
              onPress={toggleWatchlist}
            >
              <Ionicons
                name={isWatchlist ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isWatchlist ? 'white' : C.textSub}
              />
              <Text style={[styles.secondaryBtnText, isWatchlist && { color: 'white' }]}>
                {isWatchlist ? t('detail.inWatchlist') : t('detail.addToWatchlist')}
              </Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          /* ── Skeleton ──────────────────────────────────────────────────── */
          <View style={{ padding: 20, gap: 8 }}>
            <SkeletonBox width="100%" height={14} opacity={skeletonOpacity} />
            <SkeletonBox width="90%"  height={14} opacity={skeletonOpacity} />
            <SkeletonBox width="80%"  height={14} opacity={skeletonOpacity} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <SkeletonBox width={60} height={60} borderRadius={30} opacity={skeletonOpacity} />
                  <SkeletonBox width={56} height={10} opacity={skeletonOpacity} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* ── Özet ───────────────────────────────────────────────────── */}
            {overview ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('detail.overview') ?? 'Özet'}</Text>
                <Text style={styles.overviewText}>{overview}</Text>
              </View>
            ) : null}

            {/* ── Nereden İzlenir ────────────────────────────────────────── */}
            {providers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎬 Nereden İzlenir?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.providersRow}>
                    {providers.map(p => (
                      <TouchableOpacity
                        key={p.provider_id}
                        style={styles.providerCard}
                        onPress={() => openProvider(providerLink)}
                        accessibilityRole="button"
                        accessibilityLabel={p.provider_name}
                      >
                        <Image
                          source={{ uri: `https://image.tmdb.org/t/p/original${p.logo_path}` }}
                          style={styles.providerLogo}
                        />
                        <Text style={styles.providerName} numberOfLines={2}>
                          {p.provider_name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* JustWatch fallback */}
                    <TouchableOpacity
                      style={[styles.providerCard, styles.justWatchCard]}
                      onPress={() => openProvider('')}
                    >
                      <Ionicons name="search" size={26} color={C.accent} />
                      <Text style={styles.providerName}>Tüm{'\n'}Platformlar</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                <Text style={styles.providerNote}>
                  * Platform bilgileri JustWatch & TMDB kaynaklıdır
                </Text>
              </View>
            )}

            {providers.length === 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎬 Nereden İzlenir?</Text>
                <TouchableOpacity
                  style={styles.justWatchBtn}
                  onPress={() => openProvider('')}
                >
                  <Ionicons name="search-outline" size={18} color={C.text} />
                  <Text style={styles.justWatchBtnText}>
                    JustWatch'ta Ara — {title}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── Oyuncular ──────────────────────────────────────────────── */}
            {actors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎭 {t('detail.cast')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.castRow}>
                    {actors.map(actor => (
                      <View key={actor.id} style={styles.actorCard}>
                        <Image
                          source={{
                            uri: actor.profile_path
                              ? TMDB_IMAGE(actor.profile_path)
                              : `https://i.pravatar.cc/80?u=${actor.id}`,
                          }}
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

            {/* ── Benzer İçerikler ───────────────────────────────────────── */}
            {similarItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {isTV ? `📺 ${t('detail.similarSeries')}` : `🎞️ ${t('detail.similarMovies')}`}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.similarRow}>
                    {similarItems.map(item => (
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

            <View style={{ height: 50 }} />
          </>
        )}
      </ScrollView>

      {/* ── Fragman Modal (fullscreen) ────────────────────────────────────── */}
      <Modal
        visible={trailerModal}
        animationType="fade"
        onRequestClose={() => { setPlaying(false); setTrailerModal(false); }}
      >
        <View style={styles.trailerModal}>
          <Pressable
            style={styles.trailerClose}
            onPress={() => { setPlaying(false); setTrailerModal(false); }}
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </Pressable>
          {trailerKey ? (
            <YoutubePlayer
              height={300}
              play={playing}
              videoId={trailerKey}
              onChangeState={(state: string) => {
                if (state === 'ended') { setPlaying(false); setTrailerModal(false); }
              }}
            />
          ) : (
            <View style={styles.noTrailer}>
              <Ionicons name="film-outline" size={48} color={C.textMuted} />
              <Text style={{ color: C.textMuted, marginTop: 12 }}>
                {t('detail.trailerLoading')}
              </Text>
            </View>
          )}
          <Text style={styles.trailerTitle}>{title}</Text>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Hero
  heroWrap:    { position: 'relative', height: 280 },
  heroImage:   { width: '100%', height: 280, backgroundColor: C.surface },
  heroGradient:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
  backBtn:     { position: 'absolute', top: 48, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  typePill:    { position: 'absolute', top: 48, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  typePillText:{ color: 'white', fontSize: 12, fontWeight: '700' },

  // Başlık
  titleSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  titleText:    { color: C.text, fontSize: 24, fontWeight: 'bold', lineHeight: 30, marginBottom: 10 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surfaceHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  metaPillText: { color: C.textSub, fontSize: 12, fontWeight: '600' },

  // Aksiyon
  actionSection:   { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  playBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.text, paddingVertical: 13, borderRadius: Radius.sm },
  playBtnText:     { color: 'black', fontWeight: 'bold', fontSize: 15 },
  secondaryBtns:   { flexDirection: 'row', gap: 10 },
  secondaryBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.surfaceHigh, paddingVertical: 11, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
  secondaryBtnActive:    { backgroundColor: C.accent, borderColor: C.accent },
  secondaryBtnWatchlist: { backgroundColor: '#1a6b8a', borderColor: '#1a6b8a' },
  secondaryBtnText:      { color: C.textSub, fontSize: 12, fontWeight: '600' },

  // Section
  section:      { marginTop: 8, marginBottom: 4, paddingHorizontal: 16 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  overviewText: { color: C.textSub, fontSize: 14, lineHeight: 22 },

  // Watch providers
  providersRow: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  providerCard: {
    alignItems: 'center', width: 80,
    backgroundColor: C.surface, borderRadius: Radius.md,
    padding: 10, borderWidth: 1, borderColor: C.border,
  },
  justWatchCard: { borderColor: C.accent + '60', borderWidth: 1.5 },
  providerLogo:  { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: C.surfaceHigh, marginBottom: 6 },
  providerName:  { color: C.textSub, fontSize: 10, textAlign: 'center', lineHeight: 13 },
  providerNote:  { color: C.textMuted, fontSize: 10, marginTop: 8, fontStyle: 'italic' },
  justWatchBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, padding: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
  },
  justWatchBtnText: { flex: 1, color: C.text, fontSize: 13, fontWeight: '600' },

  // Cast
  castRow:     { flexDirection: 'row', gap: 14, paddingBottom: 8 },
  actorCard:   { alignItems: 'center', width: 72 },
  actorAvatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.border },
  actorName:   { color: C.text, fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  actorRole:   { color: C.textMuted, fontSize: 10, textAlign: 'center', fontStyle: 'italic' },

  // Similar
  similarRow:     { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  similarCard:    { width: 120, backgroundColor: C.surface, borderRadius: Radius.md, overflow: 'hidden' },
  similarPoster:  { width: '100%', height: 170, backgroundColor: C.surfaceHigh, resizeMode: 'cover' },
  similarImdb:    { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  similarImdbText:{ fontSize: 10, color: 'white', fontWeight: 'bold' },
  similarTitle:   { fontSize: 11, fontWeight: 'bold', color: C.text, padding: 8, paddingBottom: 2 },
  similarYear:    { fontSize: 10, color: C.textMuted, paddingHorizontal: 8, paddingBottom: 8 },

  // Trailer modal
  trailerModal: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  trailerClose: { position: 'absolute', top: 48, right: 16, zIndex: 10 },
  trailerTitle: { color: 'white', textAlign: 'center', marginTop: 20, fontSize: 15, fontWeight: 'bold', paddingHorizontal: 20 },
  noTrailer:    { alignItems: 'center', justifyContent: 'center', flex: 1 },
});