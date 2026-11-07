import React from 'react';
import { HomePage } from '../pages/Home';
import { ProductsPage } from '../pages/Products';
import { CategoriesPage } from '../pages/Categories';
import { ProductDetailPage } from '../pages/ProductDetail';
import { PCBuilderPage } from '../pages/PCBuilder';
import { ComparePage } from '../pages/Compare';
import { CartPage } from '../pages/Cart';
import { CheckoutPage } from '../pages/Checkout';
import { AccountPage } from '../pages/Account';
import { TrackOrderPage } from '../pages/TrackOrder';
import { AuthPage } from '../pages/Auth';
import { ForgotPasswordPage } from '../pages/Auth/ForgotPassword';
import { ChangePasswordPage } from '../pages/Auth/ChangePassword';
import { NotFoundPage } from '../pages/NotFound';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  titleKey: string;
  defaultTitle: string;
  showInNav?: boolean;
  requiresAuth?: boolean;
  dynamicParams?: string[];
}

export const appRoutesConfig: RouteConfig[] = [
  {
    path: '/',
    element: <HomePage />,
    titleKey: 'nav.home',
    defaultTitle: 'Trang chủ',
    showInNav: false,
  },
  {
    path: '/products',
    element: <ProductsPage />,
    titleKey: 'nav.products',
    defaultTitle: 'Sản phẩm',
    showInNav: true,
  },
  {
    path: '/components',
    element: <CategoriesPage />,
    titleKey: 'nav.components',
    defaultTitle: 'Linh kiện',
    showInNav: true,
  },
  {
    path: '/product/:id',
    element: <ProductDetailPage />,
    titleKey: 'nav.productDetail',
    defaultTitle: 'Chi tiết sản phẩm',
    showInNav: false,
    dynamicParams: ['id'],
  },
  {
    path: '/builder',
    element: <PCBuilderPage />,
    titleKey: 'nav.builder',
    defaultTitle: 'PC Builder',
    showInNav: true,
  },
  {
    path: '/compare',
    element: <ComparePage />,
    titleKey: 'nav.compare',
    defaultTitle: 'So sánh sản phẩm',
    showInNav: true,
  },
  {
    path: '/cart',
    element: <CartPage />,
    titleKey: 'nav.cart',
    defaultTitle: 'Giỏ hàng',
    showInNav: false,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
    titleKey: 'checkout.title',
    defaultTitle: 'Thanh toán',
    showInNav: false,
  },
  {
    path: '/account',
    element: <AccountPage />,
    titleKey: 'nav.account',
    defaultTitle: 'Tài khoản',
    showInNav: false,
  },
  {
    path: '/account/orders',
    element: <AccountPage />,
    titleKey: 'account.tabOrders',
    defaultTitle: 'Đơn hàng của tôi',
    showInNav: false,
  },
  {
    path: '/track-order',
    element: <TrackOrderPage />,
    titleKey: 'nav.trackOrder',
    defaultTitle: 'Tra cứu đơn hàng',
    showInNav: false,
  },
  {
    path: '/login',
    element: <AuthPage />,
    titleKey: 'nav.login',
    defaultTitle: 'Đăng nhập',
    showInNav: false,
  },
  {
    path: '/register',
    element: <AuthPage />,
    titleKey: 'auth.btnRegister',
    defaultTitle: 'Đăng ký tài khoản',
    showInNav: false,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    titleKey: 'auth.forgotTitle',
    defaultTitle: 'Khôi phục mật khẩu',
    showInNav: false,
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    titleKey: 'auth.changePasswordTitle',
    defaultTitle: 'Đổi mật khẩu',
    showInNav: false,
  },
  {
    path: '*',
    element: <NotFoundPage />,
    titleKey: 'common.notFound',
    defaultTitle: 'Không tìm thấy trang',
    showInNav: false,
  },
];
