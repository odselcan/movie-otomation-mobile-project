// store/languageStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';
import en from '../locales/en';
import tr from '../locales/tr';
import de from '../locales/de';

export type SupportedLocale = 'tr' | 'en' | 'de';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['tr', 'en', 'de'];

export const i18n = new I18n({ tr, en, de });
i18n.locale = 'tr';
i18n.enableFallback = true;
i18n.defaultLocale = 'tr';

interface LanguageStore {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      locale: 'tr',
      setLocale: (locale) => {
        i18n.locale = locale;
        set({ locale });
      },
    }),
    {
      name: 'app_language',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);