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
import { OrdersPage } from '../pages/Account/OrdersPage';
import { OrderDetailPage } from '../pages/Account/OrderDetailPage';
import { MockGatewayPage } from '../pages/Payment/MockGateway';
import { PaymentResultPage } from '../pages/Payment/Result';
import { AddressesPage } from '../pages/Account/AddressesPage';
import { BuildsPage } from '../pages/Account/BuildsPage';
import { NotificationsPage } from '../pages/Account/NotificationsPage';
import { SecurityPage } from '../pages/Account/SecurityPage';
import { FavoritesPage } from '../pages/Favorites';
import { SharedBuildPage } from '../pages/SharedBuild';
import { TrackOrderRedirect } from './TrackOrderRedirect';
import { AuthPage } from '../pages/Auth';
import { ForgotPasswordPage } from '../pages/Auth/ForgotPassword';
import { ChangePasswordPage } from '../pages/Auth/ChangePassword';
import { NotFoundPage } from '../pages/NotFound';
import { AboutPage } from '../pages/About';
import { PolicyPage } from '../pages/Policy';

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
    requiresAuth: true,
  },
  {
    path: '/account',
    element: <AccountPage />,
    titleKey: 'nav.account',
    defaultTitle: 'Tài khoản',
    showInNav: false,
    requiresAuth: true,
  },
  {
    path: '/account/orders',
    element: <OrdersPage />,
    titleKey: 'account.tabOrders',
    defaultTitle: 'Đơn hàng của tôi',
    showInNav: false,
    requiresAuth: true,
  },
  {
    path: '/account/orders/:code',
    element: <OrderDetailPage />,
    titleKey: 'orders.order',
    defaultTitle: 'Chi tiết đơn hàng',
    showInNav: false,
    requiresAuth: true,
    dynamicParams: ['code'],
  },
  {
    // backend (pcshop.payment.frontend-return-url) chuyển về đây sau khi thanh toán
    path: '/orders/payment-result',
    element: <PaymentResultPage />,
    titleKey: 'payment.resultTitle',
    defaultTitle: 'Kết quả thanh toán',
    showInNav: false,
  },
  {
    // chỉ dùng khi chạy mock; bản thật trang này do backend / VNPay phục vụ
    path: '/payment/mock/:paymentCode',
    element: <MockGatewayPage />,
    titleKey: 'payment.mockTitle',
    defaultTitle: 'Cổng thanh toán giả lập',
    showInNav: false,
    dynamicParams: ['paymentCode'],
  },
  {
    path: '/account/addresses',
    element: <AddressesPage />,
    titleKey: 'account.tabAddresses',
    defaultTitle: 'Sổ địa chỉ',
    showInNav: false,
    requiresAuth: true,
  },
  {
    path: '/account/builds',
    element: <BuildsPage />,
    titleKey: 'account.tabBuilds',
    defaultTitle: 'Cấu hình PC đã lưu',
    showInNav: false,
    requiresAuth: true,
  },
  {
    path: '/account/notifications',
    element: <NotificationsPage />,
    titleKey: 'account.tabNotifications',
    defaultTitle: 'Thông báo',
    showInNav: false,
    requiresAuth: true,
  },
  {
    path: '/account/security',
    element: <SecurityPage />,
    titleKey: 'account.tabSecurity',
    defaultTitle: 'Bảo mật tài khoản',
    showInNav: false,
    requiresAuth: true,
  },
  {
    path: '/favorites',
    element: <FavoritesPage />,
    titleKey: 'favorites.title',
    defaultTitle: 'Sản phẩm yêu thích',
    showInNav: false,
  },
  {
    path: '/build/:code',
    element: <SharedBuildPage />,
    titleKey: 'sharedBuild.crumb',
    defaultTitle: 'Cấu hình chia sẻ',
    showInNav: false,
    dynamicParams: ['code'],
  },
  {
    // Trang tra cứu cũ đã gộp vào "Đơn hàng của tôi"; giữ đường dẫn để link cũ không hỏng
    path: '/track-order',
    element: <TrackOrderRedirect />,
    titleKey: 'account.tabOrders',
    defaultTitle: 'Đơn hàng của tôi',
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
    path: '/about',
    element: <AboutPage />,
    titleKey: 'nav.about',
    defaultTitle: 'Về NEXUS PC',
    showInNav: false,
  },
  {
    path: '/policy/:slug?',
    element: <PolicyPage />,
    titleKey: 'nav.policy',
    defaultTitle: 'Chính sách',
    showInNav: false,
    dynamicParams: ['slug'],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    titleKey: 'common.notFound',
    defaultTitle: 'Không tìm thấy trang',
    showInNav: false,
  },
];
