import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../config/env';
import type * as Api from '../../types/api';
import { ApiError, describeError } from './ApiError';
import { keycloakClient } from './keycloakClient';
import { tokenStore } from './tokenStore';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/** Gắn Bearer token (làm mới nếu sắp hết hạn). API công khai vẫn chạy bình thường khi chưa đăng nhập */
axiosClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await keycloakClient.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Mọi lỗi ra khỏi client đều là ApiError (đọc từ envelope ResponseData khi có) */
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Partial<Api.ResponseData<unknown>>>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError(0, error.code === 'ECONNABORTED' ? 'Máy chủ phản hồi quá lâu.' : 'Không kết nối được máy chủ.')
      );
    }
    const { status, data } = error.response;
    // 401 có gửi token = token bị từ chối (đã bị thu hồi / sai realm): bỏ phiên để người dùng đăng nhập lại
    if (status === 401 && error.config?.headers?.Authorization && tokenStore.get()) {
      tokenStore.clear();
      tokenStore.notifyExpired();
    }
    const fallback =
      status === 401 ? 'Vui lòng đăng nhập.' : status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : `Lỗi máy chủ (${status}).`;
    const message = describeError(data?.error_message || fallback, data?.data);
    return Promise.reject(new ApiError(status, message, data?.error_code ?? null, data?.data ?? null));
  }
);

export default axiosClient;
