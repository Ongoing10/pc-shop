import React, { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from 'react';
import {
  AdminBrand,
  AdminCategory,
  AdminOrder,
  AdminOrderStatusHistory,
  AdminPayment,
  AdminProduct,
  AdminRefund,
  AdminReview,
  AdminUser,
  AdminVoucher,
  CompatibilityRule,
  Inventory,
  StockMovement,
  Warehouse,
} from '../types/admin';
import {
  mockBrands,
  mockCategories,
  mockInventories,
  mockMovements,
  mockOrderHistories,
  mockOrders,
  mockPayments,
  mockProducts,
  mockRefunds,
  mockReviews,
  mockRules,
  mockUsers,
  mockVouchers,
  mockWarehouses,
} from '../services/api/adminMockData';

type State<T> = [T[], Dispatch<SetStateAction<T[]>>];

/**
 * Kho dữ liệu giả dùng chung cho mọi trang admin, để thao tác ở trang này hiện đúng ở trang khác trong cùng phiên.
 * Khi ghép API: thay từng cặp state bằng hook react-query (useQuery + useMutation) và bỏ context này.
 */
interface AdminDataContextType {
  products: State<AdminProduct>;
  categories: State<AdminCategory>;
  brands: State<AdminBrand>;
  rules: State<CompatibilityRule>;
  orders: State<AdminOrder>;
  orderHistories: State<AdminOrderStatusHistory>;
  payments: State<AdminPayment>;
  refunds: State<AdminRefund>;
  vouchers: State<AdminVoucher>;
  warehouses: State<Warehouse>;
  inventories: State<Inventory>;
  movements: State<StockMovement>;
  reviews: State<AdminReview>;
  users: State<AdminUser>;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export const AdminDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value: AdminDataContextType = {
    products: useState(mockProducts),
    categories: useState(mockCategories),
    brands: useState(mockBrands),
    rules: useState(mockRules),
    orders: useState(mockOrders),
    orderHistories: useState(mockOrderHistories),
    payments: useState(mockPayments),
    refunds: useState(mockRefunds),
    vouchers: useState(mockVouchers),
    warehouses: useState(mockWarehouses),
    inventories: useState(mockInventories),
    movements: useState(mockMovements),
    reviews: useState(mockReviews),
    users: useState(mockUsers),
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};

export const useAdminData = (): AdminDataContextType => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
};

/** Giả lập độ trễ mạng để nút có trạng thái loading như khi gọi API thật */
export const fakeLatency = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms));
