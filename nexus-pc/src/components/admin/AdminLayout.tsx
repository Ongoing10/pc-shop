import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { App, Avatar, Button, ConfigProvider, Dropdown, Flex, Layout, Menu, Spin, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined, LogoutOutlined } from '@ant-design/icons';
import { antdAdminTheme } from '../../theme/themeConfig';
import { AdminSessionProvider, useAdminSession, useAdminUser } from '../../context/AdminSessionContext';
import { AdminDataProvider } from '../../context/AdminDataContext';
import { ADMIN_MENU_GROUPS, adminRoutesConfig } from '../../routes/adminRoutes.config';
import { ROLE_LABEL } from '../../utils/adminStatus';
import { LogoMark } from '../common/LogoMark';
import './admin.css';

const { Sider, Header, Content } = Layout;

const COLLAPSE_KEY = 'nexus_admin_sider_collapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

const PageSpinner: React.FC = () => (
  <Flex align="center" justify="center" style={{ minHeight: '50vh' }}>
    <Spin size="large" />
  </Flex>
);

/** Route admin đang mở (khớp path dài nhất trước để /products/new không rơi vào /products/:sku) */
const useCurrentAdminRoute = () => {
  const { pathname } = useLocation();
  return useMemo(
    () =>
      adminRoutesConfig.find((r) => matchPath({ path: `/admin/${r.path}`.replace(/\/$/, ''), end: true }, pathname)) ??
      adminRoutesConfig[0],
    [pathname]
  );
};

const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { logout, canAccess } = useAdminSession();
  const user = useAdminUser();
  const current = useCurrentAdminRoute();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    document.title = `${current.title} · Quản trị NEXUS PC`;
  }, [current.title]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        // bộ nhớ trình duyệt bị chặn: chỉ nhớ trong phiên
      }
      return !v;
    });
  };

  // Mục nào thiếu quyền thì ẩn khỏi sidebar (backend vẫn chặn bằng 403)
  const menuItems: MenuProps['items'] = (Object.keys(ADMIN_MENU_GROUPS) as Array<keyof typeof ADMIN_MENU_GROUPS>)
    .map((group) => {
      const children = adminRoutesConfig
        .filter((r) => r.menu?.group === group && canAccess(r.access))
        .map((r) => ({
          key: r.path,
          icon: r.menu!.icon,
          label: <Link to={`/admin/${r.path}`}>{r.menu!.label ?? r.title}</Link>,
        }));
      return { type: 'group' as const, key: group, label: collapsed ? null : ADMIN_MENU_GROUPS[group], children };
    })
    .filter((g) => g.children.length > 0);

  const selectedKey = current.menuKey ?? current.path;
  const isAdmin = user.realmRoles.includes('ADMIN');

  const userMenu: MenuProps['items'] = [
    { key: 'shop', icon: <ShopOutlined />, label: 'Về trang khách hàng' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'shop') {
      navigate('/');
      return;
    }
    logout();
    message.info('Đã đăng xuất khỏi trang quản trị');
    navigate('/admin/login', { replace: true });
  };

  return (
    <Layout className="admin-root">
      <Sider className="admin-sider" width={232} collapsedWidth={64} collapsible collapsed={collapsed} trigger={null}>
        <Link to="/admin" className="admin-brand" aria-label="NEXUS PC – Trang quản trị">
          <LogoMark size={32} />
          {!collapsed && (
            <span>
              NEXUS<b>PC</b>
              <small>Quản trị</small>
            </span>
          )}
        </Link>
        <Menu className="admin-menu" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
      </Sider>

      <Layout>
        <Header className="admin-header">
          <Flex align="center" justify="space-between" gap={16} style={{ height: '100%' }}>
            <Button
              type="text"
              aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />

            <Dropdown trigger={['click']} menu={{ items: userMenu, onClick: handleUserMenu }}>
              <Button type="text" className="admin-user">
                <Avatar size={28}>{user.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}</Avatar>
                <span>
                  <Typography.Text strong>{user.fullName}</Typography.Text>
                  <Tag color={isAdmin ? 'volcano' : 'blue'} bordered={false}>
                    {isAdmin ? ROLE_LABEL.ADMIN : ROLE_LABEL.STAFF}
                  </Tag>
                </span>
              </Button>
            </Dropdown>
          </Flex>
        </Header>

        <Content className="admin-content">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
};

/** Khung có sidebar: chưa đăng nhập thì chuyển về /admin/login, nhớ trang đang mở để quay lại */
export const AdminLayout: React.FC = () => {
  const { user } = useAdminSession();
  const location = useLocation();

  if (!user) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return (
    <AdminDataProvider>
      <AdminShell />
    </AdminDataProvider>
  );
};

/** Gốc của mọi route /admin/*: theme riêng + phiên đăng nhập admin (dùng chung cho trang đăng nhập) */
export const AdminRoot: React.FC = () => (
  <ConfigProvider theme={antdAdminTheme}>
    <AdminSessionProvider>
      <Suspense fallback={<PageSpinner />}>
        <Outlet />
      </Suspense>
    </AdminSessionProvider>
  </ConfigProvider>
);
