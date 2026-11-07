import React from 'react';
import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '../../types/order';
import { ORDER_STATUS_META } from '../../utils/orderStatus';

export const OrderStatusTag: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const meta = ORDER_STATUS_META[status];

  return (
    <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>
      {t(meta.labelKey, meta.label)}
    </Tag>
  );
};
