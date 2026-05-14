// components/LanguageSwitcher.tsx
// Dil değiştirme butonu — TR / EN toggle
// Accessibility: accessibilityLabel, accessibilityRole, accessibilityHint

import React from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SupportedLocale, useI18n } from '../hooks/useI18n';

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  tr: '🇹🇷 TR',
  en: '🇬🇧 EN',
};

export default function LanguageSwitcher() {
  const { locale, changeLocale } = useI18n();

  const handleChange = (newLocale: SupportedLocale) => {
    changeLocale(newLocale);
    // Ekran okuyucuya dil değişikliğini bildir
    AccessibilityInfo.announceForAccessibility(
      newLocale === 'tr' ? 'Dil Türkçe olarak değiştirildi' : 'Language changed to English'
    );
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel="Dil seçimi"
    >
      {(['tr', 'en'] as SupportedLocale[]).map((loc) => (
        <Pressable
          key={loc}
          style={[styles.btn, locale === loc && styles.active]}
          onPress={() => handleChange(loc)}
          accessibilityRole="radio"
          accessibilityLabel={loc === 'tr' ? 'Türkçe' : 'English'}
          accessibilityState={{ selected: locale === loc }}
          accessibilityHint={
            locale === loc
              ? 'Seçili dil'
              : loc === 'tr'
              ? 'Türkçeye geç'
              : 'Switch to English'
          }
        >
          <Text style={[styles.label, locale === loc && styles.activeLabel]}>
            {LOCALE_LABELS[loc]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,           // 6 → 4
    alignItems: 'center',
  },
  btn: {
    paddingHorizontal: 7,  // 10 → 7
    paddingVertical: 3,    // 5 → 3
    borderRadius: 12,      // 16 → 12
    backgroundColor: '#FFD1DC',
    minWidth: 38,          // 44 → 38
    minHeight: 32,         // 44 → 32
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#DB7093',
  },
  label: {
    fontSize: 11,   // 12 → 11
    fontWeight: '600',
    color: '#DB7093',
  },
  activeLabel: {
    color: 'white',
  },
});