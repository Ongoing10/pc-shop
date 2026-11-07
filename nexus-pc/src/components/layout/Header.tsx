import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Badge, Drawer, Dropdown, MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { MenuOutlined, SearchOutlined, DownOutlined, LogoutOutlined } from '@ant-design/icons';
import { FiShoppingCart, FiUser, FiTruck, FiHeadphones, FiLock, FiPackage, FiShield } from 'react-icons/fi';
import { BsArrowLeftRight, BsCpu, BsGrid } from 'react-icons/bs';
import { Logo } from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { CategoryIcon } from '../common/CategoryIcon';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../hooks/useCategories';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartCount, openDrawer } = useCart();
  const { compareCount } = useCompare();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: categories = [] } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const firstName = user?.fullName.split(' ').slice(-1)[0] ?? '';

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <FiUser />,
      label: <Link to="/account">{t('account.tabProfile', 'Thông tin tài khoản')}</Link>,
    },
    {
      key: 'orders',
      icon: <FiPackage />,
      label: <Link to="/account">{t('account.tabOrders', 'Đơn hàng của tôi')}</Link>,
    },
    {
      key: 'change-password',
      icon: <FiLock />,
      label: <Link to="/change-password">{t('auth.changePasswordTitle', 'Đổi mật khẩu')}</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: t('account.logout', 'Đăng xuất'),
      onClick: handleLogout,
    },
  ];

  const categoryMenuItems: MenuProps['items'] = [
    ...categories.map((c) => ({
      key: c.id,
      icon: <CategoryIcon id={c.id} />,
      label: <Link to={`/products?category=${c.id}`}>{c.name}</Link>,
    })),
    { type: 'divider' as const },
    {
      key: 'all',
      icon: <BsGrid />,
      label: <Link to="/products">{t('nav.allComponents', 'Tất cả linh kiện')}</Link>,
    },
  ];

  const navLinks = (
    <>
      <NavLink to="/builder">
        <BsCpu aria-hidden="true" />
        {t('nav.builder', 'PC Builder')}
      </NavLink>
      <NavLink to="/compare">
        <BsArrowLeftRight aria-hidden="true" />
        {t('nav.compare', 'So sánh')}
        {compareCount > 0 && <span className="count">{compareCount}</span>}
      </NavLink>
      <Link to="/products?sort=discount">{t('nav.deals', 'Khuyến mãi')}</Link>
    </>
  );

  return (
    <>
      <div className="topline">
        <div className="container">
          <div className="topline-info">
            <span>
              <FiShield aria-hidden="true" />
              {t('topline.genuine', 'Linh kiện PC chính hãng')}
            </span>
            <span>
              <FiTruck aria-hidden="true" />
              {t('topline.delivery', 'Giao hàng toàn quốc')}
            </span>
            <span>
              <FiHeadphones aria-hidden="true" />
              {t('topline.support', 'Hotline 1900 6868 · 8:00–21:30')}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <header className="header">
        <div className="container head">
          <button
            className="mobile"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mở menu"
            type="button"
          >
            <MenuOutlined />
          </button>

          <Logo />

          <form className="search" onSubmit={handleSearchSubmit} role="search">
            <SearchOutlined aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.searchPlaceholder', 'Tìm linh kiện, thương hiệu, mã sản phẩm...')}
              aria-label={t('common.search', 'Tìm kiếm')}
            />
            <button type="submit" aria-label={t('common.search', 'Tìm kiếm')}>
              <SearchOutlined aria-hidden="true" />
              <span className="search-label">{t('common.search', 'Tìm kiếm')}</span>
            </button>
          </form>

          <div className="head-actions">
            {isAuthenticated && user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                <button type="button" aria-label={t('nav.account', 'Tài khoản')}>
                  <span className="avatar" aria-hidden="true">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                  <span className="head-label">
                    {firstName}
                    <small>
                      {t('nav.account', 'Tài khoản')} <DownOutlined style={{ fontSize: 13 }} />
                    </small>
                  </span>
                </button>
              </Dropdown>
            ) : (
              <Link to="/login">
                <FiUser aria-hidden="true" />
                <span className="head-label">
                  {t('nav.login', 'Đăng nhập')}
                  <small>{t('nav.account', 'Tài khoản')}</small>
                </span>
              </Link>
            )}

            <button onClick={openDrawer} type="button" aria-label={`${t('nav.cart', 'Giỏ hàng')} (${cartCount})`}>
              <Badge count={cartCount} offset={[2, -2]} overflowCount={99} color="var(--accent)" style={{ color: 'var(--on-accent)', fontWeight: 700 }}>
                <FiShoppingCart style={{ fontSize: 20, color: 'var(--text)' }} aria-hidden="true" />
              </Badge>
              <span className="head-label">{t('nav.cart', 'Giỏ hàng')}</span>
            </button>
          </div>
        </div>

        <nav className="container nav" aria-label="Điều hướng chính">
          <Dropdown menu={{ items: categoryMenuItems }} trigger={['hover', 'click']}>
            <button type="button" className="navcat">
              <BsGrid aria-hidden="true" />
              {t('nav.categories', 'Danh mục')}
              <DownOutlined style={{ fontSize: 13 }} />
            </button>
          </Dropdown>
          <div className="nav-links">{navLinks}</div>
          <Link className="nav-aside" to="/track-order">
            <FiTruck aria-hidden="true" />
            {t('nav.trackOrder', 'Tra cứu đơn hàng')}
          </Link>
        </nav>
      </header>

      <Drawer
        title={<Logo />}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        placement="left"
        styles={{ wrapper: { width: 320, maxWidth: '86vw' } }}
      >
        <div className="mobile-links" onClick={() => setMobileMenuOpen(false)}>
          {navLinks}
          <Link to="/track-order">
            <FiTruck aria-hidden="true" /> {t('nav.trackOrder', 'Tra cứu đơn hàng')}
          </Link>

          <div className="group">
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`}>
                <CategoryIcon id={c.id} /> {c.name}
              </Link>
            ))}
          </div>

          <div className="group">
            {isAuthenticated ? (
              <>
                <Link to="/account">
                  <FiUser aria-hidden="true" /> {t('nav.account', 'Tài khoản')}
                </Link>
                <Link to="/change-password">
                  <FiLock aria-hidden="true" /> {t('auth.changePasswordTitle', 'Đổi mật khẩu')}
                </Link>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                >
                  <LogoutOutlined aria-hidden="true" /> {t('account.logout', 'Đăng xuất')}
                </a>
              </>
            ) : (
              <Link to="/login">
                <FiUser aria-hidden="true" /> {t('nav.login', 'Đăng nhập')}
              </Link>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
};
