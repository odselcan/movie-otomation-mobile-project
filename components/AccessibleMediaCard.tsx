// components/AccessibleMediaCard.tsx
// WCAG 2.1 AA — VoiceOver / TalkBack uyumlu

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  AccessibilityInfo,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import type { MediaItem } from '../hooks/useStorage';

interface Props {
  item: MediaItem;
  onPress: () => void;
  onRate: () => void;
  onRemove: () => void;
  removeIcon?: 'heart-dislike-outline' | 'trash-outline';
  removeColor?: string;
}

const getRatingColor = (r: number) => {
  if (r >= 8) return '#2ecc71';
  if (r >= 5) return '#f39c12';
  return '#e74c3c';
};

export default function AccessibleMediaCard({
  item, onPress, onRate, onRemove,
  removeIcon = 'heart-dislike-outline',
  removeColor = '#DB7093',
}: Props) {
  const { t, locale } = useI18n();

  const handleRemove = () => {
    onRemove();
    AccessibilityInfo.announceForAccessibility(
      `${item.title} ${locale === 'tr' ? 'kaldırıldı' : 'removed'}`
    );
  };

  return (
    <View style={styles.card} accessible={false}>

      {/* Poster */}
      <Pressable
        style={styles.posterWrap}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} - ${t('a11y.posterImage')}`}
        accessibilityHint={locale === 'tr' ? 'Detay için dokunun' : 'Double tap to open details'}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Image
          source={{ uri: item.img || 'https://via.placeholder.com/80x110' }}
          style={styles.poster}
          accessible={true}
          accessibilityLabel={`${item.title} ${t('a11y.posterImage')}`}
        />
        <View style={styles.typeBadge}>
          <Text style={styles.typeText} accessible={false}>
            {item.type === 'movie' ? '🎬' : '📺'}
          </Text>
        </View>
      </Pressable>

      <View style={styles.info}>
        <Text
          style={styles.title}
          numberOfLines={2}
          accessibilityRole="header"
        >
          {item.title}
        </Text>

        <Text
          style={styles.meta}
          accessibilityLabel={`${item.year}, ${item.type}`}
        >
          {item.year}  •  {item.type}
        </Text>

        {/* Yıldızlar — ekran okuyucudan gizli, puan rozeti açıklıyor */}
        <View
          style={styles.starsRow}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const filled = Math.round(item.userRating / 2);
            return (
              <Ionicons
                key={i}
                name={i < filled ? 'star' : 'star-outline'}
                size={11}
                color="#DB7093"
              />
            );
          })}
        </View>

        {item.userNote ? (
          <Text
            style={styles.notePreview}
            numberOfLines={1}
            accessibilityLabel={`${t('favorites.note')}: ${item.userNote}`}
          >
            💬 {item.userNote}
          </Text>
        ) : null}

        {/* Puan butonu — style TEK kez kullanıldı */}
        <Pressable
          onPress={onRate}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            item.userRating > 0
              ? `${t('favorites.yourRating')}: ${item.userRating}/10`
              : t('favorites.rateThis')
          }
          accessibilityHint={locale === 'tr' ? 'Puan vermek için dokunun' : 'Double tap to rate'}
          style={({ pressed }) => [
            styles.ratingBadge,
            item.userRating > 0 && { backgroundColor: getRatingColor(item.userRating) },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="star" size={11} color="white" />
          <Text style={styles.ratingText}>
            {item.userRating > 0 ? `${item.userRating}/10` : t('favorites.rateThis')}
          </Text>
        </Pressable>
      </View>

      {/* Sil butonu */}
      <Pressable
        style={styles.removeBtn}
        onPress={handleRemove}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} ${locale === 'tr' ? 'kaldır' : 'remove'}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={removeIcon} size={20} color={removeColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#DB7093',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    minHeight: 44,
  },
  posterWrap: { width: 75, height: 105, position: 'relative' },
  poster: { width: '100%', height: '100%', resizeMode: 'cover' },
  typeBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1,
  },
  typeText: { fontSize: 10 },
  info: { flex: 1, padding: 10, gap: 3 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#333333', lineHeight: 19 },
  meta: { fontSize: 11, color: '#767676' },
  starsRow: { flexDirection: 'row', gap: 1, marginTop: 1 },
  notePreview: { fontSize: 11, color: '#b08898', fontStyle: 'italic' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#DB7093',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, marginTop: 4,
    minHeight: 44, minWidth: 44,
  },
  ratingText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  removeBtn: {
    padding: 12, alignSelf: 'center',
    minWidth: 44, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
  },
});