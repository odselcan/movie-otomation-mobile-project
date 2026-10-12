// components/LanguageSwitcher.tsx
// Dil değiştirme butonu — TR / EN / DE toggle
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
  de: '🇩🇪 DE',
};

export default function LanguageSwitcher() {
  const { locale, changeLocale } = useI18n();

  const handleChange = (newLocale: SupportedLocale) => {
    changeLocale(newLocale);
    // Ekran okuyucuya dil değişikliğini bildir
    AccessibilityInfo.announceForAccessibility(
      newLocale === 'tr' ? 'Dil Türkçe olarak değiştirildi' : newLocale === 'en' ? 'Language changed to English' : 'Sprache auf Deutsch geändert'
    );
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel="Dil seçimi"
    >
      {(['tr', 'en', 'de'] as SupportedLocale[]).map((loc) => (
        <Pressable
          key={loc}
          style={[styles.btn, locale === loc && styles.active]}
          onPress={() => handleChange(loc)}
          accessibilityRole="radio"
          accessibilityLabel={loc === 'tr' ? 'Türkçe' : loc === 'en' ? 'English' : 'Deutsch'}
          accessibilityState={{ selected: locale === loc }}
          accessibilityHint={
            locale === loc
              ? 'Seçili dil'
              : loc === 'tr'
              ? 'Türkçeye geç'
              : loc === 'en'
              ? 'Switch to English'
              : 'Auf Deutsch wechseln'
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
    gap: 4,
    alignItems: 'center',
  },
  btn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FFD1DC',
    minWidth: 38,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#DB7093',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DB7093',
  },
  activeLabel: {
    color: 'white',
  },
});