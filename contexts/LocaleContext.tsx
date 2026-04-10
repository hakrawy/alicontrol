import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultPreferences, getPreferences, updatePreferences } from '../services/preferences';
import { AppLanguage, translate } from '../constants/i18n';

interface LocaleContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: Parameters<typeof translate>[1] extends infer K ? (key: K & string) => string : never;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(defaultPreferences.language as AppLanguage);

  useEffect(() => {
    void (async () => {
      const preferences = await getPreferences();
      setLanguageState((preferences.language === 'Arabic' ? 'Arabic' : 'English') as AppLanguage);
    })();
  }, []);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    await updatePreferences({ language: nextLanguage });
    setLanguageState(nextLanguage);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key: Parameters<typeof translate>[1]) => translate(language, key),
  }), [language]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
}

