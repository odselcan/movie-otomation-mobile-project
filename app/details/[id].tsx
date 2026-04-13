import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface FavoriteItem {
  id: string;
  title: string;
  trailer: string;
  year: string;
  type: string;
  img: string;
  userRating: number;
}

interface WatchlistItem {
  id: string;
  title: string;
  trailer: string;
  year: string;
  type: string;
  img: string;
}

const showToast = (msg: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
};

export default function DetailsScreen() {
  const { id, title, trailer, year, type, img } = useLocalSearchParams();
  const router = useRouter();
  const [playing, setPlaying] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatchlist, setIsWatchlist] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const favData = await AsyncStorage.getItem('favorites_data');
      const watchData = await AsyncStorage.getItem('watchlist_data');
      const favs: FavoriteItem[] = favData ? JSON.parse(favData) : [];
      const watch: WatchlistItem[] = watchData ? JSON.parse(watchData) : [];
      setIsFavorite(favs.some((f) => f.id === id));
      setIsWatchlist(watch.some((w) => w.id === id));
    } catch (e) {
      console.error(e);
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
        const newFav: FavoriteItem = {
          id: id as string,
          title: title as string,
          trailer: trailer as string,
          year: year as string,
          type: type as string,
          img: img as string,
          userRating: 0,
        };
        favs = [newFav, ...favs];
        setIsFavorite(true);
        showToast('💖 Favorilere eklendi');
      }

      await AsyncStorage.setItem('favorites_data', JSON.stringify(favs));
    } catch (e) {
      console.error(e);
    }
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
        const newItem: WatchlistItem = {
          id: id as string,
          title: title as string,
          trailer: trailer as string,
          year: year as string,
          type: type as string,
          img: img as string,
        };
        watch = [newItem, ...watch];
        setIsWatchlist(true);
        showToast('✅ İzleme listesine eklendi');
      }

      await AsyncStorage.setItem('watchlist_data', JSON.stringify(watch));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#DB7093" />
          <Text style={styles.backText}>Geri Dön</Text>
        </Pressable>
        <Text style={styles.headerTitle}>İçerik Detayları</Text>
      </View>

      <View style={styles.videoContainer}>
        <YoutubePlayer
          height={250}
          play={playing}
          videoId={(trailer as string) || 'YoHD9XEInc0'}
          onChangeState={(state: string) => {
            if (state === 'ended') setPlaying(false);
          }}
        />
      </View>

      <View style={styles.infoCard}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{year}</Text>
          </View>
        </View>
        <Text style={styles.genreText}>🎭 {type}</Text>
        <View style={styles.divider} />
        <Text style={styles.descriptionText}>Toz pembe dünyamızda fragman keyfi! ✨</Text>
      </View>

      {/* Favori & Watchlist Butonları */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, isFavorite && styles.actionBtnActive]}
          onPress={toggleFavorite}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? 'white' : '#DB7093'}
          />
          <Text style={[styles.actionBtnText, isFavorite && styles.actionBtnTextActive]}>
            {isFavorite ? 'Favoride' : 'Favorilere Ekle'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, isWatchlist && styles.actionBtnActive]}
          onPress={toggleWatchlist}
        >
          <Ionicons
            name={isWatchlist ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isWatchlist ? 'white' : '#DB7093'}
          />
          <Text style={[styles.actionBtnText, isWatchlist && styles.actionBtnTextActive]}>
            {isWatchlist ? 'Listede' : 'Listeye Ekle'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  headerBar: {
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#DB7093' },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#DB7093', fontWeight: 'bold', marginLeft: 5 },
  videoContainer: { width: '100%', backgroundColor: '#000' },
  infoCard: { margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 25 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleText: { fontSize: 24, fontWeight: 'bold', color: '#4A4A4A', flex: 1 },
  badge: { backgroundColor: '#DB7093', padding: 6, borderRadius: 10 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  genreText: { fontSize: 16, color: '#DB7093', marginVertical: 10 },
  divider: { height: 1, backgroundColor: '#FFE4E1', marginVertical: 10 },
  descriptionText: { fontSize: 15, color: '#777', lineHeight: 22 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DB7093',
    backgroundColor: 'white',
  },
  actionBtnActive: {
    backgroundColor: '#DB7093',
    borderColor: '#DB7093',
  },
  actionBtnText: {
    color: '#DB7093',
    fontWeight: 'bold',
    fontSize: 13,
  },
  actionBtnTextActive: {
    color: 'white',
  },
});