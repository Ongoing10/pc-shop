import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeConfig } from 'antd';
import { paletteOf, ThemeColors, ThemeMode } from '../theme/colors';
import { createAdminTheme, createAntdTheme } from '../theme/themeConfig';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  colors: ThemeColors;
  antdTheme: ThemeConfig;
  /** lớp chỉnh thêm cho /admin, lồng trong antdTheme */
  adminTheme: ThemeConfig;
  currentLanguage: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
}

const THEME_KEY = 'nexus_theme';

/** Chế độ đã lưu, chưa lưu thì theo hệ điều hành. index.html đọc cùng khóa để gắn data-theme trước khi React chạy (không nháy màu). */
const initialMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // bộ nhớ trình duyệt bị chặn
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguageState] = useState<'vi' | 'en'>(
    (i18n.language as 'vi' | 'en') || 'vi'
  );
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setLanguage = (lang: 'vi' | 'en') => {
    i18n.changeLanguage(lang);
    setCurrentLanguageState(lang);
    try {
      localStorage.setItem('nexus_lang', lang);
    } catch {
      // bộ nhớ trình duyệt bị chặn: vẫn đổi ngôn ngữ trong phiên hiện tại
    }
  };

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // bộ nhớ trình duyệt bị chặn: vẫn đổi chế độ trong phiên hiện tại
    }
  };

  useEffect(() => {
    if (i18n.language && i18n.language !== currentLanguage) {
      setCurrentLanguageState(i18n.language as 'vi' | 'en');
    }
    document.documentElement.lang = i18n.language || 'vi';
  }, [i18n.language]);

  // Biến CSS trong index.css đổi theo data-theme
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paletteOf(mode).background);
  }, [mode]);

  const value = useMemo(() => {
    const colors = paletteOf(mode);
    return {
      mode,
      colors,
      antdTheme: createAntdTheme(mode, colors),
      adminTheme: createAdminTheme(colors),
    };
  }, [mode]);

  return (
    <ThemeContext.Provider
      value={{
        ...value,
        setMode,
        toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark'),
        currentLanguage,
        setLanguage,
      }}
    >
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
