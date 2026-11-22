import React, { ReactNode } from 'react';
import { App, Button, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { t } from '../../i18n/t';

/**
 * "Xóa" ở khu admin theo vòng đời dữ liệu (không xóa thật): sản phẩm chuyển Ngừng bán, các bảng có is_active thì tắt.
 * Mỗi trang tự truyền hành động tương ứng qua onConfirm.
 */
interface RowDeleteButtonProps {
  title: ReactNode;
  description?: ReactNode;
  onConfirm: () => unknown;
  disabled?: boolean;
  /** tooltip khi bị disabled */
  disabledReason?: string;
}

/** Nút xóa một dòng, đặt cạnh nút Sửa */
export const RowDeleteButton: React.FC<RowDeleteButtonProps> = ({ title, description, onConfirm, disabled, disabledReason }) => (
  <Popconfirm
    title={title}
    description={description}
    okText={t('admin.bulk.delete', 'Xóa')}
    cancelText={t('admin.common.cancel', 'Hủy')}
    okButtonProps={{ danger: true }}
    onConfirm={onConfirm}
    disabled={disabled}
  >
    <Tooltip title={disabled ? disabledReason : t('admin.bulk.delete', 'Xóa')}>
      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t('admin.bulk.delete', 'Xóa')} disabled={disabled} />
    </Tooltip>
  </Popconfirm>
);

interface BulkDeleteButtonProps {
  /** số dòng sẽ xóa (có thể ít hơn số đã chọn nếu bỏ qua dòng đã xóa) */
  count: number;
  /** danh từ, vd "sản phẩm" */
  noun: string;
  content?: ReactNode;
  onConfirm: () => unknown;
}

/** Nút "Xóa" trong BulkActionBar, hỏi lại trước khi xóa */
export const BulkDeleteButton: React.FC<BulkDeleteButtonProps> = ({ count, noun, content, onConfirm }) => {
  const { modal } = App.useApp();
  return (
    <Button
      size="small"
      danger
      icon={<DeleteOutlined />}
      disabled={count === 0}
      onClick={() =>
        modal.confirm({
          centered: true,
          title: t('admin.bulk.delete2', 'Xóa {{count}} {{noun}}?', { count, noun }),
          content,
          okText: t('admin.bulk.delete', 'Xóa'),
          okButtonProps: { danger: true },
          cancelText: t('admin.common.cancel', 'Hủy'),
          onOk: onConfirm,
        })
      }
    >
      {t('admin.bulk.delete', 'Xóa')}
    </Button>
  );
};
