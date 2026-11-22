import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Spin, Avatar, Button, Card, Col, Descriptions, Flex, Result, Row, Table, Tag, Timeline, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { PrinterOutlined, SwapOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { OrderStatusModal } from '../../../components/admin/OrderStatusModal';
import { useAdminOrderDetail, useAdminRefunds } from '../../../hooks/admin/useAdminApi';
import { useAdminSession } from '../../../context/AdminSessionContext';
import { AdminOrderItem, AdminPayment, OrderStatus } from '../../../types/admin';
import {
  ORDER_MAIN_FLOW,
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  PAYMENT_RECORD_STATUS_META,
  PAYMENT_STATUS_META,
  REFUND_STATUS_META,
} from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';
import { useOrderActions } from './useOrderActions';
import { t } from '../../../i18n/t';

/** A06: chi tiết đơn + timeline trạng thái */
export const AdminOrderDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { can } = useAdminSession();
  const { data: detail, isLoading } = useAdminOrderDetail(code);
  const { data: refunds = [] } = useAdminRefunds();
  const { changeStatus } = useOrderActions();
  const [modalOpen, setModalOpen] = useState(false);

  const order = detail?.order;

  if (isLoading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!order) {
    return (
      <Result
        status="404"
        title={t('admin.orders.orderNotFound', 'Không tìm thấy đơn hàng')}
        subTitle={t('admin.orders.orderDoesNotExist', 'Mã đơn {{code}} không tồn tại.', { code })}
        extra={<Button onClick={() => navigate('/admin/orders')}>{t('admin.orders.backToOrders', 'Về danh sách đơn')}</Button>}
      />
    );
  }

  const items = detail.items;
  const timeline = [...detail.timeline].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Backend chỉ trả id người thao tác (UUID Keycloak): khách là chủ đơn, còn lại là nhân viên
  const actorName = (id: string | null) =>
    id === null ? t('admin.common.system', 'Hệ thống') : id === order.userId ? t('admin.common.customer', 'Khách hàng') : t('admin.orders.staff', 'Nhân viên {{value}}', { value: id.slice(0, 8) });

  const orderPayments = [...detail.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orderRefunds = refunds.filter((r) => r.orderCode === order.code);

  // Bước tương lai theo luồng chuẩn (COD 1 → 4 → 5 → 6, online 1 → 2 → 3 → 4 → 5 → 6), vẽ mờ
  const isFinal = order.status === 7 || order.status === 8;
  const flow: OrderStatus[] = order.paymentMethod === 1 ? ORDER_MAIN_FLOW : [1, 2, 3, 4, 5, 6];
  const futureSteps: OrderStatus[] = isFinal ? [] : flow.filter((s) => s > order.status);

  const paymentColumns: TableColumnsType<AdminPayment> = [
    { title: t('admin.orders.transactionId', 'Mã giao dịch'), dataIndex: 'paymentCode', render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: t('admin.orders.method', 'Cách'), dataIndex: 'method', width: 80, render: (m: AdminPayment['method']) => PAYMENT_METHOD_LABEL[m] },
    { title: t('admin.common.amount', 'Số tiền'), dataIndex: 'amount', width: 130, align: 'right', render: (v: number) => formatCurrency(v) },
    {
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'status',
      width: 120,
      render: (st: AdminPayment['status']) => (
        <Tag color={PAYMENT_RECORD_STATUS_META[st].color}>{PAYMENT_RECORD_STATUS_META[st].label}</Tag>
      ),
    },
    { title: t('admin.common.time', 'Thời gian'), key: 'at', width: 150, render: (_: unknown, p) => formatDateTime(p.paidAt ?? p.createdAt) },
  ];

  const itemColumns: TableColumnsType<AdminOrderItem> = [
    {
      title: t('admin.common.products', 'Sản phẩm'),
      dataIndex: 'productName',
      render: (name: string, it) => (
        <Flex gap={12} align="center">
          <Avatar shape="square" size={44} src={it.productImageUrl ?? undefined} />
          <div>
            <div className="admin-cell-title">{name}</div>
            <Typography.Text type="secondary" className="admin-mono">
              {it.sku}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    { title: t('admin.orders.unitPrice', 'Đơn giá'), dataIndex: 'unitPrice', width: 130, align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' },
    { title: t('admin.common.warranty', 'Bảo hành'), dataIndex: 'warrantyMonths', width: 100, align: 'right', render: (v: number | null) => (v ? t('admin.orders.months', '{{v}} tháng', { v }) : '–') },
    { title: t('admin.orders.lineTotal', 'Thành tiền'), dataIndex: 'lineTotal', width: 140, align: 'right', render: (v: number) => <b>{formatCurrency(v)}</b> },
  ];

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: t('admin.common.orders', 'Đơn hàng'), link: '/admin/orders' }]}
        title={order.code}
        subtitle={t('admin.orders.placedAt', 'Đặt lúc {{date}}', { date: order.placedAt ? formatDateTime(order.placedAt) : '–' })}
        extra={
          <>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              {t('admin.orders.print', 'In phiếu')}
            </Button>
            {can('order:update-status') && (
              <Button type="primary" icon={<SwapOutlined />} disabled={isFinal} onClick={() => setModalOpen(true)}>
                {t('admin.common.changeStatus', 'Đổi trạng thái')}
              </Button>
            )}
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Flex vertical gap={16}>
            <Card title={t('admin.orders.orderInformation', 'Thông tin đơn')}>
              <Descriptions
                column={2}
                size="small"
                items={[
                  {
                    key: 'status',
                    label: t('admin.common.status', 'Trạng thái'),
                    children: <Tag color={ORDER_STATUS_META[order.status].color}>{ORDER_STATUS_META[order.status].label}</Tag>,
                  },
                  {
                    key: 'payment',
                    label: t('admin.orders.payment', 'Thanh toán'),
                    children: (
                      <Flex gap={6}>
                        {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                        <Tag color={PAYMENT_STATUS_META[order.paymentStatus].color} bordered={false}>
                          {PAYMENT_STATUS_META[order.paymentStatus].label}
                        </Tag>
                      </Flex>
                    ),
                  },
                  { key: 'receiver', label: t('admin.orders.recipient', 'Người nhận'), children: order.receiverName },
                  { key: 'phone', label: t('admin.orders.phoneNumber', 'Số điện thoại'), children: order.receiverPhone },
                  { key: 'address', label: t('admin.orders.shippingAddress', 'Địa chỉ giao'), span: 2, children: order.shippingAddress },
                  { key: 'note', label: t('admin.orders.customerNote', 'Ghi chú của khách'), span: 2, children: order.note ?? '–' },
                  ...(order.cancelReason
                    ? [{ key: 'cancel', label: t('admin.orders.cancelReason', 'Lý do hủy'), span: 2, children: <Typography.Text type="danger">{order.cancelReason}</Typography.Text> }]
                    : []),
                ]}
              />
            </Card>

            <Card
              title={t('admin.orders.payment', 'Thanh toán')}
              extra={orderRefunds.length > 0 && <Link to="/admin/refunds">{t('admin.orders.refundsPage', 'Trang hoàn tiền')}</Link>}
            >
              {orderPayments.length === 0 ? (
                <Typography.Text type="secondary">
                  {order.paymentMethod === 1 ? t('admin.orders.codRecordedOnDelivery', 'COD: ghi nhận khi giao xong.') : t('admin.orders.theCustomerHasNotPaid', 'Khách chưa bấm thanh toán.')}
                </Typography.Text>
              ) : (
                <Table rowKey="id" size="small" columns={paymentColumns} dataSource={orderPayments} pagination={false} />
              )}
              {orderRefunds.map((r) => (
                <Flex key={r.id} gap={8} align="center" wrap className="admin-refund-line">
                  <Tag color={REFUND_STATUS_META[r.status].color}>{REFUND_STATUS_META[r.status].label}</Tag>
                  <span>
                    {t('admin.common.refund', 'Hoàn')} {formatCurrency(r.amount)} {t('admin.orders.forPayment', 'cho')} <span className="admin-mono">{r.paymentCode}</span>
                  </span>
                  {r.reason && <Typography.Text type="secondary">· {r.reason}</Typography.Text>}
                </Flex>
              ))}
            </Card>

            <Card title={t('admin.orders.products', 'Sản phẩm ({{count}})', { count: items.length })}>
              <Table rowKey="id" size="small" columns={itemColumns} dataSource={items} pagination={false} />
              <Descriptions
                className="admin-totals"
                column={1}
                size="small"
                items={[
                  { key: 'sub', label: t('admin.orders.subtotal', 'Tiền hàng'), children: formatCurrency(order.subtotalAmount) },
                  {
                    key: 'discount',
                    label: order.voucherCode ? t('admin.orders.discount', 'Giảm giá ({{voucherCode}})', { voucherCode: order.voucherCode }) : t('admin.orders.discount2', 'Giảm giá'),
                    children: order.discountAmount ? `− ${formatCurrency(order.discountAmount)}` : '0 ₫',
                  },
                  { key: 'ship', label: t('admin.orders.shippingFee', 'Phí vận chuyển'), children: order.shippingFee ? formatCurrency(order.shippingFee) : t('admin.orders.free', 'Miễn phí') },
                  { key: 'total', label: t('admin.orders.grandTotal', 'Tổng thanh toán'), children: <b className="admin-total">{formatCurrency(order.totalAmount)}</b> },
                ]}
              />
            </Card>
          </Flex>
        </Col>

        <Col xs={24} xl={8}>
          <Card title={t('admin.orders.statusHistory', 'Lịch sử trạng thái')}>
            <Timeline
              items={[
                ...timeline.map((h, i) => ({
                  key: h.id,
                  color: h.toStatus === 7 || h.toStatus === 8 ? 'red' : i === timeline.length - 1 ? 'orange' : 'green',
                  content: (
                    <div className="admin-timeline-item">
                      <b>{h.fromStatus === null ? t('admin.orders.orderPlaced', 'Đặt hàng') : ORDER_STATUS_META[h.toStatus].label}</b>
                      <Typography.Text type="secondary" style={{ display: 'block' }}>
                        {formatDateTime(h.createdAt)} · {actorName(h.createdBy)}
                      </Typography.Text>
                      {h.reason && h.fromStatus !== null && <div className="admin-timeline-reason">{h.reason}</div>}
                    </div>
                  ),
                })),
                ...futureSteps.map((s) => ({
                  key: `future-${s}`,
                  color: 'gray',
                  content: <Typography.Text type="secondary">{ORDER_STATUS_META[s].label}</Typography.Text>,
                })),
              ]}
            />
          </Card>
        </Col>
      </Row>

      <OrderStatusModal
        open={modalOpen}
        orders={[order]}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (status, reason) => {
          const errors = await changeStatus([order], status, reason);
          if (!errors.length) {
            message.success(t('admin.orders.orderMovedTo', 'Đơn {{code}} đã chuyển sang "{{value}}"', { code: order.code, value: ORDER_STATUS_META[status].label }));
            setModalOpen(false);
          }
          return errors;
        }}
      />
    </>
  );
};
