import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Avatar, Button, Card, Col, Descriptions, Flex, Result, Row, Table, Tag, Timeline, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { PrinterOutlined, SwapOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { OrderStatusModal } from '../../../components/admin/OrderStatusModal';
import { useAdminData } from '../../../context/AdminDataContext';
import { useAdminSession } from '../../../context/AdminSessionContext';
import { mockOrderItems, mockUsers } from '../../../services/api/adminMockData';
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

/** A06: chi tiết đơn + timeline trạng thái */
export const AdminOrderDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { can } = useAdminSession();
  const {
    orders: [orders],
    orderHistories: [histories],
    payments: [payments],
    refunds: [refunds],
  } = useAdminData();
  const { changeStatus } = useOrderActions();
  const [modalOpen, setModalOpen] = useState(false);

  // TODO ghép API: GET /admin/orders/{code} (order + items), GET /orders/{code}/timeline
  const order = orders.find((o) => o.code === code);

  if (!order) {
    return (
      <Result
        status="404"
        title="Không tìm thấy đơn hàng"
        subTitle={`Mã đơn ${code} không tồn tại.`}
        extra={<Button onClick={() => navigate('/admin/orders')}>Về danh sách đơn</Button>}
      />
    );
  }

  const items = mockOrderItems.filter((it) => it.orderId === order.id);
  const timeline = histories.filter((h) => h.orderId === order.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const actorName = (id: string | null) =>
    id === null ? 'Hệ thống' : id === order.userId ? 'Khách hàng' : mockUsers.find((u) => u.id === id)?.username ?? id;

  // TODO ghép API: GET /payments/{code}; yêu cầu hoàn tiền: GET /admin/refunds (lọc theo mã đơn ở client)
  const orderPayments = payments.filter((p) => p.orderId === order.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orderRefunds = refunds.filter((r) => r.orderCode === order.code);

  // Bước tương lai theo luồng chuẩn (COD 1 → 4 → 5 → 6, online 1 → 2 → 3 → 4 → 5 → 6), vẽ mờ
  const isFinal = order.status === 7 || order.status === 8;
  const flow: OrderStatus[] = order.paymentMethod === 1 ? ORDER_MAIN_FLOW : [1, 2, 3, 4, 5, 6];
  const futureSteps: OrderStatus[] = isFinal ? [] : flow.filter((s) => s > order.status);

  const paymentColumns: TableColumnsType<AdminPayment> = [
    { title: 'Mã giao dịch', dataIndex: 'paymentCode', render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: 'Cách', dataIndex: 'method', width: 80, render: (m: AdminPayment['method']) => PAYMENT_METHOD_LABEL[m] },
    { title: 'Số tiền', dataIndex: 'amount', width: 130, align: 'right', render: (v: number) => formatCurrency(v) },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (st: AdminPayment['status']) => (
        <Tag color={PAYMENT_RECORD_STATUS_META[st].color}>{PAYMENT_RECORD_STATUS_META[st].label}</Tag>
      ),
    },
    { title: 'Thời gian', key: 'at', width: 150, render: (_: unknown, p) => formatDateTime(p.paidAt ?? p.createdAt) },
  ];

  const itemColumns: TableColumnsType<AdminOrderItem> = [
    {
      title: 'Sản phẩm',
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
    { title: 'Đơn giá', dataIndex: 'unitPrice', width: 130, align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' },
    { title: 'Bảo hành', dataIndex: 'warrantyMonths', width: 100, align: 'right', render: (v: number | null) => (v ? `${v} tháng` : '–') },
    { title: 'Thành tiền', dataIndex: 'lineTotal', width: 140, align: 'right', render: (v: number) => <b>{formatCurrency(v)}</b> },
  ];

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: 'Đơn hàng', link: '/admin/orders' }]}
        title={order.code}
        subtitle={`Đặt lúc ${order.placedAt ? formatDateTime(order.placedAt) : '–'}`}
        extra={
          <>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              In phiếu
            </Button>
            {can('order:update-status') && (
              <Button type="primary" icon={<SwapOutlined />} disabled={isFinal} onClick={() => setModalOpen(true)}>
                Đổi trạng thái
              </Button>
            )}
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Flex vertical gap={16}>
            <Card title="Thông tin đơn">
              <Descriptions
                column={2}
                size="small"
                items={[
                  {
                    key: 'status',
                    label: 'Trạng thái',
                    children: <Tag color={ORDER_STATUS_META[order.status].color}>{ORDER_STATUS_META[order.status].label}</Tag>,
                  },
                  {
                    key: 'payment',
                    label: 'Thanh toán',
                    children: (
                      <Flex gap={6}>
                        {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                        <Tag color={PAYMENT_STATUS_META[order.paymentStatus].color} bordered={false}>
                          {PAYMENT_STATUS_META[order.paymentStatus].label}
                        </Tag>
                      </Flex>
                    ),
                  },
                  { key: 'receiver', label: 'Người nhận', children: order.receiverName },
                  { key: 'phone', label: 'Số điện thoại', children: order.receiverPhone },
                  { key: 'address', label: 'Địa chỉ giao', span: 2, children: order.shippingAddress },
                  { key: 'note', label: 'Ghi chú của khách', span: 2, children: order.note ?? '–' },
                  ...(order.cancelReason
                    ? [{ key: 'cancel', label: 'Lý do hủy', span: 2, children: <Typography.Text type="danger">{order.cancelReason}</Typography.Text> }]
                    : []),
                ]}
              />
            </Card>

            <Card
              title="Thanh toán"
              extra={orderRefunds.length > 0 && <Link to="/admin/refunds">Trang hoàn tiền</Link>}
            >
              {orderPayments.length === 0 ? (
                <Typography.Text type="secondary">
                  {order.paymentMethod === 1 ? 'COD: ghi nhận khi giao xong.' : 'Khách chưa bấm thanh toán.'}
                </Typography.Text>
              ) : (
                <Table rowKey="id" size="small" columns={paymentColumns} dataSource={orderPayments} pagination={false} />
              )}
              {orderRefunds.map((r) => (
                <Flex key={r.id} gap={8} align="center" wrap className="admin-refund-line">
                  <Tag color={REFUND_STATUS_META[r.status].color}>{REFUND_STATUS_META[r.status].label}</Tag>
                  <span>
                    Hoàn {formatCurrency(r.amount)} cho <span className="admin-mono">{r.paymentCode}</span>
                  </span>
                  {r.reason && <Typography.Text type="secondary">· {r.reason}</Typography.Text>}
                </Flex>
              ))}
            </Card>

            <Card title={`Sản phẩm (${items.length})`}>
              <Table rowKey="id" size="small" columns={itemColumns} dataSource={items} pagination={false} />
              <Descriptions
                className="admin-totals"
                column={1}
                size="small"
                items={[
                  { key: 'sub', label: 'Tiền hàng', children: formatCurrency(order.subtotalAmount) },
                  {
                    key: 'discount',
                    label: order.voucherCode ? `Giảm giá (${order.voucherCode})` : 'Giảm giá',
                    children: order.discountAmount ? `− ${formatCurrency(order.discountAmount)}` : '0 ₫',
                  },
                  { key: 'ship', label: 'Phí vận chuyển', children: order.shippingFee ? formatCurrency(order.shippingFee) : 'Miễn phí' },
                  { key: 'total', label: 'Tổng thanh toán', children: <b className="admin-total">{formatCurrency(order.totalAmount)}</b> },
                ]}
              />
            </Card>
          </Flex>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="Lịch sử trạng thái">
            <Timeline
              items={[
                ...timeline.map((h, i) => ({
                  key: h.id,
                  color: h.toStatus === 7 || h.toStatus === 8 ? 'red' : i === timeline.length - 1 ? 'orange' : 'green',
                  content: (
                    <div className="admin-timeline-item">
                      <b>{h.fromStatus === null ? 'Đặt hàng' : ORDER_STATUS_META[h.toStatus].label}</b>
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
            message.success(`Đơn ${order.code} đã chuyển sang "${ORDER_STATUS_META[status].label}"`);
            setModalOpen(false);
          }
          return errors;
        }}
      />
    </>
  );
};
