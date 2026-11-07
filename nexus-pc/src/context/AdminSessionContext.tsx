import React, { createContext, ReactNode, useContext, useState } from 'react';
import { AdminSessionUser, AdminUser, Permission, RealmRole } from '../types/admin';
import { mockUsers } from '../services/api/adminMockData';
import { fakeLatency } from './AdminDataContext';

/** Điều kiện vào một màn admin: cần role hoặc permission (bỏ trống = chỉ cần STAFF/ADMIN) */
export interface AdminAccess {
  role?: RealmRole;
  permission?: Permission;
}

interface AdminSessionContextType {
  /** null = chưa đăng nhập */
  user: AdminSessionUser | null;
  login: (username: string, password: string, remember: boolean) => Promise<AdminSessionUser>;
  logout: () => void;
  hasRole: (role: RealmRole) => boolean;
  can: (permission: Permission) => boolean;
  canAccess: (access?: AdminAccess) => boolean;
}

const SESSION_KEY = 'nexus_admin_session';

const toSessionUser = (u: AdminUser): AdminSessionUser => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  realmRoles: u.realmRoles,
  permissions: u.permissions,
});

const isStaff = (u: { realmRoles: RealmRole[] }) => u.realmRoles.includes('STAFF') || u.realmRoles.includes('ADMIN');

/** Khôi phục phiên đã lưu (localStorage nếu "ghi nhớ", sessionStorage nếu không) */
const restoreSession = (): AdminSessionUser | null => {
  try {
    const id = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    const found = mockUsers.find((u) => u.id === id && u.active && isStaff(u));
    return found ? toSessionUser(found) : null;
  } catch {
    return null;
  }
};

const clearStoredSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // bộ nhớ trình duyệt bị chặn: không có gì để xóa
  }
};

const AdminSessionContext = createContext<AdminSessionContextType | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminSessionUser | null>(restoreSession);

  /**
   * TODO ghép Keycloak: bỏ form, gọi keycloak.login({ redirectUri }) rồi đọc realm_access.roles và
   * resource_access['pcshop-backend'].roles từ token. Khi đó trang /admin/login chỉ còn nút "Đăng nhập bằng Keycloak".
   */
  const login = async (username: string, password: string, remember: boolean) => {
    await fakeLatency(500);
    const found = mockUsers.find((u) => u.username === username.trim().toLowerCase() || u.email === username.trim());
    // Dữ liệu giả không lưu mật khẩu: chỉ kiểm tra độ dài như chính sách mật khẩu của realm
    if (!found || password.length < 6) throw new Error('Sai tên đăng nhập hoặc mật khẩu');
    if (!found.active) throw new Error('Tài khoản đã bị khóa. Liên hệ quản trị viên để mở lại.');
    if (!isStaff(found)) throw new Error('Tài khoản này không có quyền vào trang quản trị.');

    const session = toSessionUser(found);
    clearStoredSession();
    try {
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, session.id);
    } catch {
      // bộ nhớ trình duyệt bị chặn: phiên chỉ còn trong bộ nhớ, tải lại trang phải đăng nhập lại
    }
    setUser(session);
    return session;
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
  };

  const hasRole = (role: RealmRole) => !!user?.realmRoles.includes(role);
  const can = (permission: Permission) => !!user?.permissions.includes(permission);
  const canAccess = (access?: AdminAccess) => {
    if (!user || !isStaff(user)) return false;
    if (access?.role && !hasRole(access.role)) return false;
    if (access?.permission && !can(access.permission)) return false;
    return true;
  };

  return (
    <AdminSessionContext.Provider value={{ user, login, logout, hasRole, can, canAccess }}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = (): AdminSessionContextType => {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error('useAdminSession must be used within an AdminSessionProvider');
  }
  return context;
};

/** Người đang đăng nhập; chỉ dùng bên trong AdminLayout (layout đã chuyển về /admin/login khi chưa đăng nhập) */
export const useAdminUser = (): AdminSessionUser => {
  const { user } = useAdminSession();
  if (!user) {
    throw new Error('useAdminUser must be used inside the authenticated admin layout');
  }
  return user;
};
