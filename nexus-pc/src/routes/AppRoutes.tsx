import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import { MainLayout } from '../components/layout/MainLayout';
import { appRoutesConfig } from './routes.config';

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
      </Routes>
    </Suspense>
  );
};
