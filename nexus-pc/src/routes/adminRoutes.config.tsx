import React, { lazy } from 'react';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  StarOutlined,
  AppstoreOutlined,
  TagsOutlined,
  TrademarkOutlined,
  ApiOutlined,
  GiftOutlined,
  TeamOutlined,
  RobotOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { AdminAccess } from '../context/AdminSessionContext';
import { t } from '../i18n/t';

// Tách bundle: khách hàng không phải tải code trang quản trị
const DashboardPage = lazy(() => import('../pages/Admin/Dashboard').then((m) => ({ default: m.DashboardPage })));
const AdminOrdersPage = lazy(() => import('../pages/Admin/Orders').then((m) => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() =>
  import('../pages/Admin/Orders/OrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage }))
);
const RefundsPage = lazy(() => import('../pages/Admin/Refunds').then((m) => ({ default: m.RefundsPage })));
const InventoryPage = lazy(() => import('../pages/Admin/Inventory').then((m) => ({ default: m.InventoryPage })));
const ReviewsPage = lazy(() => import('../pages/Admin/Reviews').then((m) => ({ default: m.ReviewsPage })));
const AdminProductsPage = lazy(() => import('../pages/Admin/Products').then((m) => ({ default: m.AdminProductsPage })));
const CategoriesPage = lazy(() =>
  import('../pages/Admin/Catalog/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const BrandsPage = lazy(() => import('../pages/Admin/Catalog/BrandsPage').then((m) => ({ default: m.BrandsPage })));
const RulesPage = lazy(() => import('../pages/Admin/Catalog/RulesPage').then((m) => ({ default: m.RulesPage })));
const VouchersPage = lazy(() => import('../pages/Admin/Vouchers').then((m) => ({ default: m.VouchersPage })));
const UsersPage = lazy(() => import('../pages/Admin/Users').then((m) => ({ default: m.UsersPage })));
const KnowledgePage = lazy(() => import('../pages/Admin/Knowledge').then((m) => ({ default: m.KnowledgePage })));

export interface AdminRouteConfig {
  /** đường dẫn con, tương đối với /admin ('' = /admin) */
  path: string;
  element: React.ReactNode;
  title: string;
  access?: AdminAccess;
  /** có trong sidebar; route con (chi tiết, form) để trống */
  menu?: { group: 'operate' | 'catalog' | 'system'; icon: React.ReactNode; label?: string };
  /** mục sidebar được sáng khi đang ở route này (route con) */
  menuKey?: string;
}

export const ADMIN_MENU_GROUPS: Record<NonNullable<AdminRouteConfig['menu']>['group'], string> = {
  get operate() { return t('admin.menu.operations', 'Vận hành'); },
  get catalog() { return t('admin.common.products', 'Sản phẩm'); },
  get system() { return t('admin.common.system', 'Hệ thống'); },
};

export const adminRoutesConfig: AdminRouteConfig[] = [
  { path: '', element: <DashboardPage />, get title() { return t('admin.common.overview', 'Tổng quan'); }, menu: { group: 'operate', icon: <DashboardOutlined /> } },
  { path: 'orders', element: <AdminOrdersPage />, get title() { return t('admin.common.orders', 'Đơn hàng'); }, menu: { group: 'operate', icon: <ShoppingCartOutlined /> } },
  { path: 'orders/:code', element: <AdminOrderDetailPage />, get title() { return t('admin.menu.orderDetails', 'Chi tiết đơn hàng'); }, menuKey: 'orders' },
  { path: 'refunds', element: <RefundsPage />, get title() { return t('admin.common.refunds', 'Hoàn tiền'); }, menu: { group: 'operate', icon: <RollbackOutlined /> } },
  { path: 'inventory', element: <InventoryPage />, get title() { return t('admin.common.inventory', 'Tồn kho'); }, menu: { group: 'operate', icon: <DatabaseOutlined /> } },
  { path: 'reviews', element: <ReviewsPage />, get title() { return t('admin.common.reviewModeration', 'Duyệt đánh giá'); }, menu: { group: 'operate', icon: <StarOutlined /> } },

  {
    path: 'products',
    element: <AdminProductsPage />,
    get title() { return t('admin.common.products', 'Sản phẩm'); },
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <AppstoreOutlined /> },
  },
  {
    path: 'categories',
    element: <CategoriesPage />,
    get title() { return t('admin.menu.categories', 'Danh mục'); },
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <TagsOutlined /> },
  },
  {
    path: 'brands',
    element: <BrandsPage />,
    get title() { return t('admin.common.brands', 'Thương hiệu'); },
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <TrademarkOutlined /> },
  },
  {
    path: 'compatibility-rules',
    element: <RulesPage />,
    get title() { return t('admin.common.compatibilityRules', 'Luật tương thích'); },
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <ApiOutlined /> },
  },

  { path: 'vouchers', element: <VouchersPage />, title: 'Voucher', access: { role: 'ADMIN' }, menu: { group: 'system', icon: <GiftOutlined /> } },
  {
    path: 'users',
    element: <UsersPage />,
    get title() { return t('admin.common.usersPermissions', 'Người dùng & phân quyền'); },
    access: { role: 'ADMIN' },
    menu: { group: 'system', icon: <TeamOutlined />, get label() { return t('admin.menu.users', 'Người dùng'); } },
  },
  {
    path: 'knowledge',
    element: <KnowledgePage />,
    get title() { return t('admin.common.aiKnowledgeBase', 'Kho tri thức AI'); },
    access: { permission: 'knowledge:write' },
    menu: { group: 'system', icon: <RobotOutlined /> },
  },
];
