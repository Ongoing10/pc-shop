import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePicker, Select, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { Dayjs } from 'dayjs';
import { useAdminMovements, useAdminProducts, useAdminWarehouses } from '../../../hooks/admin/useAdminApi';
import { StockMovement, StockMovementType } from '../../../types/admin';
import { MOVEMENT_TYPE_META } from '../../../utils/adminStatus';
import { formatDateTime } from '../../../utils/orderStatus';
import { ADMIN_TABLE_STICKY, AdminToolbar } from '../../../components/admin/AdminToolbar';
import { t } from '../../../i18n/t';

const { RangePicker } = DatePicker;

export const MovementsTab: React.FC = () => {
  const [params] = useSearchParams();
  const { data: movements = [], isLoading } = useAdminMovements();
  const { data: warehouses = [] } = useAdminWarehouses();
  const { data: products = [] } = useAdminProducts();
  const [sku, setSku] = useState<string | undefined>(params.get('sku') ?? undefined);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const data = useMemo(
    () =>
      movements
        .filter((m) => !sku || m.sku === sku)
        .filter((m) => {
          if (!range) return true;
          const d = m.createdAt.slice(0, 10);
          return d >= range[0].format('YYYY-MM-DD') && d <= range[1].format('YYYY-MM-DD');
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [movements, sku, range]
  );

  const columns: TableColumnsType<StockMovement> = [
    { title: t('admin.common.time', 'Thời gian'), dataIndex: 'createdAt', width: 150, render: (v: string) => formatDateTime(v) },
    {
      title: 'SKU',
      dataIndex: 'sku',
      render: (v: string) => (
        <div>
          <span className="admin-mono">{v}</span>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {products.find((p) => p.sku === v)?.name}
          </Typography.Text>
        </div>
      ),
    },
    { title: t('admin.common.warehouse', 'Kho'), dataIndex: 'warehouseId', width: 140, render: (id: number) => warehouses.find((w) => w.id === id)?.name ?? id },
    {
      title: t('admin.common.type', 'Loại'),
      dataIndex: 'type',
      width: 110,
      render: (n: StockMovementType) => <Tag color={MOVEMENT_TYPE_META[n].color}>{MOVEMENT_TYPE_META[n].label}</Tag>,
    },
    {
      title: t('admin.common.quantity', 'Số lượng'),
      dataIndex: 'quantity',
      width: 90,
      align: 'right',
      render: (v: number) => (
        <Typography.Text type={v > 0 ? 'success' : 'danger'} strong>
          {v > 0 ? `+${v}` : v}
        </Typography.Text>
      ),
    },
    { title: t('admin.inventory.stockAfter', 'Tồn sau'), dataIndex: 'quantityAfter', width: 80, align: 'right', render: (v: number | null) => v ?? '–' },
    { title: t('admin.inventory.reference', 'Chứng từ'), dataIndex: 'referenceCode', width: 170, render: (v: string | null) => (v ? <span className="admin-mono">{v}</span> : '–') },
    { title: t('admin.common.note', 'Ghi chú'), dataIndex: 'note', render: (v: string | null) => v ?? '–' },
    { title: t('admin.inventory.createdBy', 'Người tạo'), dataIndex: 'createdBy', width: 100, render: (v: string | null) => v ?? t('admin.common.system', 'Hệ thống') },
  ];

  return (
    <>
      <AdminToolbar
        filters={
          <>
            <Select
              allowClear
              showSearch
              placeholder={t('admin.inventory.filterBySku', 'Lọc theo SKU')}
              style={{ width: 320 }}
              value={sku}
              onChange={setSku}
              optionFilterProp="label"
              options={products.map((p) => ({ value: p.sku, label: `${p.sku} · ${p.name}` }))}
            />
            <RangePicker format="DD/MM/YYYY" value={range} onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)} />
          </>
        }
      />
      <Table
        rowKey="id"
        size="small"
        sticky={ADMIN_TABLE_STICKY}
        scroll={{ x: 1100 }}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 50, showTotal: (n) => t('admin.inventory.movements', '{{count}} biến động', { count: n }) }}
      />
    </>
  );
};
