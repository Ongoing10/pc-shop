import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useAppTheme } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { FavoritesProvider } from './FavoritesContext';
import { CompareProvider } from './CompareContext';
import { BuilderProvider } from './BuilderContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AntdLocalizedWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const { antdTheme } = useAppTheme();
  const antdLocale = i18n.language === 'en' ? enUS : viVN;

  return (
    <ConfigProvider locale={antdLocale} theme={antdTheme}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
};

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AntdLocalizedWrapper>
          <BrowserRouter>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <CompareProvider>
                    <BuilderProvider>{children}</BuilderProvider>
                  </CompareProvider>
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </AntdLocalizedWrapper>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
