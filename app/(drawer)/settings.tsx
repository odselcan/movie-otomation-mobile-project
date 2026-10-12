// app/(drawer)/settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, Radius, Spacing } from '../../constants/theme';
import { useI18n } from '../../hooks/useI18n';
import { useBrightness } from '../../hooks/useSensors';
import { useLanguageStore } from '../../store/languageStore';
import type { SupportedLocale } from '../../store/languageStore';

const LANGUAGES: { code: SupportedLocale; flag: string; label: string }[] = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe'  },
  { code: 'en', flag: '🇬🇧', label: 'English'  },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch'  },
];

export default function SettingsScreen() {
  const navigation               = useNavigation();
  const { t }                    = useI18n();
  const { locale, setLocale }    = useLanguageStore();
  const { isCinemaMode, toggleCinemaMode } = useBrightness();

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ title: t('drawer.settings') });
  }, [t]));

  return (
    <View style={styles.container}>

      {/* ── Dil Seçimi ──────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>{t('settings.language') ?? 'Dil'}</Text>
      <View style={styles.card}>
        {LANGUAGES.map((lang, i) => {
          const active = locale === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[
                styles.langRow,
                i < LANGUAGES.length - 1 && styles.langRowBorder,
              ]}
              onPress={() => setLocale(lang.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                {lang.label}
              </Text>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={C.accent} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Parlaklık / Sinema Modu ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>
        {t('settings.display') ?? 'Ekran'}
      </Text>
      <View style={styles.card}>
        <Pressable style={styles.settingRow} onPress={toggleCinemaMode}>
          <View style={styles.settingLeft}>
            <Ionicons
              name={isCinemaMode ? 'film' : 'sunny-outline'}
              size={22}
              color={isCinemaMode ? '#FFD700' : C.textSub}
            />
            <View>
              <Text style={styles.settingLabel}>
                {t('a11y.cinemaMode') ?? 'Sinema Modu'}
              </Text>
              <Text style={styles.settingDesc}>
                {isCinemaMode ? 'Açık — parlaklık düşük' : 'Kapalı — normal parlaklık'}
              </Text>
            </View>
          </View>
          {/* Toggle */}
          <View style={[styles.toggle, isCinemaMode && styles.toggleActive]}>
            <View style={[styles.toggleThumb, isCinemaMode && styles.toggleThumbActive]} />
          </View>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: Spacing.lg },
  sectionTitle: {
    color: C.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: Spacing.sm, marginTop: Spacing.lg,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  // Dil satırı
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 16,
  },
  langRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  langFlag:       { fontSize: 24 },
  langLabel:      { flex: 1, color: C.textSub, fontSize: 15, fontWeight: '500' },
  langLabelActive:{ color: C.text, fontWeight: '700' },

  // Ayar satırı
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 16,
  },
  settingLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  settingLabel: { color: C.text, fontSize: 15, fontWeight: '500' },
  settingDesc:  { color: C.textMuted, fontSize: 11, marginTop: 2 },

  // Toggle
  toggle: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: C.surfaceHigh,
    padding: 3, justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  toggleActive:      { backgroundColor: C.accent, borderColor: C.accent },
  toggleThumb:       { width: 20, height: 20, borderRadius: 10, backgroundColor: C.textMuted, alignSelf: 'flex-start' },
  toggleThumbActive: { backgroundColor: 'white', alignSelf: 'flex-end' },
});