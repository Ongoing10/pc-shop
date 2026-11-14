import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM_URL } from '../../config/env';
import type * as Api from '../../types/api';
import { LoginCredentials, UserProfile } from '../../types/user';
import { BaseService } from './BaseService';
import { keycloakClient } from './keycloakClient';
import { decodeJwt, tokenStore } from './tokenStore';

/**
 * Pure Validation Functions (Decoupled for unit testing)
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

export const validatePhone = (phone: string): boolean => {
  // Vietnamese phone format (10-11 digits, starts with 0 or +84)
  const phoneClean = phone.replace(/[\s.-]/g, '');
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return phoneRegex.test(phoneClean);
};

export interface PasswordRequirements {
  minLength: boolean;
  hasNumber: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export const checkPasswordRequirements = (password: string): PasswordRequirements => {
  const minLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid = minLength; // Minimum baseline is 6 characters
  return {
    minLength,
    hasNumber,
    hasUpper,
    hasLower,
    hasSpecial,
    isValid,
  };
};

export const evaluatePasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  if (!password) {
    return { score: 0, label: 'Chưa nhập', color: '#666' };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 20, label: 'Yếu', color: '#f5222d' };
  } else if (score <= 3) {
    return { score: 60, label: 'Trung bình', color: '#faad14' };
  } else {
    return { score: 100, label: 'Mạnh', color: '#52c41a' };
  }
};

/**
 * Các trang do Keycloak phục vụ. Backend không có API đăng ký / quên mật khẩu / đổi mật khẩu
 * (tài khoản nằm ở Keycloak), nên FE chuyển người dùng sang các trang này.
 * `redirect_uri` phải khớp redirectUris của client pcshop-web (http://localhost:3000/*).
 */
const returnUrl = () => `${window.location.origin}/login`;

const oidcQuery = () =>
  new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    response_type: 'code',
    scope: 'openid',
    redirect_uri: returnUrl(),
  }).toString();

export const keycloakPages = {
  /** Trang đăng ký của Keycloak (realm bật registrationAllowed) */
  register: () => `${KEYCLOAK_REALM_URL}/protocol/openid-connect/registrations?${oidcQuery()}`,
  /** Trang đăng nhập của Keycloak, có sẵn liên kết "Quên mật khẩu?" (realm bật resetPasswordAllowed) */
  login: () => `${KEYCLOAK_REALM_URL}/protocol/openid-connect/auth?${oidcQuery()}`,
  /** Quản lý tài khoản (đổi mật khẩu, thiết bị đăng nhập) */
  account: () => `${KEYCLOAK_REALM_URL}/account/#/security/signingin`,
};

interface AccessTokenClaims {
  name?: string;
  preferred_username?: string;
  email?: string;
}

/** customer-service: hồ sơ của người đang đăng nhập (/me). Tên và email nằm ở Keycloak, hồ sơ shop chỉ có SĐT, giới tính, ngày sinh */
class AuthService extends BaseService {
  constructor() {
    super('/me');
  }

  /** GET /me: id, role, permission trong token và hồ sơ shop (lần đầu backend tự tạo hồ sơ) */
  getMe() {
    return this.get<Api.MeResponse>();
  }

  /** GET /me → UserProfile của FE */
  async getProfile(): Promise<UserProfile> {
    const me = await this.getMe();
    const token = tokenStore.get()?.accessToken;
    const claims = (token && decodeJwt<AccessTokenClaims>(token)) || {};
    const p = me.profile;
    return {
      id: me.id,
      fullName: claims.name || p.displayName || me.username,
      email: me.email ?? p.email ?? claims.email ?? '',
      phone: p.phoneNumber ?? '',
      birthDate: p.birthDate ?? undefined,
      gender: p.gender,
      createdAt: p.createdAt ?? undefined,
    };
  }

  /** Đăng nhập bằng Keycloak (tên đăng nhập hoặc email) rồi đọc hồ sơ */
  async login(credentials: LoginCredentials): Promise<{ user: UserProfile; token: string }> {
    const tokens = await keycloakClient.login(credentials.identifier, credentials.password);
    try {
      return { user: await this.getProfile(), token: tokens.accessToken };
    } catch (e) {
      tokenStore.clear();
      throw e;
    }
  }

  /** Khôi phục phiên từ token đã lưu (null nếu chưa đăng nhập hoặc phiên đã hết hạn) */
  async restoreSession(): Promise<{ user: UserProfile; token: string } | null> {
    const token = await keycloakClient.getAccessToken();
    if (!token) return null;
    return { user: await this.getProfile(), token };
  }

  logout(): Promise<void> {
    return keycloakClient.logout();
  }

  /**
   * PUT /me. Backend ghi đè cả 3 trường (trường bỏ trống thành null) nên luôn gửi đủ, lấy giá trị hiện có cho trường không đổi.
   * Họ tên và email do Keycloak quản lý, không sửa ở đây.
   */
  async updateProfile(current: UserProfile, changes: Partial<UserProfile>): Promise<UserProfile> {
    const next = { ...current, ...changes };
    const body: Api.UpdateProfileRequest = {
      phoneNumber: next.phone ? next.phone.replace(/[\s.]/g, '') : null,
      gender: next.gender ?? null,
      birthDate: next.birthDate || null,
    };
    await this.put<Api.CustomerProfile>('', body);
    return this.getProfile();
  }
}

export const authService = new AuthService();
