// app/(drawer)/favorites.tsx — Netflix dark tema
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, FlatList, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';

import MediaCard from '../../components/MediaCard';
import Pagination from '../../components/Pagination';
import RatingModal from '../../components/RatingModal';
import SkeletonCard from '../../components/SkeletonCard';
import { useI18n } from '../../hooks/useI18n';
import { MediaItem, useMediaStorage } from '../../hooks/useStorage';
import { C, Radius, Spacing } from '../../constants/theme';

type SortKey = 'addedAt' | 'userRating' | 'title' | 'year';
const SKELETON_COUNT = 5;

export default function FavoritesScreen() {
  const router  = useRouter();
  const { t }   = useI18n();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'addedAt',    label: `🕐 ${t('favorites.sortByDate')}` },
    { key: 'userRating', label: `⭐ ${t('favorites.sortByRating')}` },
    { key: 'title',      label: `🔤 ${t('favorites.sortByTitle')}` },
    { key: 'year',       label: `📅 ${t('favorites.sortByYear')}` },
  ];

  const { items, loading, error, load, upsert, remove, searchItems, getPage } =
    useMediaStorage('favorites_data');

  const [searchQuery, setSearchQuery]   = useState('');
  const [sortKey, setSortKey]           = useState<SortKey>('addedAt');
  const [currentPage, setCurrentPage]   = useState(0);
  const [ratingModal, setRatingModal]   = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useFocusEffect(useCallback(() => {
    load();
    setCurrentPage(0);
  }, [load]));

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

  const { data: pageData, totalPages, currentPage: safePage } =
    getPage(filteredSorted, currentPage);

  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(0); };
  const handleSort   = (k: SortKey) => { setSortKey(k);    setCurrentPage(0); };

  const confirmRemove = (item: MediaItem) =>
    Alert.alert(
      t('favorites.removeTitle'),
      `"${item.title}" ${t('favorites.removeConfirm')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('favorites.remove'), style: 'destructive',
          onPress: () => {
            remove(item.id);
            if (pageData.length === 1 && currentPage > 0) setCurrentPage(p => p - 1);
          },
        },
      ]
    );

  const openRating = (item: MediaItem) => { setSelectedItem(item); setRatingModal(true); };

  const saveRating = async (rating: number, note: string) => {
    if (!selectedItem) return;
    await upsert({ ...selectedItem, userRating: rating, userNote: note });
    setRatingModal(false);
    setSelectedItem(null);
  };

  const sendFavoritesSMS = async () => {
    if (items.length === 0) {
      Alert.alert(t('favorites.emptyList'), t('favorites.emptyListMsg'));
      return;
    }
    const available = await SMS.isAvailableAsync();
    if (!available) { Alert.alert(t('common.error'), t('map.smsNotSupported')); return; }

    const liste = items.slice(0, 20)
      .map((item, i) =>
        `${i + 1}. ${item.title} (${item.year})${item.userRating > 0 ? ` ⭐${item.userRating}/10` : ''}`
      ).join('\n');

    await SMS.sendSMSAsync([], [
      `🎬 ${t('favorites.smsTitle')}`,
      `━━━━━━━━━━━━━━━━`,
      liste,
      `━━━━━━━━━━━━━━━━`,
      `${t('favorites.smsTotal')}: ${items.length} ${t('favorites.smsContent')}`,
    ].join('\n'));
  };

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

      {/* ── Arama ─────────────────────────────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <Pressable style={{ flex: 1 }} onPress={() => {}}>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('favorites.searchPlaceholder')}
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </Pressable>
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

      {/* ── Sort + SMS ────────────────────────────────────────────────────── */}
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

        <TouchableOpacity style={styles.smsBtn} onPress={sendFavoritesSMS}>
          <Ionicons name="chatbubble-outline" size={15} color="white" />
          <Text style={styles.smsBtnText}>SMS</Text>
        </TouchableOpacity>
      </View>

      {/* ── İçerik ────────────────────────────────────────────────────────── */}
      {loading ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT }, (_, i) => i)}
          keyExtractor={(i) => `sk-${i}`}
          contentContainerStyle={{ padding: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={() => <SkeletonCard />}
        />
      ) : filteredSorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '💔'}</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? t('media.noSearchResults') : t('favorites.empty')}
          </Text>
          <Text style={styles.emptySubText}>
            {searchQuery
              ? `"${searchQuery}" ${t('favorites.noMatch')}`
              : t('favorites.emptyHint')}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pageData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                onPress={() => router.push({
                  pathname: '/details/[id]',
                  params: {
                    id: item.id, title: item.title, trailer: item.trailer,
                    year: item.year, type: item.type, img: item.img,
                  },
                })}
                onRate={() => openRating(item)}
                onRemove={() => confirmRemove(item)}
                removeIcon="heart-dislike-outline"
                removeColor={C.accent}
              />
            )}
          />
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
          <Text style={styles.pageInfo}>
            {filteredSorted.length} {t('favorites.title').toLowerCase()} •{' '}
            {t('favorites.page')} {safePage + 1}/{totalPages}
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

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 15, color: C.accent, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Arama
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    margin: 12, marginBottom: 4,
    borderWidth: 1, borderColor: C.border,
  },
  searchInputWrap: { flex: 1 },
  searchInput:     { flex: 1, fontSize: 13, color: C.text, padding: 0 },
  resultCount:     { fontSize: 12, color: C.textMuted, paddingHorizontal: 16, marginBottom: 4 },

  // Sort + SMS
  controlRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8, gap: 8,
  },
  sortRow:        { flexDirection: 'row', gap: 6 },
  sortBtn:        { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  sortBtnActive:  { backgroundColor: C.accent, borderColor: C.accent },
  sortText:       { fontSize: 11, color: C.textSub },
  sortTextActive: { color: 'white', fontWeight: 'bold' },

  smsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#6c3483',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  smsBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Boş
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:      { fontSize: 56, marginBottom: 16 },
  emptyText:      { fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 8 },
  emptySubText:   { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  pageInfo: { textAlign: 'center', fontSize: 11, color: C.textMuted, paddingBottom: 12 },
});