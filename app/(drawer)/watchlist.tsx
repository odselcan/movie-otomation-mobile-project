// app/(drawer)/watchlist.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, FlatList, Pressable, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';

import MediaCard from '../../components/MediaCard';
import Pagination from '../../components/Pagination';
import RatingModal from '../../components/RatingModal';
import SearchBar from '../../components/SearchBar';
import SkeletonCard from '../../components/SkeletonCard';
import { MediaItem, useMediaStorage } from '../../hooks/useStorage';

type SortKey = 'addedAt' | 'title' | 'year';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'addedAt', label: '🕐 Eklenme' },
  { key: 'title',   label: '🔤 İsim'    },
  { key: 'year',    label: '📅 Yıl'     },
];

interface WatchlistItem extends MediaItem {
  watched?: boolean;
}

const SKELETON_COUNT = 5;

export default function WatchlistScreen() {
  const router = useRouter();
  const { items, loading, error, load, upsert, remove, searchItems, getPage } =
    useMediaStorage('watchlist_data');

  const [searchQuery, setSearchQuery]     = useState('');
  const [sortKey, setSortKey]             = useState<SortKey>('addedAt');
  const [currentPage, setCurrentPage]     = useState(0);
  const [ratingModal, setRatingModal]     = useState(false);
  const [selectedItem, setSelectedItem]   = useState<WatchlistItem | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
      setCurrentPage(0);
    }, [load])
  );

  const filteredSorted = useMemo(() => {
    let list = searchItems(searchQuery, items) as WatchlistItem[];
    if (showPendingOnly) list = list.filter((i) => !i.watched);
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'title': return a.title.localeCompare(b.title, 'tr');
        case 'year':  return b.year.localeCompare(a.year);
        default:      return (b.addedAt || '').localeCompare(a.addedAt || '');
      }
    });
  }, [items, searchQuery, sortKey, showPendingOnly, searchItems]);

  const { data: pageData, totalPages, currentPage: safePage } = getPage(filteredSorted, currentPage);

  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(0); };
  const handleSort   = (k: SortKey) => { setSortKey(k);    setCurrentPage(0); };

  const toggleWatched = async (item: WatchlistItem) => {
    await upsert({ ...item, watched: !item.watched } as any);
  };

  const confirmRemove = (item: WatchlistItem) => {
    Alert.alert(
      'Listeden Çıkar',
      `"${item.title}" izleme listesinden kaldırılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır', style: 'destructive',
          onPress: () => {
            remove(item.id);
            if (pageData.length === 1 && currentPage > 0) setCurrentPage(currentPage - 1);
          },
        },
      ]
    );
  };

  const openRating = (item: WatchlistItem) => { setSelectedItem(item); setRatingModal(true); };
  const saveRating = async (rating: number, note: string) => {
    if (!selectedItem) return;
    await upsert({ ...selectedItem, userRating: rating, userNote: note });
    setRatingModal(false);
    setSelectedItem(null);
  };

  // SMS
  const sendWatchlistSMS = async () => {
    if (items.length === 0) {
      Alert.alert('Boş Liste', 'İzleme listesi boş.');
      return;
    }
    const available = await SMS.isAvailableAsync();
    if (!available) {
      Alert.alert('Hata', 'Bu cihazda SMS gönderilemıyor.');
      return;
    }

    const watchedItems   = (items as WatchlistItem[]).filter(i => i.watched);
    const pendingItems   = (items as WatchlistItem[]).filter(i => !i.watched);

    const formatItem = (item: WatchlistItem, i: number) =>
      `${i + 1}. ${item.title} (${item.year})${item.userRating > 0 ? ` ⭐${item.userRating}/10` : ''}`;

    let mesaj = `📋 İzleme Listem\n━━━━━━━━━━━━━━━━\n`;

    if (pendingItems.length > 0) {
      mesaj += `⏳ Bekleyenler (${pendingItems.length}):\n`;
      mesaj += pendingItems.slice(0, 10).map(formatItem).join('\n');
      mesaj += '\n\n';
    }

    if (watchedItems.length > 0) {
      mesaj += `✅ İzlenenler (${watchedItems.length}):\n`;
      mesaj += watchedItems.slice(0, 10).map(formatItem).join('\n');
      mesaj += '\n';
    }

    mesaj += `━━━━━━━━━━━━━━━━\nToplam: ${items.length} içerik`;

    await SMS.sendSMSAsync([], mesaj);
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

  const pendingCount = (items as WatchlistItem[]).filter((i) => !i.watched).length;

  return (
    <View style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="İzleme listesinde ara..."
      />

      {searchQuery.length > 0 && (
        <Text style={styles.resultCount}>{filteredSorted.length} sonuç</Text>
      )}

      {/* SORT + FİLTRE + SMS */}
      <View style={styles.controlRow}>
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

        {/* Bekleyen filtresi */}
        <Pressable
          style={[styles.filterBtn, showPendingOnly && styles.filterBtnActive]}
          onPress={() => { setShowPendingOnly(!showPendingOnly); setCurrentPage(0); }}
        >
          <Ionicons
            name={showPendingOnly ? 'time' : 'time-outline'}
            size={14}
            color={showPendingOnly ? 'white' : '#DB7093'}
          />
          <Text style={[styles.filterText, showPendingOnly && styles.filterTextActive]}>
            ({pendingCount})
          </Text>
        </Pressable>

        {/* SMS Butonu */}
        <TouchableOpacity style={styles.smsBtn} onPress={sendWatchlistSMS}>
          <Ionicons name="chatbubble-outline" size={15} color="white" />
          <Text style={styles.smsBtnText}>SMS</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT }, (_, i) => i)}
          keyExtractor={(i) => `skeleton-${i}`}
          contentContainerStyle={{ padding: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={() => <SkeletonCard />}
        />
      ) : filteredSorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '📝'}</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Sonuç bulunamadı' : 'İzleme listesi boş'}
          </Text>
          <Text style={styles.emptySubText}>
            {searchQuery
              ? `"${searchQuery}" eşleşmedi.`
              : 'Detay sayfasından 📌 butonuna basarak ekleyin'}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pageData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const wItem = item as WatchlistItem;
              return (
                <View style={wItem.watched ? styles.watchedWrap : undefined}>
                  <MediaCard
                    item={wItem}
                    onPress={() =>
                      router.push({
                        pathname: '/details/[id]',
                        params: {
                          id: wItem.id, title: wItem.title, trailer: wItem.trailer,
                          year: wItem.year, type: wItem.type, img: wItem.img,
                        },
                      })
                    }
                    onRate={() => openRating(wItem)}
                    onRemove={() => confirmRemove(wItem)}
                    removeIcon="trash-outline"
                    removeColor="#e74c3c"
                  />
                  <Pressable
                    style={[styles.watchedBtn, wItem.watched && styles.watchedBtnDone]}
                    onPress={() => toggleWatched(wItem)}
                  >
                    <Ionicons
                      name={wItem.watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={14}
                      color={wItem.watched ? 'white' : '#DB7093'}
                    />
                    <Text style={[styles.watchedText, wItem.watched && styles.watchedTextDone]}>
                      {wItem.watched ? 'İzlendi ✓' : 'İzlendi olarak işaretle'}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
          />
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
          <Text style={styles.pageInfo}>
            {filteredSorted.length} içerik  •  Sayfa {safePage + 1}/{totalPages}
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
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 15, color: '#e74c3c', textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: '#DB7093', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  resultCount: { fontSize: 12, color: '#a07088', paddingHorizontal: 16, marginBottom: 4 },

  controlRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  sortRow:    { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  sortBtn:    { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1DC', backgroundColor: 'white' },
  sortBtnActive:  { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  sortText:       { fontSize: 11, color: '#DB7093' },
  sortTextActive: { color: 'white', fontWeight: 'bold' },

  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#FFD1DC', backgroundColor: 'white',
  },
  filterBtnActive:  { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  filterText:       { fontSize: 11, color: '#DB7093' },
  filterTextActive: { color: 'white', fontWeight: 'bold' },

  smsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#9b59b6', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 20,
  },
  smsBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  watchedWrap: { opacity: 0.65 },
  watchedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginTop: -6, marginLeft: 12, marginBottom: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#FFD1DC', backgroundColor: 'white',
  },
  watchedBtnDone:  { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
  watchedText:     { fontSize: 11, color: '#DB7093' },
  watchedTextDone: { color: 'white', fontWeight: 'bold' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:      { fontSize: 56, marginBottom: 16 },
  emptyText:      { fontSize: 18, fontWeight: 'bold', color: '#DB7093', marginBottom: 8 },
  emptySubText:   { fontSize: 13, color: '#c0a0b0', textAlign: 'center', lineHeight: 20 },

  pageInfo: { textAlign: 'center', fontSize: 11, color: '#c0a0b0', paddingBottom: 12 },
});