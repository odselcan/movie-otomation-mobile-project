// components/NetworkBanner.tsx
// expo-network — internet bağlantısı yoksa üstte uyarı banner'ı gösterir

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useNetworkStatus } from '../hooks/useSensors';

export default function NetworkBanner() {
  const { isConnected, networkType } = useNetworkStatus();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isConnected ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  if (isConnected) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Ionicons name="wifi-outline" size={16} color="white" />
      <Text style={styles.text}>İnternet bağlantısı yok — Önbellek gösteriliyor</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 10,
  },
  text: { color: 'white', fontSize: 12, fontWeight: '600' },
});