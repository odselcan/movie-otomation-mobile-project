// components/Pagination.tsx
// Nielsen #1 Sistem Durumu Görünürlüğü: hangi sayfada olduğunu göster
// Nielsen #6 Tanıma > Hatırlama: sayfa numaraları görsel olarak belirgin
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.wrap}>
      {/* Geri butonu */}
      <Pressable
        style={[styles.btn, currentPage === 0 && styles.btnDisabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        <Ionicons name="chevron-back" size={18} color={currentPage === 0 ? '#e0c0cc' : '#DB7093'} />
      </Pressable>

      {/* Sayfa göstergesi - Nielsen #1: Kullanıcı nerede olduğunu bilir */}
      {Array.from({ length: totalPages }, (_, i) => (
        <Pressable
          key={i}
          style={[styles.dot, i === currentPage && styles.dotActive]}
          onPress={() => onPageChange(i)}
        >
          <Text style={[styles.dotText, i === currentPage && styles.dotTextActive]}>
            {i + 1}
          </Text>
        </Pressable>
      ))}

      {/* İleri butonu */}
      <Pressable
        style={[styles.btn, currentPage === totalPages - 1 && styles.btnDisabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
      >
        <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages - 1 ? '#e0c0cc' : '#DB7093'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD1DC',
    elevation: 1,
  },
  btnDisabled: {
    backgroundColor: '#FFF5F7',
    borderColor: '#ffe0ea',
  },
  dot: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD1DC',
    paddingHorizontal: 6,
  },
  dotActive: {
    backgroundColor: '#DB7093',
    borderColor: '#DB7093',
  },
  dotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DB7093',
  },
  dotTextActive: {
    color: 'white',
  },
});