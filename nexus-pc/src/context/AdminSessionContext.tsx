import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminSessionUser, Permission, RealmRole } from '../types/admin';
import type * as Api from '../types/api';
import { authService } from '../services/api/authService';
import { keycloakClient } from '../services/api/keycloakClient';
import { ApiError } from '../services/api/ApiError';
import { AUTH_EXPIRED_EVENT, decodeJwt, tokenStore } from '../services/api/tokenStore';
import { t } from '../i18n/t';

/** Điều kiện vào một màn admin: cần role hoặc permission (bỏ trống = chỉ cần STAFF/ADMIN) */
export interface AdminAccess {
  role?: RealmRole;
  permission?: Permission;
}

interface AdminSessionContextType {
  /** null = chưa đăng nhập */
  user: AdminSessionUser | null;
  /** true trong lúc khôi phục phiên từ token đã lưu */
  isLoading: boolean;
  /** `remember` không còn tác dụng: token do Keycloak cấp và tự làm mới, lưu chung với phía khách */
  login: (username: string, password: string, remember?: boolean) => Promise<AdminSessionUser>;
  logout: () => void;
  hasRole: (role: RealmRole) => boolean;
  can: (permission: Permission) => boolean;
  canAccess: (access?: AdminAccess) => boolean;
}

const isStaff = (u: { realmRoles: RealmRole[] }) => u.realmRoles.includes('STAFF') || u.realmRoles.includes('ADMIN');

/** GET /me → người dùng khu admin; tên lấy từ claim `name` của token (hồ sơ shop không có họ tên) */
const loadSessionUser = async (): Promise<AdminSessionUser> => {
  const me: Api.MeResponse = await authService.getMe();
  const token = tokenStore.get()?.accessToken;
  const claims = (token && decodeJwt<{ name?: string }>(token)) || {};
  return {
    id: me.id,
    username: me.username,
    fullName: claims.name || me.profile.displayName || me.username,
    realmRoles: me.roles,
    permissions: me.permissions,
  };
};

const AdminSessionContext = createContext<AdminSessionContextType | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục phiên từ token đã lưu; token của khách hàng (không có role STAFF/ADMIN) thì không tính là đã đăng nhập admin
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!(await keycloakClient.getAccessToken())) return;
        const session = await loadSessionUser();
        if (active && isStaff(session)) setUser(session);
      } catch {
        // token hỏng / backend không phản hồi: coi như chưa đăng nhập
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (username: string, password: string) => {
    await keycloakClient.login(username.trim(), password);
    try {
      const session = await loadSessionUser();
      if (!isStaff(session)) throw new ApiError(403, t('admin.login.thisAccountIsNotAllowed', 'Tài khoản này không có quyền vào trang quản trị.'), 'FORBIDDEN');
      queryClient.clear();
      setUser(session);
      return session;
    } catch (e) {
      await keycloakClient.logout();
      throw e;
    }
  };

  const logout = () => {
    void keycloakClient.logout();
    queryClient.clear();
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
    <AdminSessionContext.Provider value={{ user, isLoading, login, logout, hasRole, can, canAccess }}>
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
