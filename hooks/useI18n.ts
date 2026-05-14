// hooks/useI18n.ts
// Çoklu dil desteği — Türkçe & İngilizce
// expo-localization ile cihaz dilini otomatik algılar
// RTL desteği dahil

import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { useCallback, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import en from '../locales/en';
import tr from '../locales/tr';

// ─── i18n instance ────────────────────────────────────────────────────────────
const i18n = new I18n({ tr, en });

// Desteklenen diller
export type SupportedLocale = 'tr' | 'en';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['tr', 'en'];

// Cihaz dilini al, desteklenmiyorsa Türkçe varsayılan
function getDeviceLocale(): SupportedLocale {
  const deviceLocales = getLocales();
  for (const locale of deviceLocales) {
    const lang = locale.languageCode as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
  }
  return 'tr'; // varsayılan
}

// ─── RTL Yardımcıları ─────────────────────────────────────────────────────────
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.some((rtl) => locale.startsWith(rtl));
}

// ─── Tarih Formatlama ─────────────────────────────────────────────────────────
export function formatLocalDate(dateStr: string, locale: SupportedLocale): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Sayı Formatlama ──────────────────────────────────────────────────────────
export function formatLocalNumber(num: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(num);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useI18n() {
  const [locale, setLocale] = useState<SupportedLocale>(getDeviceLocale);

  // Dil değişince i18n ve RTL güncelle
  useEffect(() => {
    i18n.locale = locale;
    i18n.enableFallback = true;
    i18n.defaultLocale = 'tr';

    // RTL desteği
    const rtl = isRTL(locale);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }, [locale]);

  // Çeviri fonksiyonu
  const t = useCallback(
    (key: string, options?: Record<string, unknown>): string => {
      return i18n.t(key, options);
    },
    [locale]
  );

  // Dil değiştir
  const changeLocale = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
    i18n.locale = newLocale;
  }, []);

  // Mevcut dil Türkçe mi?
  const isTurkish = locale === 'tr';

  return {
    locale,
    t,
    changeLocale,
    isTurkish,
    isRTL: isRTL(locale),
    formatDate: (dateStr: string) => formatLocalDate(dateStr, locale),
    formatNumber: (num: number) => formatLocalNumber(num, locale),
  };
}

// ─── Singleton (Hook dışında kullanmak için) ──────────────────────────────────
export function translate(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}