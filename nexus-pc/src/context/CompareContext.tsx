import React, { createContext, useContext, useState, ReactNode } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

interface CompareContextType {
  compareIds: string[];
  isComparing: (productId: string) => boolean;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  compareCount: number;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { t } = useTranslation();

  const isComparing = (productId: string) => compareIds.includes(productId);

  const toggleCompare = (productId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 4) {
        message.warning(t('compare.maxCompareWarning', 'Tối đa chỉ có thể so sánh 4 sản phẩm'));
        return prev;
      }
      return [...prev, productId];
    });
  };

  const clearCompare = () => setCompareIds([]);

  return (
    <CompareContext.Provider
      value={{
        compareIds,
        isComparing,
        toggleCompare,
        clearCompare,
        compareCount: compareIds.length,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = (): CompareContextType => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
