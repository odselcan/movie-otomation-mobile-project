// components/MediaCard.tsx
// Nielsen #4  Tutarlılık & Standartlar: Favoriler ve İzlenecekler aynı kart tasarımı
// Nielsen #6  Tanıma > Hatırlama: poster görseli ile içerik hızla tanınır
// Nielsen #8  Estetik & Minimalist Tasarım: yalnızca gerekli bilgi gösterilir
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MediaItem } from '../hooks/useStorage';

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

const renderStars = (rating: number) => {
  const filled = Math.round(rating / 2);
  return Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < filled ? 'star' : 'star-outline'}
      size={11}
      color="#DB7093"
    />
  ));
};

export default function MediaCard({
  item,
  onPress,
  onRate,
  onRemove,
  removeIcon = 'heart-dislike-outline',
  removeColor = '#DB7093',
}: Props) {
  return (
    <View style={styles.card}>
      {/* Nielsen #6: Poster görseli ile içerik kolayca tanınır */}
      <Pressable style={styles.posterWrap} onPress={onPress}>
        <Image
          source={{ uri: item.img || 'https://via.placeholder.com/80x110' }}
          style={styles.poster}
        />
        {/* Tür etiketi overlay */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type === 'movie' ? '🎬' : '📺'}</Text>
        </View>
      </Pressable>

      <View style={styles.info}>
        {/* Nielsen #8: Yalnızca başlık, yıl, tür — fazlası yok */}
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.meta}>{item.year}  •  {item.type}</Text>

        {/* Yıldız satırı */}
        <View style={styles.starsRow}>{renderStars(item.userRating)}</View>

        {/* Not önizlemesi — varsa */}
        {item.userNote ? (
          <Text style={styles.notePreview} numberOfLines={1}>
            💬 {item.userNote}
          </Text>
        ) : null}

        {/* Puan rozeti */}
        <Pressable
          style={[
            styles.ratingBadge,
            item.userRating > 0 && { backgroundColor: getRatingColor(item.userRating) },
          ]}
          onPress={onRate}
        >
          <Ionicons name="star" size={11} color="white" />
          <Text style={styles.ratingText}>
            {item.userRating > 0 ? `${item.userRating}/10` : 'Puan ver'}
          </Text>
        </Pressable>
      </View>

      {/* Sil butonu — Nielsen #3: Kullanıcı kontrolü */}
      <Pressable style={styles.removeBtn} onPress={onRemove}>
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
  },
  posterWrap: { width: 75, height: 105, position: 'relative' },
  poster: { width: '100%', height: '100%', resizeMode: 'cover' },
  typeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  typeText: { fontSize: 10 },
  info: { flex: 1, padding: 10, gap: 3 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#4A4A4A', lineHeight: 19 },
  meta: { fontSize: 11, color: '#aaa' },
  starsRow: { flexDirection: 'row', gap: 1, marginTop: 1 },
  notePreview: { fontSize: 11, color: '#b08898', fontStyle: 'italic' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#DB7093',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  ratingText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  removeBtn: { padding: 12, alignSelf: 'center' },
});