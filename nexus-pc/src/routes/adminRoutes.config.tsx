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
const ProductFormPage = lazy(() =>
  import('../pages/Admin/Products/ProductFormPage').then((m) => ({ default: m.ProductFormPage }))
);
const ImportExcelPage = lazy(() =>
  import('../pages/Admin/ImportExcel').then((m) => ({ default: m.ImportExcelPage }))
);
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
  operate: 'Vận hành',
  catalog: 'Sản phẩm',
  system: 'Hệ thống',
};

export const adminRoutesConfig: AdminRouteConfig[] = [
  { path: '', element: <DashboardPage />, title: 'Tổng quan', menu: { group: 'operate', icon: <DashboardOutlined /> } },
  { path: 'orders', element: <AdminOrdersPage />, title: 'Đơn hàng', menu: { group: 'operate', icon: <ShoppingCartOutlined /> } },
  { path: 'orders/:code', element: <AdminOrderDetailPage />, title: 'Chi tiết đơn hàng', menuKey: 'orders' },
  { path: 'refunds', element: <RefundsPage />, title: 'Hoàn tiền', menu: { group: 'operate', icon: <RollbackOutlined /> } },
  { path: 'inventory', element: <InventoryPage />, title: 'Tồn kho', menu: { group: 'operate', icon: <DatabaseOutlined /> } },
  {
    path: 'inventory/import',
    element: <ImportExcelPage kind="inventory" />,
    title: 'Nhập kho từ Excel',
    access: { permission: 'inventory:write' },
    menuKey: 'inventory',
  },
  { path: 'reviews', element: <ReviewsPage />, title: 'Duyệt đánh giá', menu: { group: 'operate', icon: <StarOutlined /> } },

  {
    path: 'products',
    element: <AdminProductsPage />,
    title: 'Sản phẩm',
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <AppstoreOutlined /> },
  },
  {
    path: 'products/new',
    element: <ProductFormPage />,
    title: 'Thêm sản phẩm',
    access: { permission: 'product:write' },
    menuKey: 'products',
  },
  {
    path: 'products/import',
    element: <ImportExcelPage kind="products" />,
    title: 'Import sản phẩm từ Excel',
    access: { permission: 'product:write' },
    menuKey: 'products',
  },
  {
    path: 'products/:sku',
    element: <ProductFormPage />,
    title: 'Sửa sản phẩm',
    access: { permission: 'product:write' },
    menuKey: 'products',
  },
  {
    path: 'categories',
    element: <CategoriesPage />,
    title: 'Danh mục',
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <TagsOutlined /> },
  },
  {
    path: 'brands',
    element: <BrandsPage />,
    title: 'Thương hiệu',
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <TrademarkOutlined /> },
  },
  {
    path: 'compatibility-rules',
    element: <RulesPage />,
    title: 'Luật tương thích',
    access: { permission: 'product:write' },
    menu: { group: 'catalog', icon: <ApiOutlined /> },
  },

  { path: 'vouchers', element: <VouchersPage />, title: 'Voucher', access: { role: 'ADMIN' }, menu: { group: 'system', icon: <GiftOutlined /> } },
  {
    path: 'users',
    element: <UsersPage />,
    title: 'Người dùng & phân quyền',
    access: { role: 'ADMIN' },
    menu: { group: 'system', icon: <TeamOutlined />, label: 'Người dùng' },
  },
  {
    path: 'knowledge',
    element: <KnowledgePage />,
    title: 'Kho tri thức AI',
    access: { permission: 'knowledge:write' },
    menu: { group: 'system', icon: <RobotOutlined /> },
  },
];
