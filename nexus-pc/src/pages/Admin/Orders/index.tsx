import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { App, Badge, Button, Card, DatePicker, Flex, Input, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DownloadOutlined, EyeOutlined, SwapOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import { OrderStatusModal } from '../../../components/admin/OrderStatusModal';
import { useAdminOrders } from '../../../hooks/admin/useAdminApi';
import { adminOrderService } from '../../../services/api/admin/adminOrderService';
import { saveDownloadedFile } from '../../../utils/download';
import { useAdminSession } from '../../../context/AdminSessionContext';
import { AdminOrder, OrderStatus } from '../../../types/admin';
import { ORDER_STATUS_META, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';
import { useOrderActions } from './useOrderActions';
import { t } from '../../../i18n/t';

const { RangePicker } = DatePicker;
const STATUSES = Object.keys(ORDER_STATUS_META).map(Number) as OrderStatus[];

/** A06: danh sách đơn theo tab trạng thái, lọc ngày + tìm kiếm, đổi trạng thái hàng loạt */
export const AdminOrdersPage: React.FC = () => {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const { can } = useAdminSession();
  const canUpdate = can('order:update-status');
  const { data: orders = [], isLoading } = useAdminOrders();
  const { changeStatus } = useOrderActions();

  const statusParam = params.get('status');
  const activeStatus = statusParam ? (Number(statusParam) as OrderStatus) : undefined;
  const [q, setQ] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [modalOrders, setModalOrders] = useState<AdminOrder[]>([]);

  const filteredNoStatus = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (range) {
          const d = (o.createdAt ?? '').slice(0, 10);
          if (d < range[0].format('YYYY-MM-DD') || d > range[1].format('YYYY-MM-DD')) return false;
        }
        if (!keyword) return true;
        return (
          o.code.toLowerCase().includes(keyword) ||
          o.receiverPhone.includes(keyword) ||
          o.receiverName.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [orders, q, range]);

  const data = activeStatus ? filteredNoStatus.filter((o) => o.status === activeStatus) : filteredNoStatus;
  const selectedOrders = orders.filter((o) => selectedKeys.includes(o.code));

  const countBy = (s?: OrderStatus) => (s ? filteredNoStatus.filter((o) => o.status === s).length : filteredNoStatus.length);

  const setStatusTab = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === 'all') next.delete('status');
    else next.set('status', key);
    setParams(next, { replace: true });
    setSelectedKeys([]);
  };

  const columns: TableColumnsType<AdminOrder> = [
    {
      title: t('admin.orders.orderCode', 'Mã đơn'),
      dataIndex: 'code',
      width: 180,
      fixed: 'left',
      render: (code: string) => (
        <Link to={`/admin/orders/${code}`} className="admin-mono">
          {code}
        </Link>
      ),
    },
    {
      title: t('admin.orders.orderDate', 'Ngày đặt'),
      dataIndex: 'createdAt',
      width: 150,
      sorter: (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('admin.orders.recipient', 'Người nhận'),
      dataIndex: 'receiverName',
      render: (name: string, o) => (
        <div>
          <div className="admin-cell-title">{name}</div>
          <Typography.Text type="secondary">{o.receiverPhone}</Typography.Text>
        </div>
      ),
    },
    {
      title: t('admin.orders.total', 'Tổng tiền'),
      dataIndex: 'totalAmount',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (v: number) => <b>{formatCurrency(v)}</b>,
    },
    {
      title: t('admin.orders.payment', 'Thanh toán'),
      key: 'payment',
      width: 200,
      render: (_, o) => (
        <Flex gap={6} align="center" style={{ whiteSpace: 'nowrap' }}>
          <Typography.Text>{PAYMENT_METHOD_LABEL[o.paymentMethod]}</Typography.Text>
          <Tag color={PAYMENT_STATUS_META[o.paymentStatus].color} bordered={false}>
            {PAYMENT_STATUS_META[o.paymentStatus].label}
          </Tag>
        </Flex>
      ),
    },
    {
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'status',
      width: 140,
      render: (s: OrderStatus) => <Tag color={ORDER_STATUS_META[s].color}>{ORDER_STATUS_META[s].label}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 96,
      fixed: 'right',
      render: (_, o) => (
        <Flex gap={4}>
          <Tooltip title={t('admin.common.viewDetails', 'Xem chi tiết')}>
            <Link to={`/admin/orders/${o.code}`}>
              <Button type="text" size="small" icon={<EyeOutlined />} aria-label={t('admin.common.viewDetails', 'Xem chi tiết')} />
            </Link>
          </Tooltip>
          {canUpdate && (
            <Tooltip title={t('admin.common.changeStatus', 'Đổi trạng thái')}>
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined />}
                aria-label={t('admin.common.changeStatus', 'Đổi trạng thái')}
                onClick={() => setModalOrders([o])}
              />
            </Tooltip>
          )}
        </Flex>
      ),
    },
  ];

  const handleExport = async () => {
    // GET /admin/orders/export (quá 10.000 đơn → 400); bộ lọc theo trạng thái và khoảng ngày đang chọn
    try {
      const file = await adminOrderService.exportOrders({
        status: activeStatus,
        from: range?.[0].format('YYYY-MM-DD'),
        to: range?.[1].format('YYYY-MM-DD'),
      });
      saveDownloadedFile(file, 'don-hang.xlsx');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.orders', 'Đơn hàng')}
        subtitle={t('admin.orders.trackAndProcessCustomerOrders', 'Theo dõi và xử lý đơn của khách')}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            {t('admin.common.exportExcel', 'Xuất Excel')}
          </Button>
        }
      />

      <Card>
        <Tabs
          activeKey={activeStatus ? String(activeStatus) : 'all'}
          onChange={setStatusTab}
          items={[
            { key: 'all', label: <TabLabel text={t('admin.common.all', 'Tất cả')} count={countBy()} /> },
            ...STATUSES.map((s) => ({
              key: String(s),
              label: <TabLabel text={ORDER_STATUS_META[s].label} count={countBy(s)} />,
            })),
          ]}
        />

        <Flex gap={12} wrap className="admin-filters">
          <Input.Search
            allowClear
            placeholder={t('admin.orders.orderCodePhoneOrRecipient', 'Mã đơn, SĐT hoặc tên người nhận')}
            style={{ width: 320 }}
            onSearch={setQ}
            onChange={(e) => !e.target.value && setQ('')}
          />
          <RangePicker format="DD/MM/YYYY" value={range} onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)} />
        </Flex>

        {canUpdate && (
          <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
            <Button size="small" type="primary" icon={<SwapOutlined />} onClick={() => setModalOrders(selectedOrders)}>
              {t('admin.common.changeStatus', 'Đổi trạng thái')}
            </Button>
          </BulkActionBar>
        )}

        <Table
          rowKey="code"
          size="middle"
          sticky
          scroll={{ x: 1000 }}
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowSelection={canUpdate ? { selectedRowKeys: selectedKeys, onChange: setSelectedKeys } : undefined}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (n) => t('admin.orders.orders', '{{count}} đơn', { count: n }) }}
        />
      </Card>

      <OrderStatusModal
        open={modalOrders.length > 0}
        orders={modalOrders}
        onCancel={() => setModalOrders([])}
        onSubmit={async (status, reason) => {
          const errors = await changeStatus(modalOrders, status, reason);
          if (!errors.length) {
            message.success(t('admin.orders.movedOrdersTo', 'Đã cập nhật {{count}} đơn sang "{{value}}"', { count: modalOrders.length, value: ORDER_STATUS_META[status].label }));
            setModalOrders([]);
            setSelectedKeys([]);
          }
          return errors;
        }}
      />
    </>
  );
};

const TabLabel: React.FC<{ text: string; count: number }> = ({ text, count }) => (
  <Flex align="center" gap={6}>
    {text}
    <Badge count={count} showZero color="var(--panel-2)" className="admin-tabcount" />
  </Flex>
);
