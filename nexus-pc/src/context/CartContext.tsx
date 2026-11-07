import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Product } from '../types/product';
import { CartItem, CartSummary } from '../types/cart';
import { storageService } from '../services/storage/storageService';

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  summary: CartSummary;
  isDrawerOpen: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'nexus_cart_items';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartItem[]>(() =>
    storageService.get<CartItem[]>(CART_STORAGE_KEY, [])
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    storageService.set(CART_STORAGE_KEY, cart);
  }, [cart]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [...prev, { ...product, qty: quantity }];
    });
    message.success(t('common.addedToCart', 'Đã thêm sản phẩm vào giỏ hàng'));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.id !== productId);
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, qty: quantity } : item
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const summary = useMemo<CartSummary>(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = 0; // Free shipping
    const discount = 0;
    const total = Math.max(0, subtotal - discount + shipping);

    return {
      subtotal,
      discount,
      shipping,
      total,
      totalItems: cartCount,
    };
  }, [cart, cartCount]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        summary,
        isDrawerOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
