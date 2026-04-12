/**
 * @fileoverview Lightweight i18n system for the Glyph PWA.
 * Supports Bangla (bn) and English (en) with Bangla as the default language.
 * Language preference is persisted in localStorage.
 *
 * @module lib/i18n
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import bnStrings from './bn.json';
import enStrings from './en.json';

/** Supported language codes */
export type Language = 'bn' | 'en';

/** localStorage key for persisting language preference */
const LANGUAGE_KEY = 'glyph_language';

/** Default language — Bangla for Bangladeshi clinical context */
const DEFAULT_LANGUAGE: Language = 'bn';

/** Flat string dictionaries keyed by language */
const dictionaries: Record<Language, Record<string, Record<string, string>>> = {
  bn: bnStrings as Record<string, Record<string, string>>,
  en: enStrings as Record<string, Record<string, string>>,
};

/**
 * Retrieves the currently persisted language preference.
 * Falls back to `'bn'` when localStorage is unavailable (SSR) or unset.
 *
 * @returns The active language code
 */
function getStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'bn' || stored === 'en') {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Translates a dotted key path (e.g. `"intake.welcome_title"`) into
 * a localized string.
 *
 * @param key - Dot-separated key path matching the JSON structure (e.g. `"common.loading"`)
 * @param lang - Target language override; defaults to the stored preference
 * @returns The translated string, or the raw key if no match is found
 *
 * @example
 * ```ts
 * t('intake.welcome_title');        // "স্বাগতম! আজ কীভাবে সাহায্য করতে পারি?"
 * t('intake.welcome_title', 'en');  // "Welcome! How can we help you today?"
 * ```
 */
export function t(key: string, lang?: Language): string {
  const language = lang ?? getStoredLanguage();
  const dict = dictionaries[language];

  const parts = key.split('.');
  if (parts.length !== 2) {
    return key;
  }

  const [section, field] = parts;
  const sectionDict = dict[section];
  if (!sectionDict) {
    return key;
  }

  return sectionDict[field] ?? key;
}

/**
 * React hook that provides the current language and a setter.
 * Persists changes to localStorage and triggers re-renders.
 *
 * @returns `{ language, setLanguage, t }` — current language, setter, and a bound translate function
 *
 * @example
 * ```tsx
 * function LanguageToggle() {
 *   const { language, setLanguage, t } = useLanguage();
 *   return (
 *     <button onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}>
 *       {t('common.app_name')}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  /** Hydrate from localStorage after mount */
  useEffect(() => {
    setLanguageState(getStoredLanguage());
  }, []);

  /**
   * Updates the language preference in state and localStorage.
   *
   * @param lang - The new language to switch to
   */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_KEY, lang);
    }
  }, []);

  /**
   * Convenience translate function bound to the current language.
   *
   * @param key - Dot-separated translation key
   * @returns Translated string
   */
  const translate = useCallback(
    (key: string) => t(key, language),
    [language]
  );

  return { language, setLanguage, t: translate } as const;
}
