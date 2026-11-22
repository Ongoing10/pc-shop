import React, { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Badge, Button, Menu, Result } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { FiUser, FiPackage, FiMapPin, FiLock, FiBell, FiCpu } from 'react-icons/fi';
import { Breadcrumb } from '../common/Breadcrumb';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface AccountShellProps {
  title: string;
  subtitle?: string;
  /** Mục breadcrumb nằm giữa "Tài khoản" và tiêu đề (vd: trang chi tiết đơn) */
  parent?: { label: string; link: string };
  actions?: ReactNode;
  children: ReactNode;
}

/** Khung chung cho mọi trang trong khu tài khoản: menu bên trái, chặn khi chưa đăng nhập */
export const AccountShell: React.FC<AccountShellProps> = ({ title, subtitle, parent, actions, children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { data: notifications = [] } = useNotifications(isAuthenticated);
  const unread = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NAV: Array<{ key: string; icon: React.ReactNode; label: string; badge?: number }> = [
    { key: '/account', icon: <FiUser />, label: t('account.tabProfile', 'Thông tin tài khoản') },
    { key: '/account/orders', icon: <FiPackage />, label: t('account.tabOrders', 'Đơn hàng của tôi') },
    { key: '/account/addresses', icon: <FiMapPin />, label: t('account.tabAddresses', 'Sổ địa chỉ') },
    { key: '/account/builds', icon: <FiCpu />, label: t('account.tabBuilds', 'Cấu hình PC đã lưu') },
    { key: '/account/notifications', icon: <FiBell />, label: t('account.tabNotifications', 'Thông báo'), badge: unread },
    { key: '/account/security', icon: <FiLock />, label: t('account.tabSecurity', 'Bảo mật tài khoản') },
  ];

  const menuItems: MenuProps['items'] = [
    ...NAV.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: (
        <Link to={item.key} className="menu-link">
          {item.label}
          {item.badge ? <Badge count={item.badge} color="var(--accent-solid)" className="menu-badge" /> : null}
        </Link>
      ),
    })),
    { key: 'logout', icon: <LogoutOutlined />, label: t('account.logout', 'Đăng xuất'), className: 'menu-logout' },
  ];

  // Trang con (vd /account/orders/NX...) vẫn sáng mục cha; /account chỉ khớp đúng
  const selectedKey = [...NAV]
    .sort((a, b) => b.key.length - a.key.length)
    .find((item) => location.pathname === item.key || (item.key !== '/account' && location.pathname.startsWith(`${item.key}/`)))?.key;

  if (!isAuthenticated || !user) {
    return (
      <main className="container page">
        <Breadcrumb items={[t('account.title', 'Tài khoản')]} />
        <Result
          className="gate"
          icon={<UserOutlined />}
          title={t('account.loginRequiredTitle', 'Chưa đăng nhập tài khoản')}
          subTitle={t(
            'account.loginRequiredDesc',
            'Vui lòng đăng nhập để xem đơn hàng, sổ địa chỉ, cấu hình đã lưu và thông báo của bạn.'
          )}
          extra={
            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
            >
              {t('account.loginNow', 'Đăng nhập ngay')}
            </Button>
          }
        />
      </main>
    );
  }

  // Trang gốc /account chỉ có một mục, tránh lặp "Tài khoản › Tài khoản"
  const crumbs =
    location.pathname === '/account'
      ? [title]
      : [{ label: t('account.title', 'Tài khoản'), link: '/account' }, ...(parent ? [parent] : []), title];

  return (
    <main className="container page">
      <Breadcrumb items={crumbs} />

      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>

      <div className="accountlayout">
        <aside className="accountmenu" aria-label={t('account.menu', 'Menu tài khoản')}>
          <div className="accountmenu-user">
            <Avatar className="avatar" size={38} aria-hidden="true">
              {user.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}
            </Avatar>
            <span>
              <b>{user.fullName}</b>
              <small>{user.email}</small>
            </span>
          </div>
          <Menu
            mode="inline"
            inlineIndent={10}
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={menuItems}
            onClick={({ key }) => key === 'logout' && handleLogout()}
          />
        </aside>

        <section className="accountcontent">{children}</section>
      </div>
    </main>
  );
};
