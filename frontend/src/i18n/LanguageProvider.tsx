'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  dictionaries,
  isLocale,
  type Locale,
  type TranslationKey,
} from './translations';

const STORAGE_KEY = 'recipe-book.locale';

/** Keys that have `.one` / `.few` / `.many` / `.other` variants. */
type PluralBase = TranslationKey extends infer K
  ? K extends `${infer Base}.one`
    ? Base
    : never
  : never;

type TranslateValues = Record<string, string | number>;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslateValues) => string;
  tPlural: (base: PluralBase, count: number, values?: TranslateValues) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in values ? String(values[token]) : match
  );
}

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null;
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const base = candidate?.split('-')[0]?.toLowerCase();
    if (isLocale(base)) return base;
  }
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start at the default so server and client markup match; the stored
  // or detected locale is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    const resolved = isLocale(stored) ? stored : detectBrowserLocale() ?? DEFAULT_LOCALE;
    setLocaleState(resolved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice just won't persist.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = dictionaries[locale];

    const t = (key: TranslationKey, values?: TranslateValues) =>
      interpolate(dictionary[key] ?? key, values);

    const tPlural = (base: PluralBase, count: number, values?: TranslateValues) => {
      const category = new Intl.PluralRules(locale).select(count);
      const key = `${base}.${category}` as TranslationKey;
      const template = dictionary[key] ?? dictionary[`${base}.other` as TranslationKey];
      return interpolate(template ?? base, { count, ...values });
    };

    return { locale, setLocale, t, tPlural };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
