// components/SearchBar.tsx
// Nielsen #3 Kullanıcı Kontrolü & Özgürlüğü: temizle butonu
// Nielsen #4 Tutarlılık: her ekranda aynı arama deneyimi
// Nielsen #7 Esneklik: hem yazarak hem temizleyerek arama
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Ara...' }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search-outline" size={18} color="#DB7093" style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#c0a0b0"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        // Nielsen #3: Kolay geri alma — tek dokunuşta temizle
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color="#DB7093" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#DB7093',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#FFD1DC',
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    padding: 0,
  },
});