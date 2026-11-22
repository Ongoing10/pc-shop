import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Col, DatePicker, Empty, Flex, Row, Segmented, Statistic, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, RiseOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import {
  DailyTrendChart,
  OrderStatusChart,
  TrendMetric,
} from '../../../components/admin/DashboardCharts';
import {
  useAdminInventory,
  useAdminOrders,
  useAdminProducts,
  useAdminWarehouses,
  useStatsOverview,
  useTopProducts,
} from '../../../hooks/admin/useAdminApi';
import { buildDailyStats } from '../../../utils/adminStats';
import { ORDER_STATUS_META, availableQty } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { Inventory, OrderStatus, StatsOverview, TopProduct } from '../../../types/admin';
import { t } from '../../../i18n/t';

const { RangePicker } = DatePicker;

const ALL_STATUSES = Object.keys(ORDER_STATUS_META).map(Number) as OrderStatus[];

const EMPTY_OVERVIEW: StatsOverview = { from: '', to: '', totalOrders: 0, revenue: 0, grossRevenue: 0, ordersByStatus: {} as StatsOverview['ordersByStatus'] };

type LowStockRow = Inventory & { productName: string; warehouseName: string; available: number };

/** A01: số liệu bán hàng theo khoảng ngày, biểu đồ theo ngày / trạng thái / danh mục, hàng sắp hết */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, 'day'), dayjs()]);
  const [metric, setMetric] = useState<TrendMetric>('revenue');
  const { data: orders = [] } = useAdminOrders();
  const { data: products = [] } = useAdminProducts();
  const { data: inventories = [] } = useAdminInventory();
  const { data: warehouses = [] } = useAdminWarehouses();

  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const { data: overview = EMPTY_OVERVIEW } = useStatsOverview(from, to);
  const { data: topProducts = [] } = useTopProducts(from, to, 10);
  // Backend chưa có API thống kê theo ngày: tính từ danh sách đơn
  const daily = useMemo(() => buildDailyStats(orders, from, to), [orders, from, to]);
  // Giữ thứ tự luồng trạng thái (không xếp theo số lượng) để mắt quen vị trí từng trạng thái
  const statusData = ALL_STATUSES.map((s) => ({
    status: s,
    label: ORDER_STATUS_META[s].label,
    count: overview.ordersByStatus[`${s}`] ?? 0,
  }));

  // Sắp hết hàng: tính từ tồn kho (GET /admin/inventory), tên sản phẩm ghép từ danh sách sản phẩm
  const lowStock: LowStockRow[] = inventories
    .filter((row) => availableQty(row) <= row.minQuantity)
    .map((row) => ({
      ...row,
      available: availableQty(row),
      productName: products.find((p) => p.sku === row.sku)?.name ?? row.sku,
      warehouseName: warehouses.find((w) => w.id === row.warehouseId)?.name ?? `#${row.warehouseId}`,
    }))
    .sort((a, b) => a.available - b.available);

  const hasOrders = overview.totalOrders > 0;
  const emptyRange = <Empty description={t('admin.dashboard.noOrdersInThisDate', 'Không có đơn nào trong khoảng ngày này')} />;

  const topColumns: TableColumnsType<TopProduct> = [
    { title: '#', key: 'rank', width: 44, render: (_, __, i) => <Typography.Text type="secondary">{i + 1}</Typography.Text> },
    {
      title: t('admin.common.products', 'Sản phẩm'),
      dataIndex: 'productName',
      render: (name: string, row) => (
        <div>
          <div className="admin-cell-title">{name}</div>
          <Typography.Text type="secondary" className="admin-mono">
            {row.sku}
          </Typography.Text>
        </div>
      ),
    },
    { title: t('admin.common.sold', 'Đã bán'), dataIndex: 'quantity', width: 80, align: 'right' },
    { title: t('admin.common.revenue', 'Doanh thu'), dataIndex: 'revenue', width: 140, align: 'right', render: (v: number) => formatCurrency(v) },
  ];

  const lowColumns: TableColumnsType<LowStockRow> = [
    {
      title: t('admin.common.products', 'Sản phẩm'),
      dataIndex: 'productName',
      // cột hẹp: gộp kho vào dòng phụ thay vì cột riêng
      render: (name: string, row) => (
        <div>
          <div className="admin-cell-title">{name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <span className="admin-mono">{row.sku}</span> · {row.warehouseName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t('admin.common.available', 'Có thể bán'),
      dataIndex: 'available',
      width: 150,
      align: 'right',
      render: (v: number, row) => (
        <Tag color={v <= 0 ? 'red' : 'gold'} style={{ marginInlineEnd: 0 }}>
          {v <= 0 ? t('admin.dashboard.outOfStock', 'Hết hàng') : t('admin.dashboard.left', 'Còn {{v}}', { v })} {t('admin.dashboard.min', '· tối thiểu')} {row.minQuantity}
        </Tag>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.overview', 'Tổng quan')}
        subtitle={t('admin.dashboard.dataFromTo', 'Số liệu từ {{date}} đến {{date2}}', { date: range[0].format('DD/MM/YYYY'), date2: range[1].format('DD/MM/YYYY') })}
        extra={
          <RangePicker
            value={range}
            allowClear={false}
            format="DD/MM/YYYY"
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            // tối đa 1 năm, không chọn ngày tương lai
            disabledDate={(d, { from: start }) =>
              d.isAfter(dayjs(), 'day') || (start ? Math.abs(d.diff(start, 'day')) > 365 : false)
            }
            presets={[
              { label: t('admin.dashboard.n7Days', '7 ngày'), value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: t('admin.dashboard.n30Days', '30 ngày'), value: [dayjs().subtract(29, 'day'), dayjs()] },
              { label: t('admin.dashboard.thisMonth', 'Tháng này'), value: [dayjs().startOf('month'), dayjs()] },
              { label: t('admin.dashboard.n90Days', '90 ngày'), value: [dayjs().subtract(89, 'day'), dayjs()] },
            ]}
          />
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} xl={6}>
          <Card>
            <Statistic title={t('admin.dashboard.totalOrders', 'Tổng số đơn')} value={overview.totalOrders} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card>
            <Statistic
              title={t('admin.dashboard.revenueCompletedOrders', 'Doanh thu (đơn hoàn tất)')}
              value={overview.revenue}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card>
            <Statistic
              title={t('admin.dashboard.grossRevenueExclCancelledReturned', 'Doanh thu gộp (trừ hủy, trả)')}
              value={overview.grossRevenue}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card hoverable onClick={() => navigate('/admin/inventory?lowStock=1')}>
            <Statistic
              title={t('admin.dashboard.lowStockLines', 'Dòng tồn kho sắp hết')}
              value={lowStock.length}
              prefix={<WarningOutlined />}
              styles={{ content: { color: lowStock.length ? 'var(--warn)' : undefined } }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card
            title={metric === 'revenue' ? t('admin.dashboard.grossRevenueByDay', 'Doanh thu gộp theo ngày') : t('admin.dashboard.ordersByDay', 'Số đơn theo ngày')}
            extra={
              <Segmented<TrendMetric>
                size="small"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'revenue', label: t('admin.common.revenue', 'Doanh thu') },
                  { value: 'orders', label: t('admin.dashboard.orders2', 'Số đơn') },
                ]}
              />
            }
            style={{ height: '100%' }}
          >
            {hasOrders ? <DailyTrendChart data={daily} metric={metric} height={340} /> : emptyRange}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={t('admin.dashboard.ordersByStatus2', 'Đơn theo trạng thái')}
            extra={<Link to="/admin/orders">{t('admin.dashboard.viewAll', 'Xem tất cả')}</Link>}
            style={{ height: '100%' }}
          >
            {hasOrders ? (
              <>
                <OrderStatusChart data={statusData} onSelect={(s) => navigate(`/admin/orders?status=${s}`)} />
                <Typography.Text type="secondary" className="admin-chart-hint">
                  {t('admin.dashboard.clickABarToOpen', 'Bấm vào một cột để mở danh sách đơn ở trạng thái đó.')}
                </Typography.Text>
              </>
            ) : (
              emptyRange
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Flex vertical gap={16}>

            <Card title={t('admin.dashboard.lowStock', 'Sắp hết hàng')} extra={<Link to="/admin/inventory?lowStock=1">{t('admin.dashboard.openInventory', 'Mở trang tồn kho')}</Link>}>
              <Table
                size="small"
                rowKey="id"
                columns={lowColumns}
                dataSource={lowStock}
                pagination={false}
                onRow={(row) => ({
                  onClick: () => navigate(`/admin/inventory?lowStock=1&sku=${row.sku}`),
                  style: { cursor: 'pointer' },
                })}
                locale={{ emptyText: <Empty description={t('admin.dashboard.noItemsBelowTheThreshold', 'Không có mặt hàng nào dưới ngưỡng')} /> }}
              />
            </Card>
          </Flex>
        </Col>

        <Col xs={24} xl={14}>
          <Card title={t('admin.dashboard.bestSellers', 'Sản phẩm bán chạy')} style={{ height: '100%' }}>
            <Table
              size="small"
              rowKey="sku"
              columns={topColumns}
              dataSource={topProducts}
              pagination={false}
              locale={{ emptyText: <Empty description={t('admin.dashboard.noProductsSoldYet', 'Chưa bán được sản phẩm nào')} /> }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};
