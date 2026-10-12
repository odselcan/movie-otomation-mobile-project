import { useCallback } from 'react'; // useEffect, useState kaldırıldı
import { I18nManager } from 'react-native';
import {
  SUPPORTED_LOCALES,
  SupportedLocale,
  i18n,
  useLanguageStore,
} from '../store/languageStore';

// ─── RTL, formatDate, formatNumber — HİÇBİR ŞEY DEĞİŞMEDİ ──────────────────
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.some((rtl) => locale.startsWith(rtl));
}

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

export function formatLocalNumber(num: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(num);
}

// ─── Hook — SADECE STATE KAYNAĞI DEĞİŞTİ ─────────────────────────────────────
export function useI18n() {
  // ↓ useState yerine Zustand store — tüm componentler aynı locale'i okur
  const { locale, setLocale } = useLanguageStore();

  const t = useCallback(
    (key: string, options?: Record<string, unknown>): string => {
      return i18n.t(key, options);
    },
    [locale]
  );

  const changeLocale = useCallback(
    (newLocale: SupportedLocale) => {
      const rtl = isRTL(newLocale);
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
      }
      setLocale(newLocale); // ← store güncellenir, tüm componentler re-render olur
    },
    [setLocale]
  );

  return {
    locale,
    t,
    changeLocale,
    isTurkish: locale === 'tr',
    isRTL: isRTL(locale),
    formatDate: (dateStr: string) => formatLocalDate(dateStr, locale),
    formatNumber: (num: number) => formatLocalNumber(num, locale),
  };
}

export function translate(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export { SUPPORTED_LOCALES };
export type { SupportedLocale };