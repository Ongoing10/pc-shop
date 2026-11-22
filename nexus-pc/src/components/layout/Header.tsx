import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, ConfigProvider, Drawer, Dropdown, Form, Input, Menu, MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { MenuOutlined, SearchOutlined, DownOutlined, LogoutOutlined } from '@ant-design/icons';
import { FiShoppingCart, FiUser, FiTruck, FiHeadphones, FiLock, FiPackage, FiInfo, FiFileText, FiHeart, FiMapPin, FiCpu, FiBell } from 'react-icons/fi';
import { BsArrowLeftRight, BsCpu, BsGrid } from 'react-icons/bs';
import { Logo } from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { NotificationBell } from '../notification/NotificationBell';
import { CategoryIcon } from '../common/CategoryIcon';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useCategories } from '../../hooks/useCategories';
import { useAppTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../common/ThemeToggle';
import type { ThemeColors } from '../../theme/colors';

/** Menu ngang điều hướng: chữ đậm màu khi chọn, không nền; gạch chân màu nhấn chỉnh ở CSS (.nav-menu) */
const navMenuTheme = (colors: ThemeColors) => ({
  components: {
    Menu: {
      itemColor: colors.textSecondary,
      horizontalItemHoverColor: colors.textPrimary,
      horizontalItemSelectedColor: colors.textPrimary,
      horizontalItemSelectedBg: 'transparent',
      horizontalLineHeight: '47px',
      itemPaddingInline: 12,
      activeBarHeight: 2,
    },
  },
});

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, openDrawer } = useCart();
  const { compareCount } = useCompare();
  const { user, isAuthenticated, logout } = useAuth();
  const { favoritesCount } = useFavorites();
  const { data: categories = [] } = useCategories();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { colors } = useAppTheme();

  const handleSearchSubmit = ({ q }: { q?: string }) => {
    const query = q?.trim() ?? '';
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
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
      label: <Link to="/account/orders">{t('account.tabOrders', 'Đơn hàng của tôi')}</Link>,
    },
    {
      key: 'addresses',
      icon: <FiMapPin />,
      label: <Link to="/account/addresses">{t('account.tabAddresses', 'Sổ địa chỉ')}</Link>,
    },
    {
      key: 'builds',
      icon: <FiCpu />,
      label: <Link to="/account/builds">{t('account.tabBuilds', 'Cấu hình PC đã lưu')}</Link>,
    },
    {
      key: 'security',
      icon: <FiLock />,
      label: <Link to="/account/security">{t('account.tabSecurity', 'Bảo mật tài khoản')}</Link>,
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
        {compareCount > 0 && <Badge count={compareCount} color="var(--accent-solid)" className="count-badge" />}
      </NavLink>
      <Link to="/products?sort=discount">{t('nav.deals', 'Khuyến mãi')}</Link>
    </>
  );

  // Key là đường dẫn đích, bấm vào thì điều hướng
  const navItems: Array<{ key: string; label: React.ReactNode }> = [
    {
      key: '/builder',
      label: (
        <span className="nav-tab">
          <BsCpu aria-hidden="true" />
          {t('nav.builder', 'PC Builder')}
        </span>
      ),
    },
    {
      key: '/compare',
      label: (
        <span className="nav-tab">
          <BsArrowLeftRight aria-hidden="true" />
          {t('nav.compare', 'So sánh')}
          {compareCount > 0 && <Badge count={compareCount} color="var(--accent-solid)" className="count-badge" />}
        </span>
      ),
    },
    { key: '/products?sort=discount', label: t('nav.deals', 'Khuyến mãi') },
  ];
  const currentUrl = location.pathname + location.search;
  const activeNavKeys = navItems
    .filter(({ key }) => (key.includes('?') ? currentUrl === key : location.pathname.startsWith(key)))
    .map(({ key }) => key);

  return (
    <>
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

          <Form className="search" onFinish={handleSearchSubmit} role="search">
            <Form.Item name="q" noStyle>
              <Input
                type="search"
                variant="borderless"
                prefix={<SearchOutlined aria-hidden="true" />}
                placeholder={t('common.searchPlaceholder', 'Tìm linh kiện, thương hiệu, mã sản phẩm...')}
                aria-label={t('common.search', 'Tìm kiếm')}
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined aria-hidden="true" />}
              aria-label={t('common.search', 'Tìm kiếm')}
            >
              <span className="search-label">{t('common.search', 'Tìm kiếm')}</span>
            </Button>
          </Form>

          <div className="head-actions">
            <Link to="/favorites" className="head-fav" aria-label={`${t('favorites.title', 'Sản phẩm yêu thích')} (${favoritesCount})`}>
              <Badge count={favoritesCount} offset={[2, -2]} overflowCount={99} color="var(--accent-solid)" style={{ color: 'var(--on-accent)', fontWeight: 700 }}>
                <FiHeart style={{ fontSize: 20, color: 'var(--text)' }} aria-hidden="true" />
              </Badge>
            </Link>

            {isAuthenticated && <NotificationBell />}

            {isAuthenticated && user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                <button type="button" aria-label={t('nav.account', 'Tài khoản')}>
                  <Avatar className="avatar" size={32} aria-hidden="true">
                    {firstName.charAt(0).toUpperCase()}
                  </Avatar>
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
              <Badge count={cartCount} offset={[2, -2]} overflowCount={99} color="var(--accent-solid)" style={{ color: 'var(--on-accent)', fontWeight: 700 }}>
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
          <ConfigProvider theme={navMenuTheme(colors)}>
            <Menu
              mode="horizontal"
              className="nav-menu"
              items={navItems}
              selectedKeys={activeNavKeys}
              onClick={({ key }) => navigate(key)}
            />
          </ConfigProvider>
          <div className="nav-aside">
            <a href="tel:19006868" className="nav-hotline">
              <FiHeadphones aria-hidden="true" />
              {t('topline.support', 'Hotline 1900 6868 · 8:00–21:30')}
            </a>
            <Link to="/account/orders">
              <FiTruck aria-hidden="true" />
              {t('nav.trackOrder', 'Tra cứu đơn hàng')}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
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
          <Link to="/account/orders">
            <FiTruck aria-hidden="true" /> {t('nav.trackOrder', 'Tra cứu đơn hàng')}
          </Link>
          <Link to="/favorites">
            <FiHeart aria-hidden="true" /> {t('favorites.title', 'Sản phẩm yêu thích')}
            {favoritesCount > 0 && <Badge count={favoritesCount} color="var(--accent-solid)" className="count-badge" />}
          </Link>
          <Link to="/about">
            <FiInfo aria-hidden="true" /> {t('footer.aboutTitle', 'Về NEXUS PC')}
          </Link>
          <Link to="/policy/shipping">
            <FiFileText aria-hidden="true" /> {t('footer.policyTitle', 'Chính sách')}
          </Link>

          <div className="group">
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`}>
                <CategoryIcon id={c.id} /> {c.name}
              </Link>
            ))}
          </div>

          <div className="group">
            <a href="tel:19006868">
              <FiHeadphones aria-hidden="true" /> {t('topline.support', 'Hotline 1900 6868 · 8:00–21:30')}
            </a>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="group">
            {isAuthenticated ? (
              <>
                <Link to="/account">
                  <FiUser aria-hidden="true" /> {t('nav.account', 'Tài khoản')}
                </Link>
                <Link to="/account/orders">
                  <FiPackage aria-hidden="true" /> {t('account.tabOrders', 'Đơn hàng của tôi')}
                </Link>
                <Link to="/account/builds">
                  <FiCpu aria-hidden="true" /> {t('account.tabBuilds', 'Cấu hình PC đã lưu')}
                </Link>
                <Link to="/account/notifications">
                  <FiBell aria-hidden="true" /> {t('account.tabNotifications', 'Thông báo')}
                </Link>
                <Link to="/account/security">
                  <FiLock aria-hidden="true" /> {t('account.tabSecurity', 'Bảo mật tài khoản')}
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
