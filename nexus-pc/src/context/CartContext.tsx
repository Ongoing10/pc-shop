import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Product } from '../types/product';
import { CartItem, CartSummary } from '../types/cart';
import {
  EMPTY_CART,
  cartKeys,
  useAddCartItem,
  useAddCartItems,
  useCartQuery,
  useClearCart,
  useRemoveCartItem,
  useSetCartQuantity,
} from '../hooks/useCartApi';

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  summary: CartSummary;
  isDrawerOpen: boolean;
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  addItemsToCart: (items: Array<{ product: Product; quantity: number }>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Giỏ hàng nằm ở cart-service (Redis); context chỉ giữ trạng thái ngăn kéo và gói lại các lời gọi API */
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: view = EMPTY_CART, isLoading } = useCartQuery(isAuthenticated);
  const addItem = useAddCartItem();
  const addItems = useAddCartItems();
  const setQuantity = useSetCartQuantity();
  const removeItem = useRemoveCartItem();
  const clear = useClearCart();

  // Đăng xuất: bỏ giỏ của tài khoản cũ khỏi bộ nhớ đệm
  useEffect(() => {
    if (!isAuthenticated) queryClient.removeQueries({ queryKey: cartKeys.all });
  }, [isAuthenticated, queryClient]);

  const showError = (err: Error) => message.error(err.message);

  /** Chưa đăng nhập thì chuyển sang trang đăng nhập, xong quay lại đúng trang đang xem */
  const ensureLoggedIn = () => {
    if (isAuthenticated) return true;
    message.info(t('common.loginToAddToCart', 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng'));
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  };

  const addToCart = (product: Product, quantity = 1) => {
    if (!ensureLoggedIn()) return;
    addItem.mutate(
      { sku: product.id, quantity },
      {
        onSuccess: () => message.success(t('common.addedToCart', 'Đã thêm sản phẩm vào giỏ hàng')),
        onError: showError,
      }
    );
  };

  /** Thêm nhiều món một lần (cả cấu hình PC), chỉ báo một thông báo */
  const addItemsToCart = (items: Array<{ product: Product; quantity: number }>) => {
    if (items.length === 0 || !ensureLoggedIn()) return;
    addItems.mutate(
      items.map(({ product, quantity }) => ({ sku: product.id, quantity })),
      {
        onSuccess: () =>
          message.success(
            t('common.addedManyToCart', { count: items.length, defaultValue: `Đã thêm ${items.length} sản phẩm vào giỏ hàng` })
          ),
        onError: showError,
      }
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setQuantity.mutate({ sku: productId, quantity: Math.min(99, Math.max(0, quantity)) }, { onError: showError });
  };

  const removeFromCart = (productId: string) => {
    removeItem.mutate(productId, { onError: showError });
  };

  const clearCart = () => {
    clear.mutate(undefined, { onError: showError });
  };

  const cart = view.items;
  const cartCount = view.totalQuantity;

  const summary = useMemo<CartSummary>(() => {
    const subtotal = view.subtotal;
    // Phí ship và giảm giá do POST /checkout/preview tính ở trang thanh toán
    const shipping = 0;
    const discount = 0;
    return { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping), totalItems: cartCount };
  }, [view.subtotal, cartCount]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        summary,
        isDrawerOpen,
        isLoading,
        addToCart,
        addItemsToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
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
