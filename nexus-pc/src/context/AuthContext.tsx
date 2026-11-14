import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { UserProfile, LoginCredentials } from '../types/user';
import { authService, keycloakPages } from '../services/api/authService';
import { AUTH_EXPIRED_EVENT } from '../services/api/tokenStore';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ user: UserProfile; token: string }>;
  logout: () => void;
  /** Tài khoản nằm ở Keycloak: các hàm dưới đây chuyển trình duyệt sang trang tương ứng của Keycloak */
  register: () => void;
  forgotPassword: () => void;
  changePassword: () => void;
  /** PUT /me: chỉ số điện thoại, giới tính, ngày sinh (họ tên, email do Keycloak quản lý) */
  updateProfile: (changes: Partial<UserProfile>) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khôi phục phiên từ token đã lưu (làm mới access token nếu hết hạn)
  useEffect(() => {
    let active = true;
    authService
      .restoreSession()
      .then((session) => {
        if (!active || !session) return;
        setUser(session.user);
        setToken(session.token);
      })
      .catch((e) => console.error('Error hydrating auth state:', e))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Refresh token hết hạn / access token bị từ chối: axiosClient đã xóa token, ở đây đưa giao diện về trạng thái khách
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setToken(null);
      queryClient.clear();
      message.warning('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      queryClient.clear();
      setUser(result.user);
      setToken(result.token);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void authService.logout();
    setUser(null);
    setToken(null);
    queryClient.clear();
    message.info('Đã đăng xuất khỏi tài khoản NEXUS');
  };

  const updateProfile = async (changes: Partial<UserProfile>) => {
    if (!user) throw new Error('Vui lòng đăng nhập trước khi cập nhật hồ sơ.');
    const updated = await authService.updateProfile(user, changes);
    setUser(updated);
    return updated;
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    register: () => window.location.assign(keycloakPages.register()),
    forgotPassword: () => window.location.assign(keycloakPages.login()),
    changePassword: () => window.location.assign(keycloakPages.account()),
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
