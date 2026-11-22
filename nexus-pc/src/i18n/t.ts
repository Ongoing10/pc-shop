import i18n from './index';

/**
 * Dịch dùng được ở mọi nơi (kể cả ngoài component), dùng cho khu admin: t('admin.orders.title', 'Đơn hàng', { count }).
 * Chuỗi mặc định là tiếng Việt, khóa nằm ở locales/admin/*.json. Hằng cấp module phải đặt t() trong getter/hàm
 * để đọc ngôn ngữ lúc render; AdminRoot dựng lại cây trang khi đổi ngôn ngữ.
 */
export const t = (key: string, defaultValue: string, options?: Record<string, unknown>): string =>
  i18n.t(key, { ...options, defaultValue }) as string;
