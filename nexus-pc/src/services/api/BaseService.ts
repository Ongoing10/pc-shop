import type { AxiosRequestConfig } from 'axios';
import type * as Api from '../../types/api';
import { ApiError } from './ApiError';
import axiosClient from './axiosClient';

type Params = Record<string, unknown>;

/** Bỏ tham số undefined/null/'' để query string sạch (axios đã bỏ undefined, nhưng không bỏ '' và null) */
const cleanParams = (params?: Params): Params | undefined => {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
};

/**
 * Lớp cha của mọi service gọi API: gom phần lặp lại là ghép đường dẫn gốc, gọi axios và bóc envelope
 * `ResponseData<T>` ra `data`. Service con chỉ viết đường dẫn + đổi kiểu backend sang kiểu FE.
 *
 * ```ts
 * class AddressService extends BaseService {
 *   constructor() { super('/addresses'); }
 *   list() { return this.get<Api.UserAddress[]>(); }
 * }
 * ```
 */
export abstract class BaseService {
  protected constructor(protected readonly basePath: string = '') {}

  private url(path: string) {
    return `${this.basePath}${path}`;
  }

  /** Gọi và bóc envelope; `error_status = 0` (hiếm khi đi kèm HTTP 200) cũng thành ApiError */
  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    const { data: body } = await axiosClient.request<Api.ResponseData<T>>(config);
    if (body && typeof body === 'object' && 'error_status' in body) {
      if (body.error_status === 0) {
        throw new ApiError(200, body.error_message ?? 'Yêu cầu thất bại.', body.error_code, body.data);
      }
      return body.data;
    }
    return body as unknown as T;
  }

  protected get<T>(path = '', params?: Params, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'GET', url: this.url(path), params: cleanParams(params) });
  }

  protected post<T>(path = '', body?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'POST', url: this.url(path), data: body });
  }

  protected put<T>(path = '', body?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'PUT', url: this.url(path), data: body });
  }

  protected patch<T>(path = '', body?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'PATCH', url: this.url(path), data: body });
  }

  protected remove<T = void>(path = '', config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'DELETE', url: this.url(path) });
  }

  /** Gửi multipart (import Excel, upload ảnh); axios tự đặt boundary khi bỏ Content-Type JSON */
  protected uploadForm<T>(path: string, form: FormData) {
    return this.post<T>(path, form, { headers: { 'Content-Type': undefined } });
  }

  /** Tải file nhị phân (mẫu Excel, xuất dữ liệu, file kết quả import). Trả về blob kèm tên file từ Content-Disposition */
  protected async download(path: string, params?: Params): Promise<{ blob: Blob; fileName: string | null }> {
    const res = await axiosClient.request<Blob>({ method: 'GET', url: this.url(path), params: cleanParams(params), responseType: 'blob', timeout: 60000 });
    const disposition = String(res.headers['content-disposition'] ?? '');
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    return { blob: res.data, fileName: match ? decodeURIComponent(match[1]) : null };
  }

  /**
   * Đọc hết các trang của API phân trang (size tối đa 100) cho màn cần toàn bộ danh sách nhỏ
   * (sản phẩm hiển thị, đơn của tôi...). `maxPages` chặn vòng lặp khi dữ liệu quá lớn.
   */
  protected async getAllPages<T>(path = '', params?: Params, { size = 100, maxPages = 10 } = {}): Promise<T[]> {
    const first = await this.get<Api.PageResponse<T>>(path, { ...params, page: 0, size });
    const pages = Math.min(first.page.totalPages, maxPages);
    if (pages <= 1) return first.content;
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => this.get<Api.PageResponse<T>>(path, { ...params, page: i + 1, size }))
    );
    return [first, ...rest].flatMap((p) => p.content);
  }
}
