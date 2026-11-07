import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeConfig } from 'antd';
import { colors, ThemeColors } from '../theme/colors';
import { antdDarkTheme } from '../theme/themeConfig';

interface ThemeContextType {
  colors: ThemeColors;
  antdTheme: ThemeConfig;
  currentLanguage: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguageState] = useState<'vi' | 'en'>(
    (i18n.language as 'vi' | 'en') || 'vi'
  );

  const setLanguage = (lang: 'vi' | 'en') => {
    i18n.changeLanguage(lang);
    setCurrentLanguageState(lang);
    try {
      localStorage.setItem('nexus_lang', lang);
    } catch {
      // bộ nhớ trình duyệt bị chặn: vẫn đổi ngôn ngữ trong phiên hiện tại
    }
  };

  useEffect(() => {
    if (i18n.language && i18n.language !== currentLanguage) {
      setCurrentLanguageState(i18n.language as 'vi' | 'en');
    }
    document.documentElement.lang = i18n.language || 'vi';
  }, [i18n.language]);

  return (
    <ThemeContext.Provider value={{ colors, antdTheme: antdDarkTheme, currentLanguage, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
