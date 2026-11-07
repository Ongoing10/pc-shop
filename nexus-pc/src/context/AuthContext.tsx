import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserProfile,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  ChangePasswordData,
} from '../types/user';
import { authService } from '../services/api/authService';
import { message } from 'antd';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ user: UserProfile; token: string }>;
  register: (data: RegisterData) => Promise<{ user: UserProfile; token: string }>;
  logout: () => void;
  forgotPassword: (identifier: string) => Promise<{ success: boolean; demoCode: string; message: string }>;
  resetPassword: (data: ResetPasswordData) => Promise<{ success: boolean; message: string }>;
  changePassword: (data: ChangePasswordData) => Promise<{ success: boolean; message: string }>;
  updateProfile: (profile: Partial<UserProfile>) => UserProfile;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    try {
      const currentUser = authService.getCurrentUser();
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('nexus_auth_token') : null;
      if (currentUser && storedToken) {
        setUser(currentUser);
        setToken(storedToken);
      }
    } catch (e) {
      console.error('Error hydrating auth state:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      setToken(result.token);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const result = await authService.register(data);
      setUser(result.user);
      setToken(result.token);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    message.info('Đã đăng xuất khỏi tài khoản NEXUS');
  };

  const forgotPassword = async (identifier: string) => {
    return await authService.requestResetCode(identifier);
  };

  const resetPassword = async (data: ResetPasswordData) => {
    return await authService.resetPassword(data);
  };

  const changePassword = async (data: ChangePasswordData) => {
    if (!user) {
      throw new Error('Vui lòng đăng nhập trước khi đổi mật khẩu.');
    }
    return await authService.changePassword(user.id, data);
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    const updated = authService.updateProfile(profile);
    setUser(updated);
    return updated;
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
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
