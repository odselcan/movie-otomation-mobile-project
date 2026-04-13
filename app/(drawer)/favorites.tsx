

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MediaCard from '../../components/MediaCard';
import Pagination from '../../components/Pagination';
import RatingModal from '../../components/RatingModal';
import SearchBar from '../../components/SearchBar';
import { MediaItem, useMediaStorage } from '../../hooks/useStorage';

type SortKey = 'addedAt' | 'userRating' | 'title' | 'year';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'addedAt',    label: '🕐 Eklenme' },
  { key: 'userRating', label: '⭐ Puan'    },
  { key: 'title',      label: '🔤 İsim'    },
  { key: 'year',       label: '📅 Yıl'     },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { items, loading, error, load, upsert, remove, searchItems, getPage } =
    useMediaStorage('favorites_data');

  
  const [searchQuery, setSearchQuery]     = useState('');
  const [sortKey, setSortKey]             = useState<SortKey>('addedAt');
  const [currentPage, setCurrentPage]     = useState(0);
  const [ratingModal, setRatingModal]     = useState(false);
  const [selectedItem, setSelectedItem]   = useState<MediaItem | null>(null);

  
  useFocusEffect(
    useCallback(() => {
      load();
      setCurrentPage(0);
    }, [load])
  );

 
  const filteredSorted = useMemo(() => {
    const searched = searchItems(searchQuery, items);
    return [...searched].sort((a, b) => {
      switch (sortKey) {
        case 'userRating': return b.userRating - a.userRating;
        case 'title':      return a.title.localeCompare(b.title, 'tr');
        case 'year':       return b.year.localeCompare(a.year);
        default:           return (b.addedAt || '').localeCompare(a.addedAt || '');
      }
    });
  }, [items, searchQuery, sortKey, searchItems]);


  const { data: pageData, totalPages, currentPage: safePage } = getPage(filteredSorted, currentPage);

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
  };

  
  const confirmRemove = (item: MediaItem) => {
    Alert.alert(
      'Favoriden Çıkar',
      `"${item.title}" favorilerden kaldırılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            remove(item.id);
            // Sayfa boşalırsa bir önceki sayfaya git
            if (pageData.length === 1 && currentPage > 0) {
              setCurrentPage(currentPage - 1);
            }
          },
        },
      ]
    );
  };

  const openRating = (item: MediaItem) => {
    setSelectedItem(item);
    setRatingModal(true);
  };


  const saveRating = async (rating: number, note: string) => {
    if (!selectedItem) return;
    await upsert({ ...selectedItem, userRating: rating, userNote: note });
    setRatingModal(false);
    setSelectedItem(null);
  };

  
  const handleSort = (key: SortKey) => {
    setSortKey(key);
    setCurrentPage(0);
  };

  
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(0);
  };

 
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#DB7093" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Film veya dizi ara..."
      />

      
      {searchQuery.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredSorted.length} sonuç bulundu
        </Text>
      )}

     
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.sortBtn, sortKey === opt.key && styles.sortBtnActive]}
            onPress={() => handleSort(opt.key)}
          >
            <Text style={[styles.sortText, sortKey === opt.key && styles.sortTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      
      {filteredSorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {searchQuery ? '🔍' : '💔'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz favori eklenmedi'}
          </Text>
          {/* Nielsen #10: Kullanıcıyı yönlendiren açıklama */}
          <Text style={styles.emptySubText}>
            {searchQuery
              ? `"${searchQuery}" için eşleşme yok. Aramayı değiştir.`
              : 'Film veya dizi detay sayfasından ❤️ butonuna basın'}
          </Text>
        </View>
      ) : (
        <>
          {/* ── LIST — FlatList + MediaCard ─────────────────── */}
          <FlatList
            data={pageData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/details/[id]',
                    params: {
                      id: item.id,
                      title: item.title,
                      trailer: item.trailer,
                      year: item.year,
                      type: item.type,
                      img: item.img,
                    },
                  })
                }
                onRate={() => openRating(item)}
                onRemove={() => confirmRemove(item)}
                removeIcon="heart-dislike-outline"
                removeColor="#DB7093"
              />
            )}
          />

          
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />

         
          <Text style={styles.pageInfo}>
            {filteredSorted.length} favori  •  Sayfa {safePage + 1}/{totalPages}
          </Text>
        </>
      )}

      
      <RatingModal
        visible={ratingModal}
        title={selectedItem?.title ?? ''}
        initialRating={selectedItem?.userRating ?? 0}
        initialNote={selectedItem?.userNote ?? ''}
        onSave={saveRating}
        onClose={() => { setRatingModal(false); setSelectedItem(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#DB7093', fontSize: 14 },

  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 15, color: '#e74c3c', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#DB7093',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  resultCount: {
    fontSize: 12,
    color: '#a07088',
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD1DC',
    backgroundColor: 'white',
  },
  sortBtnActive: { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  sortText: { fontSize: 12, color: '#DB7093' },
  sortTextActive: { color: 'white', fontWeight: 'bold' },

  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#DB7093', marginBottom: 8 },
  emptySubText: { fontSize: 13, color: '#c0a0b0', textAlign: 'center', lineHeight: 20 },

  pageInfo: {
    textAlign: 'center',
    fontSize: 11,
    color: '#c0a0b0',
    paddingBottom: 12,
  },
});