import { t } from '../../i18n/t';
/** Một dòng lỗi của API hàng loạt (BulkErrors ở shared-contracts) */
export interface BulkErrorItem {
  id: string;
  reason: string;
}

/** Tối đa phần tử mỗi lần gọi API hàng loạt */
export const BULK_LIMIT = 100;

/**
 * Kiểm tra "tất cả hoặc không" như backend: trả danh sách lỗi, rỗng = được phép áp dụng cho mọi dòng.
 * Dùng ở chế độ mock; khi ghép API thì lấy lỗi từ `data` của response 400.
 */
export const collectBulkErrors = <T,>(
  rows: T[],
  getId: (row: T) => string,
  check: (row: T) => string | null
): BulkErrorItem[] => {
  if (rows.length > BULK_LIMIT) return [{ id: '*', reason: t('admin.bulk.atMostRowsAtA', 'Tối đa {{bulkLimit}} dòng mỗi lần', { bulkLimit: BULK_LIMIT }) }];
  return rows.flatMap((row) => {
    const reason = check(row);
    return reason ? [{ id: getId(row), reason }] : [];
  });
};

/** Lỗi "tất cả hoặc không" của backend (400, `data` = [{id, reason}]); null nếu lỗi khác (hiển thị thông báo chung) */
export const bulkErrorsOf = (e: unknown): BulkErrorItem[] | null => {
  const data = (e as { data?: unknown } | null)?.data;
  return Array.isArray(data) && data.length > 0 && typeof (data[0] as BulkErrorItem)?.reason === 'string'
    ? (data as BulkErrorItem[])
    : null;
};
