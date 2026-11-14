import axios from 'axios';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM_URL } from '../../config/env';
import { ApiError } from './ApiError';
import { TokenSet, tokenStore } from './tokenStore';

const TOKEN_URL = `${KEYCLOAK_REALM_URL}/protocol/openid-connect/token`;
/** Làm mới sớm hơn hạn 30 giây để request đang bay không bị 401 */
const SKEW_MS = 30_000;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
}

const toTokenSet = (res: TokenResponse): TokenSet => ({
  accessToken: res.access_token,
  refreshToken: res.refresh_token,
  expiresAt: Date.now() + res.expires_in * 1000,
  refreshExpiresAt: res.refresh_expires_in ? Date.now() + res.refresh_expires_in * 1000 : undefined,
});

const requestToken = async (form: Record<string, string>): Promise<TokenSet> => {
  try {
    const { data } = await axios.post<TokenResponse>(
      TOKEN_URL,
      new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID, ...form }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );
    return toTokenSet(data);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      const status = e.response.status;
      const description = (e.response.data as { error_description?: string })?.error_description;
      throw new ApiError(
        status,
        status === 401 || status === 400 ? 'Sai tên đăng nhập hoặc mật khẩu.' : description || 'Không đăng nhập được.',
        'UNAUTHORIZED'
      );
    }
    throw new ApiError(0, 'Không kết nối được máy chủ đăng nhập (Keycloak).');
  }
};

let refreshing: Promise<TokenSet | null> | null = null;

export const keycloakClient = {
  /** Password grant (client pcshop-web bật directAccessGrantsEnabled); `username` nhận cả tên đăng nhập lẫn email */
  async login(username: string, password: string): Promise<TokenSet> {
    const tokens = await requestToken({ grant_type: 'password', username, password, scope: 'openid' });
    tokenStore.set(tokens);
    return tokens;
  },

  /** Một lần làm mới tại một thời điểm (nhiều request cùng gặp token hết hạn dùng chung kết quả) */
  refresh(): Promise<TokenSet | null> {
    const current = tokenStore.get();
    if (!current?.refreshToken) return Promise.resolve(null);
    if (!refreshing) {
      refreshing = requestToken({ grant_type: 'refresh_token', refresh_token: current.refreshToken })
        .then((tokens) => {
          tokenStore.set(tokens);
          return tokens;
        })
        .catch(() => {
          tokenStore.clear();
          tokenStore.notifyExpired();
          return null;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  },

  /** Access token còn dùng được; sắp hết hạn thì làm mới trước. null = chưa đăng nhập / phiên hết */
  async getAccessToken(): Promise<string | null> {
    const current = tokenStore.get();
    if (!current) return null;
    if (current.expiresAt - SKEW_MS > Date.now()) return current.accessToken;
    return (await keycloakClient.refresh())?.accessToken ?? null;
  },

  /** Đăng xuất phía Keycloak (hủy refresh token); lỗi mạng không chặn đăng xuất cục bộ */
  async logout(): Promise<void> {
    const current = tokenStore.get();
    tokenStore.clear();
    if (!current?.refreshToken) return;
    try {
      await axios.post(
        `${KEYCLOAK_REALM_URL}/protocol/openid-connect/logout`,
        new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID, refresh_token: current.refreshToken }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 }
      );
    } catch {
      // phiên Keycloak tự hết hạn
    }
  },
};
