import React, { ReactNode, useState } from 'react';
import { Alert, Button, Divider, Flex, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { BulkErrorItem } from './bulk';
import { t } from '../../i18n/t';

/** Bảng `sticky` dính ngay dưới thanh header admin (cao 56px, xem headerHeight trong createAdminTheme) */
export const ADMIN_TABLE_STICKY = { offsetHeader: 56 };

interface AdminToolbarProps {
  /** tìm kiếm, bộ lọc: nằm bên trái */
  filters?: ReactNode;
  /** nút luôn hiện bên phải, trước nút làm mới */
  extra?: ReactNode;
  selectedCount?: number;
  /** số dòng của danh sách đang lọc, hiện dạng "đã chọn/tổng" */
  totalCount?: number;
  /** thao tác hàng loạt, chỉ hiện khi đã chọn ít nhất một dòng */
  bulkActions?: ReactNode;
  /** lỗi "tất cả hoặc không" của API hàng loạt: 400 kèm data [{id, reason}] */
  errors?: BulkErrorItem[];
  onCloseErrors?: () => void;
}

/** Một hàng trên bảng danh sách admin: bộ lọc | đã chọn + thao tác hàng loạt | nút phụ | làm mới */
export const AdminToolbar: React.FC<AdminToolbarProps> = ({
  filters,
  extra,
  selectedCount = 0,
  totalCount,
  bulkActions,
  errors,
  onCloseErrors,
}) => {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const showBulk = selectedCount > 0 && bulkActions;

  /** tải lại mọi query đang hiển thị trên trang (danh sách chính lẫn danh mục/thương hiệu dùng để lọc) */
  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      {errors && errors.length > 0 && (
        <Alert
          type="error"
          showIcon
          className="admin-bulk-errors"
          title={t('admin.bulk.nothingWasDoneRowsHave', 'Không thực hiện được: {{count}} dòng lỗi, chưa có thay đổi nào được lưu', { count: errors.length })}
          description={
            <ul>
              {errors.map((e) => (
                <li key={e.id}>
                  <b>{e.id}</b>: {e.reason}
                </li>
              ))}
            </ul>
          }
          closable={{ onClose: onCloseErrors }}
        />
      )}
      <Flex gap={12} wrap align="center" justify="space-between" className="admin-toolbar">
        <Flex gap={12} wrap align="center">
          {filters}
        </Flex>
        <Flex gap={8} wrap align="center" className="admin-toolbar-actions">
          {showBulk && (
            <>
              <Tooltip title={t('admin.bulk.selected', 'Đã chọn')}>
                <Typography.Text type="secondary">
                  <b className="admin-toolbar-count">{selectedCount}</b>
                  {totalCount !== undefined && `/${totalCount}`}
                </Typography.Text>
              </Tooltip>
              {bulkActions}
              {extra && <Divider orientation="vertical" />}
            </>
          )}
          {extra}
          <Tooltip title={t('admin.bulk.refresh', 'Làm mới')}>
            <Button icon={<ReloadOutlined spin={refreshing} />} aria-label={t('admin.bulk.refresh', 'Làm mới')} onClick={refresh} />
          </Tooltip>
        </Flex>
      </Flex>
    </>
  );
};
