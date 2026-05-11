import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en';
import mr from '../i18n/mr';

const DICT = { en, mr };
const KEY = 'sweetpos:lang';
const I18nContext = createContext(null);

const get = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(KEY) || 'en');

  useEffect(() => {
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      languages: [
        { value: 'en', label: 'English' },
        { value: 'mr', label: 'मराठी' },
      ],
      t: (path, fallback) => {
        const v = get(DICT[lang] || DICT.en, path);
        if (v != null) return v;
        const fallbackVal = get(DICT.en, path);
        return fallbackVal != null ? fallbackVal : fallback || path;
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
