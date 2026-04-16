// components/SkeletonCard.tsx
// MediaCard'ın yüklenme sırasında gösterilen skeleton versiyonu
// React Native Animated ile pulse efekti — Expo Go uyumlu

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  opacity,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View
      style={[
        styles.skeletonBox,
        { width: width as any, height, borderRadius, opacity },
      ]}
    />
  );
}

export default function SkeletonCard() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      {/* Poster alanı */}
      <SkeletonBox width={75} height={105} borderRadius={0} opacity={opacity} />

      {/* İçerik alanı */}
      <View style={styles.info}>
        <SkeletonBox width="80%" height={14} opacity={opacity} />
        <SkeletonBox width="50%" height={11} opacity={opacity} />
        <SkeletonBox width="40%" height={11} opacity={opacity} />
        <SkeletonBox width={70} height={26} borderRadius={20} opacity={opacity} />
      </View>

      {/* Sil butonu alanı */}
      <View style={styles.removeArea}>
        <SkeletonBox width={24} height={24} borderRadius={12} opacity={opacity} />
      </View>
    </View>
  );
}

// Ana sayfadaki grid kartlar için skeleton
export function SkeletonPoster() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.posterCard}>
      <Animated.View style={[styles.posterImage, { opacity }]} />
      <Animated.View style={[styles.posterTitle, { opacity }]} />
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
  info: {
    flex: 1,
    padding: 10,
    gap: 8,
  },
  skeletonBox: {
    backgroundColor: '#FFD1DC',
  },
  removeArea: {
    padding: 12,
  },

  // Grid poster skeleton
  posterCard: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 5,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: 210,
    backgroundColor: '#FFD1DC',
  },
  posterTitle: {
    height: 14,
    backgroundColor: '#FFD1DC',
    borderRadius: 8,
    margin: 10,
    marginTop: 8,
  },
});