import type * as Api from '../../types/api';

/** Lỗi từ backend (envelope ResponseData có error_status = 0) hoặc lỗi mạng; trang đọc `message` để hiển thị */
export class ApiError<T = unknown> extends Error {
  constructor(
    /** HTTP status; 0 = không kết nối được máy chủ */
    public readonly status: number,
    message: string,
    public readonly code: Api.ErrorCode | string | null = null,
    /** `data` của envelope: FieldError[] (validate), BulkErrorItem[] (API hàng loạt), CheckoutPreview (409)... */
    public readonly data: T | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isFieldErrors = (data: unknown): data is Api.FieldError[] =>
  Array.isArray(data) && data.length > 0 && typeof (data[0] as Api.FieldError)?.field === 'string';

const isBulkErrors = (data: unknown): data is Api.BulkErrorItem[] =>
  Array.isArray(data) && data.length > 0 && typeof (data[0] as Api.BulkErrorItem)?.reason === 'string';

/** Ghép chi tiết lỗi vào thông báo để người dùng biết sai ở đâu */
export const describeError = (message: string, data: unknown): string => {
  if (isFieldErrors(data)) return data.map((e) => `${e.field}: ${e.message}`).join('; ');
  if (isBulkErrors(data)) return [message, ...data.map((e) => `${e.id}: ${e.reason}`)].filter(Boolean).join('\n');
  return message;
};

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
