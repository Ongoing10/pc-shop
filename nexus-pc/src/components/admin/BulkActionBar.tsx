import React, { ReactNode } from 'react';
import { Alert, Button, Flex } from 'antd';
import type { BulkErrorItem } from './bulk';
import { t } from '../../i18n/t';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode;
  /** lỗi "tất cả hoặc không" của API hàng loạt: 400 kèm data [{id, reason}] */
  errors?: BulkErrorItem[];
  onCloseErrors?: () => void;
}

/** Thanh thao tác hàng loạt, hiện khi đã chọn ít nhất một dòng */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({ count, onClear, children, errors, onCloseErrors }) => (
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
    {count > 0 && (
      <Alert
        type="info"
        className="admin-bulkbar"
        title={
          <Flex align="center" gap={12} wrap>
            <span>
              {t('admin.bulk.selected', 'Đã chọn')} <b>{count}</b> {t('admin.bulk.rows', 'dòng')}
            </span>
            <Button size="small" type="link" onClick={onClear}>
              {t('admin.bulk.clearSelection', 'Bỏ chọn')}
            </Button>
          </Flex>
        }
        action={
          <Flex gap={8} wrap>
            {children}
          </Flex>
        }
      />
    )}
  </>
);
