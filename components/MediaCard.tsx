// components/MediaCard.tsx
// Nielsen #4 Tutarlılık, #6 Tanıma, #8 Minimalist + Reanimated/Gesture Handler
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MediaItem } from '../hooks/useStorage';
import { useI18n } from '../hooks/useI18n';

interface Props {
  item: MediaItem;
  onPress: () => void;
  onRate: () => void;
  onRemove: () => void;
  removeIcon?: 'heart-dislike-outline' | 'trash-outline';
  removeColor?: string;
  swipeEnabled?: boolean;
  rateSwipeEnabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 130;
const CARD_HEIGHT = 115;

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
  swipeEnabled = true,
    rateSwipeEnabled = true,    
}: Props) {
  const { t } = useI18n();

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const itemHeight = useSharedValue(CARD_HEIGHT + 10);
  const itemOpacity = useSharedValue(1);

  const handleRemove = () => onRemove();
  const handleRate = () => onRate();

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      'worklet';
      translateX.value = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, e.translationX));
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX < -SWIPE_THRESHOLD) {
        // Sola → sil (collapse animasyonu)
        translateX.value = withTiming(-500, { duration: 220 });
        itemOpacity.value = withTiming(0, { duration: 220 });
        itemHeight.value = withTiming(0, { duration: 280 }, (finished) => {
          if (finished) runOnJS(handleRemove)();
        });
      } else if (e.translationX > SWIPE_THRESHOLD) {
  translateX.value = withSpring(0, { damping: 18 });
  if (rateSwipeEnabled) runOnJS(handleRate)();   // ← sadece enabled ise aç
} else {
        translateX.value = withSpring(0, { damping: 18 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: itemOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    marginBottom: interpolate(
      itemHeight.value, [0, CARD_HEIGHT + 10], [0, 10], Extrapolation.CLAMP,
    ),
  }));

  const leftBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value, [-SWIPE_THRESHOLD, -20, 0], [1, 0.4, 0], Extrapolation.CLAMP,
    ),
  }));

  const rightBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value, [0, 20, SWIPE_THRESHOLD], [0, 0.4, 1], Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View style={[styles.outerContainer, containerStyle]}>
      {/* Sol: sil — kırmızı */}
      <Animated.View
        style={[styles.actionBg, styles.actionBgLeft, { backgroundColor: '#e74c3c' }, leftBgStyle]}
        pointerEvents="none"
      >
        <Ionicons name="trash" size={26} color="white" />
        <Text style={styles.actionLabel}>{t('media.swipeHintDelete')}</Text>
      </Animated.View>
{swipeEnabled && rateSwipeEnabled && (
  <Animated.View
    style={[styles.actionBg, styles.actionBgRight, { backgroundColor: '#f39c12' }, rightBgStyle]}
    pointerEvents="none"
  >
    <Text style={styles.actionLabel}>{t('media.swipeHintRate')}</Text>
    <Ionicons name="star" size={26} color="white" />
  </Animated.View>
)}


      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Pressable
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 220 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 220 }); }}
            style={styles.pressArea}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityHint={t('a11y.cardSwipeHint')}
          >
            <View style={styles.posterWrap}>
              <Image
                source={{ uri: item.img || 'https://via.placeholder.com/80x110' }}
                style={styles.poster}
              />
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.type === 'movie' ? '🎬' : '📺'}</Text>
              </View>
            </View>

            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.meta}>{item.year}  •  {item.type}</Text>
              <View style={styles.starsRow}>{renderStars(item.userRating)}</View>
              {item.userNote ? (
                <Text style={styles.notePreview} numberOfLines={1}>💬 {item.userNote}</Text>
              ) : null}

              {/* Sadece puan verilmişse göster — display amaçlı, basınca modal */}
              {item.userRating > 0 ? (
                <Pressable
                  style={[styles.ratingBadge, { backgroundColor: getRatingColor(item.userRating) }]}
                  onPress={onRate}
                >
                  <Ionicons name="star" size={11} color="white" />
                  <Text style={styles.ratingText}>{item.userRating}/10</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable style={styles.removeBtn} onPress={onRemove}>
              <Ionicons name={removeIcon} size={20} color={removeColor} />
            </Pressable>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    marginBottom: 10,
  },
  actionBg: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 8,
    borderRadius: 20,
  },
  actionBgLeft:  { right: 0, justifyContent: 'flex-end' },
  actionBgRight: { left: 0,  justifyContent: 'flex-start' },
  actionLabel:   { color: 'white', fontWeight: 'bold', fontSize: 12 },

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#DB7093',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  pressArea:     { flexDirection: 'row', alignItems: 'center' },
  posterWrap:    { width: 75, height: 105, position: 'relative' },
  poster:        { width: '100%', height: '100%', resizeMode: 'cover' },
  typeBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1,
  },
  typeText:      { fontSize: 10 },
  info:          { flex: 1, padding: 10, gap: 3 },
  title:         { fontSize: 14, fontWeight: 'bold', color: '#4A4A4A', lineHeight: 19 },
  meta:          { fontSize: 11, color: '#aaa' },
  starsRow:      { flexDirection: 'row', gap: 1, marginTop: 1 },
  notePreview:   { fontSize: 11, color: '#b08898', fontStyle: 'italic' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, marginTop: 4,
  },
  ratingText:    { color: 'white', fontWeight: 'bold', fontSize: 11 },
  removeBtn:     { padding: 12, alignSelf: 'center' },
});