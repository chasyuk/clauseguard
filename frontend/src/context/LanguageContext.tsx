import React, { createContext, useContext, useState } from 'react';
import { translations, UILanguage } from '../i18n/translations';

interface LanguageContextValue {
  lang: UILanguage;
  setLang: (lang: UILanguage) => void;
  t: (typeof translations)['en'] | (typeof translations)['uk'];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<UILanguage>(() => {
    const saved = localStorage.getItem('cg_lang');
    return saved === 'uk' ? 'uk' : 'en';
  });

  const setLang = (next: UILanguage) => {
    localStorage.setItem('cg_lang', next);
    setLangState(next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
