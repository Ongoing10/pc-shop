import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { CompareFloatBar } from '../compare/CompareFloatBar';
import { ScrollToTop } from '../common/ScrollToTop';
import { ChatWidget } from '../chat/ChatWidget';

export const MainLayout: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <Footer />
      <CartDrawer />
      <CompareFloatBar />
      <ScrollToTop />
      <ChatWidget />
    </div>
  );
};
