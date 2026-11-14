import { storageService } from '../storage/storageService';

const TOKENS_KEY = 'nexus_auth_tokens';

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** epoch ms access token hết hạn */
  expiresAt: number;
  /** epoch ms refresh token hết hạn */
  refreshExpiresAt?: number;
}

/** Phát khi phiên không còn dùng được (refresh thất bại, token bị từ chối): AuthContext lắng nghe để đăng xuất */
export const AUTH_EXPIRED_EVENT = 'nexus:auth-expired';

export const tokenStore = {
  get: (): TokenSet | null => storageService.get<TokenSet | null>(TOKENS_KEY, null),
  set: (tokens: TokenSet) => storageService.set(TOKENS_KEY, tokens),
  clear: () => storageService.remove(TOKENS_KEY),
  notifyExpired: () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  },
};

/** Đọc phần payload của JWT (không kiểm chữ ký: chỉ để hiển thị tên, quyền thật do backend kiểm) */
export const decodeJwt = <T = Record<string, unknown>>(token: string): T | null => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};
