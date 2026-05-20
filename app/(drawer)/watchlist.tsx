// app/(drawer)/watchlist.tsx — Netflix dark tema
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, FlatList, Pressable, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams, ScaleDecorator,
} from 'react-native-draggable-flatlist';

import MediaCard from '../../components/MediaCard';
import RatingModal from '../../components/RatingModal';
import SkeletonCard from '../../components/SkeletonCard';
import { useI18n } from '../../hooks/useI18n';
import { MediaItem, useMediaStorage } from '../../hooks/useStorage';
import { C, Radius } from '../../constants/theme';

type SortKey = 'addedAt' | 'title' | 'year';

interface WatchlistItem extends MediaItem {
  watched?: boolean;
  customOrder?: number;
}

const SKELETON_COUNT = 5;

export default function WatchlistScreen() {
  const router = useRouter();
  const { t }  = useI18n();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'addedAt', label: `🕐 ${t('favorites.sortByDate')}` },
    { key: 'title',   label: `🔤 ${t('favorites.sortByTitle')}` },
    { key: 'year',    label: `📅 ${t('favorites.sortByYear')}` },
  ];

  const { items, loading, error, load, upsert, remove, searchItems } =
    useMediaStorage('watchlist_data');

  const [searchQuery, setSearchQuery]         = useState('');
  const [sortKey, setSortKey]                 = useState<SortKey>('addedAt');
  const [ratingModal, setRatingModal]         = useState(false);
  const [selectedItem, setSelectedItem]       = useState<WatchlistItem | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredSorted = useMemo(() => {
    let list = searchItems(searchQuery, items) as WatchlistItem[];
    if (showPendingOnly) list = list.filter(i => !i.watched);
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'title':  return a.title.localeCompare(b.title, 'tr');
        case 'year':   return b.year.localeCompare(a.year);
        default:       return (b.addedAt || '').localeCompare(a.addedAt || '');
      }
    });
  }, [items, searchQuery, sortKey, showPendingOnly, searchItems]);

  const handleSearch = (q: string) => setSearchQuery(q);
  const handleSort   = (k: SortKey) => setSortKey(k);

  const toggleWatched = async (item: WatchlistItem) => {
    await upsert({ ...item, watched: !item.watched } as any);
  };

  const confirmRemove = (item: WatchlistItem) =>
    Alert.alert(
      t('watchlist.removeTitle'),
      `"${item.title}" ${t('watchlist.removeConfirm')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('watchlist.remove'), style: 'destructive', onPress: () => remove(item.id) },
      ]
    );

  const openRating = (item: WatchlistItem) => { setSelectedItem(item); setRatingModal(true); };

  const saveRating = async (rating: number, note: string) => {
    if (!selectedItem) return;
    await upsert({ ...selectedItem, userRating: rating, userNote: note });
    setRatingModal(false);
    setSelectedItem(null);
  };

  const handleDragEnd = useCallback(
    async ({ data }: { data: WatchlistItem[] }) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].customOrder !== i)
          await upsert({ ...data[i], customOrder: i } as any);
      }
    },
    [upsert]
  );

  const sendWatchlistSMS = async () => {
    if (items.length === 0) {
      Alert.alert(t('favorites.emptyList'), t('watchlist.emptyListMsg')); return;
    }
    const available = await SMS.isAvailableAsync();
    if (!available) { Alert.alert(t('common.error'), t('map.smsNotSupported')); return; }

    const watchedItems = (items as WatchlistItem[]).filter(i => i.watched);
    const pendingItems = (items as WatchlistItem[]).filter(i => !i.watched);
    const fmt = (item: WatchlistItem, i: number) =>
      `${i + 1}. ${item.title} (${item.year})${item.userRating > 0 ? ` ⭐${item.userRating}/10` : ''}`;

    let mesaj = `📋 ${t('watchlist.smsTitle')}\n━━━━━━━━━━━━━━━━\n`;
    if (pendingItems.length > 0)
      mesaj += `⏳ ${t('watchlist.pending')} (${pendingItems.length}):\n` +
               pendingItems.slice(0, 10).map(fmt).join('\n') + '\n\n';
    if (watchedItems.length > 0)
      mesaj += `✅ ${t('watchlist.watched')} (${watchedItems.length}):\n` +
               watchedItems.slice(0, 10).map(fmt).join('\n') + '\n';
    mesaj += `━━━━━━━━━━━━━━━━\n${t('favorites.smsTotal')}: ${items.length} ${t('favorites.smsContent')}`;
    await SMS.sendSMSAsync([], mesaj);
  };

  const pendingCount = (items as WatchlistItem[]).filter(i => !i.watched).length;

  // ── renderDraggable: uzun basınca sürükle (Spotify stili) ──────────────────
  const renderDraggable = useCallback(
    ({ item, drag, isActive }: RenderItemParams<WatchlistItem>) => (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={200}
          style={isActive ? styles.draggingRow : undefined}
        >
          <View style={item.watched ? styles.watchedWrap : undefined}>
            <MediaCard
              item={item}
              swipeEnabled={!isActive}
              rateSwipeEnabled={false}
              onPress={() => router.push({
                pathname: '/details/[id]',
                params: {
                  id: item.id, title: item.title, trailer: item.trailer,
                  year: item.year, type: item.type, img: item.img,
                },
              })}
              onRate={() => openRating(item)}
              onRemove={() => confirmRemove(item)}
              removeIcon="trash-outline"
              removeColor={C.accent}
            />
            <Pressable
              style={[styles.watchedBtn, item.watched && styles.watchedBtnDone]}
              onPress={() => toggleWatched(item)}
            >
              <Ionicons
                name={item.watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={14}
                color={item.watched ? 'white' : C.textSub}
              />
              <Text style={[styles.watchedText, item.watched && styles.watchedTextDone]}>
                {item.watched ? t('watchlist.watched') + ' ✓' : t('watchlist.markWatched')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </ScaleDecorator>
    ),
    [t]
  );

  if (error) return (
    <View style={styles.centered}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.retryBtn} onPress={load}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Arama */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('watchlist.searchPlaceholder')}
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      {searchQuery.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredSorted.length} {t('media.resultsFound')}
        </Text>
      )}

      {/* Sort + filter + SMS */}
      <View style={styles.controlRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map(opt => (
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
        </ScrollView>

        <Pressable
          style={[styles.filterBtn, showPendingOnly && styles.filterBtnActive]}
          onPress={() => setShowPendingOnly(p => !p)}
        >
          <Ionicons
            name={showPendingOnly ? 'time' : 'time-outline'}
            size={14}
            color={showPendingOnly ? 'white' : C.textMuted}
          />
          <Text style={[styles.filterText, showPendingOnly && styles.filterTextActive]}>
            ({pendingCount})
          </Text>
        </Pressable>

        <TouchableOpacity style={styles.smsBtn} onPress={sendWatchlistSMS}>
          <Ionicons name="chatbubble-outline" size={15} color="white" />
          <Text style={styles.smsBtnText}>SMS</Text>
        </TouchableOpacity>
      </View>

      {/* İçerik */}
      {loading ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT }, (_, i) => i)}
          keyExtractor={i => `sk-${i}`}
          contentContainerStyle={{ padding: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={() => <SkeletonCard />}
        />
      ) : filteredSorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '📝'}</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? t('media.noSearchResults') : t('watchlist.empty')}
          </Text>
          <Text style={styles.emptySubText}>
            {searchQuery
              ? `"${searchQuery}" ${t('favorites.noMatch')}`
              : t('watchlist.emptyHint')}
          </Text>
        </View>
      ) : (
        <>
          <DraggableFlatList
            data={filteredSorted}
            keyExtractor={item => item.id}
            renderItem={renderDraggable}
            onDragEnd={handleDragEnd}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            activationDistance={8}
          />
          <Text style={styles.pageInfo}>
            {filteredSorted.length} {t('favorites.smsContent')}
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
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 15, color: C.accent, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    margin: 12, marginBottom: 4,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput:  { flex: 1, fontSize: 13, color: C.text, padding: 0 },
  resultCount:  { fontSize: 12, color: C.textMuted, paddingHorizontal: 16, marginBottom: 4 },

  controlRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  sortRow:    { flexDirection: 'row', gap: 6 },
  sortBtn:        { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  sortBtnActive:  { backgroundColor: C.accent, borderColor: C.accent },
  sortText:       { fontSize: 11, color: C.textSub },
  sortTextActive: { color: 'white', fontWeight: 'bold' },

  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  filterBtnActive:  { backgroundColor: C.accent, borderColor: C.accent },
  filterText:       { fontSize: 11, color: C.textMuted },
  filterTextActive: { color: 'white', fontWeight: 'bold' },

  smsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#6c3483', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 20,
  },
  smsBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  draggingRow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },

  watchedWrap:     { opacity: 0.55 },
  watchedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginTop: -6, marginLeft: 12, marginBottom: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  watchedBtnDone:  { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  watchedText:     { fontSize: 11, color: C.textSub },
  watchedTextDone: { color: 'white', fontWeight: 'bold' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:      { fontSize: 56, marginBottom: 16 },
  emptyText:      { fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 8 },
  emptySubText:   { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  pageInfo: { textAlign: 'center', fontSize: 11, color: C.textMuted, paddingBottom: 12 },
});