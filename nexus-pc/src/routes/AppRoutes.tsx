import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import { MainLayout } from '../components/layout/MainLayout';
import { AdminLayout, AdminRoot } from '../components/admin/AdminLayout';
import { AdminGuard } from '../components/admin/AdminGuard';
import { appRoutesConfig } from './routes.config';
import { adminRoutesConfig } from './adminRoutes.config';

const AdminLoginPage = lazy(() => import('../pages/Admin/Login').then((m) => ({ default: m.AdminLoginPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      }
    >
      <Routes>
        <Route element={<MainLayout />}>
          {appRoutesConfig.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.element}
            />
          ))}
        </Route>

        {/* Khu quản trị: layout riêng, không có header/footer của trang khách */}
        <Route path="/admin" element={<AdminRoot />}>
          <Route path="login" element={<AdminLoginPage />} />
          {/* Các trang cần đăng nhập: AdminLayout chuyển về /admin/login nếu chưa có phiên */}
          <Route element={<AdminLayout />}>
            {adminRoutesConfig.map((route) =>
              route.path === '' ? (
                <Route key="index" index element={<AdminGuard access={route.access}>{route.element}</AdminGuard>} />
              ) : (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<AdminGuard access={route.access}>{route.element}</AdminGuard>}
                />
              )
            )}
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};
