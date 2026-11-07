import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { storageService } from '../services/storage/storageService';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  clearFavorites: () => void;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVS_KEY = 'nexus_favorites_ids';

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>(() =>
    storageService.get<string[]>(FAVS_KEY, [])
  );

  useEffect(() => {
    storageService.set(FAVS_KEY, favorites);
  }, [favorites]);

  const isFavorite = (productId: string) => favorites.includes(productId);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        message.info('Đã xóa khỏi danh sách yêu thích');
        return prev.filter((id) => id !== productId);
      } else {
        message.success('Đã lưu vào danh sách yêu thích');
        return [...prev, productId];
      }
    });
  };

  const clearFavorites = () => setFavorites([]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        clearFavorites,
        favoritesCount: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
