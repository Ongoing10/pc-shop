import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Empty, Modal, Radio, Input, Spin, Statistic, Steps, Table, Tag, Timeline, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  FiPackage,
  FiCheckCircle,
  FiTruck,
  FiClipboard,
  FiXCircle,
  FiRefreshCw,
  FiCreditCard,
  FiClock,
  FiRotateCcw,
} from 'react-icons/fi';
import { AccountShell } from '../../components/account/AccountShell';
import { OrderStatusTag } from '../../components/order/OrderStatusTag';
import { ReviewFormModal } from '../../components/review/ReviewFormModal';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCancelOrder, useOrderDetail, useStartPayment } from '../../hooks/useOrders';
import { useReviewedProductIds } from '../../hooks/useReviews';
import { CartItem } from '../../types/cart';
import { OrderPayment, OrderStatus } from '../../types/order';
import { formatCurrency } from '../../utils/format';
import {
  ORDER_STATUS_META,
  PAYMENT_METHOD_META,
  PAYMENT_RECORD_STATUS_META,
  PAYMENT_STATUS_META,
  canCancelOrder,
  formatDateTime,
  isOnlinePayment,
  orderFlow,
  paymentDeadline,
} from '../../utils/orderStatus';

const CANCEL_REASONS = [
  'Tôi muốn đổi sang sản phẩm khác',
  'Tôi muốn đổi địa chỉ giao hàng',
  'Tìm được giá tốt hơn ở nơi khác',
  'Đặt nhầm, không còn nhu cầu',
];
const OTHER_REASON = '__other__';

const STEP_ICONS: Record<OrderStatus, React.ReactNode> = {
  1: <FiClipboard />,
  2: <FiClock />,
  3: <FiCreditCard />,
  4: <FiPackage />,
  5: <FiTruck />,
  6: <FiCheckCircle />,
  7: <FiXCircle />,
  8: <FiRotateCcw />,
};

export const OrderDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addItemsToCart } = useCart();
  const { data: order, isLoading } = useOrderDetail(code);
  const { data: reviewedIds = [] } = useReviewedProductIds(user?.id);
  const cancelOrder = useCancelOrder();
  const startPayment = useStartPayment();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reasonChoice, setReasonChoice] = useState(CANCEL_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [reviewItem, setReviewItem] = useState<CartItem | null>(null);

  const parent = { label: t('account.tabOrders', 'Đơn hàng của tôi'), link: '/account/orders' };

  if (isLoading) {
    return (
      <AccountShell title={code || ''} parent={parent}>
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      </AccountShell>
    );
  }

  if (!order) {
    return (
      <AccountShell title={code || ''} parent={parent}>
        <div className="emptybox">
          <Empty description={t('orders.notFound', { code, defaultValue: `Không tìm thấy đơn hàng ${code}` })}>
            <Link to="/account/orders">
              <Button type="primary">{t('orders.backToList', 'Về danh sách đơn')}</Button>
            </Link>
          </Empty>
        </div>
      </AccountShell>
    );
  }

  const online = isOnlinePayment(order.paymentMethod);
  const flow = orderFlow(order.paymentMethod);
  const isClosed = order.status === 7 || order.status === 8;
  const awaitingPayment = order.status === 2;
  const pendingRefund = order.refunds.find((r) => r.status === 1);
  const reachedAt = (status: OrderStatus) => order.statusHistory.find((h) => h.toStatus === status)?.createdAt;
  const lastReason = order.statusHistory[order.statusHistory.length - 1]?.reason;

  const handleCancel = () => {
    const reason = reasonChoice === OTHER_REASON ? otherReason.trim() : reasonChoice;
    if (!reason) {
      message.warning(t('orders.cancelReasonRequired', 'Vui lòng nhập lý do hủy đơn.'));
      return;
    }
    cancelOrder.mutate(
      { code: order.id, reason },
      {
        onSuccess: () => {
          message.success(t('orders.cancelled', 'Đã hủy đơn hàng.'));
          setCancelOpen(false);
        },
        onError: (err: any) => message.error(err?.message || t('common.errorOccurred', 'Có lỗi xảy ra, vui lòng thử lại')),
      }
    );
  };

  // POST /payments/{orderCode} rồi chuyển trình duyệt tới paymentUrl (VNPay hoặc trang giả lập)
  const handlePay = () => {
    startPayment.mutate(order.id, {
      onSuccess: (init) => {
        if (/^https?:\/\//.test(init.paymentUrl)) window.location.assign(init.paymentUrl);
        else navigate(init.paymentUrl);
      },
      onError: (err: any) => message.error(err?.message || t('common.errorOccurred', 'Có lỗi xảy ra, vui lòng thử lại')),
    });
  };

  const handleBuyAgain = () => {
    addItemsToCart(order.items.map((it) => ({ product: it, quantity: it.qty })));
  };

  const payButton = awaitingPayment && online && (
    <Button type="primary" icon={<FiCreditCard />} loading={startPayment.isPending} onClick={handlePay}>
      {t('orders.payNow', 'Thanh toán ngay')}
    </Button>
  );

  // Banner theo dõi ngay sau khi đặt (?placed=1): đơn 1 chỉ tồn tại 1–3 giây trong lúc giữ hàng
  const placedBanner = justPlaced && (
    order.status === 1 ? (
      <Alert
        type="info"
        showIcon
        icon={<Spin size="small" />}
        className="order-banner"
        title={t('orders.placedHolding', 'Đã nhận đơn, đang giữ hàng cho bạn...')}
        description={t('orders.placedHoldingDesc', 'Thường mất vài giây. Bạn có thể rời trang, kết quả sẽ có trong thông báo.')}
      />
    ) : order.status === 4 ? (
      <Alert
        type="success"
        showIcon
        className="order-banner"
        title={t('common.orderSuccess', 'Đặt hàng thành công!')}
        description={t('orders.placedConfirmed', 'Hàng đã được giữ, đơn đang được chuẩn bị để giao.')}
      />
    ) : order.status === 2 ? (
      <Alert
        type="warning"
        showIcon
        className="order-banner"
        title={t('orders.placedAwaiting', 'Đơn đã được giữ hàng, vui lòng thanh toán')}
        description={t('orders.placedAwaitingDesc', 'Bạn có 15 phút để thanh toán, quá hạn đơn sẽ tự hủy và nhả hàng.')}
        action={payButton}
      />
    ) : null
  );

  const paymentColumns: TableColumnsType<OrderPayment> = [
    { title: t('orders.paymentCode', 'Mã giao dịch'), dataIndex: 'paymentCode', render: (v: string) => <code>{v}</code> },
    { title: t('orders.paymentAmount', 'Số tiền'), dataIndex: 'amount', align: 'right', render: (v: number) => formatCurrency(v) },
    {
      title: t('orders.paymentStatus', 'Trạng thái'),
      dataIndex: 'status',
      render: (s: OrderPayment['status']) => (
        <Tag color={PAYMENT_RECORD_STATUS_META[s].color}>
          {t(PAYMENT_RECORD_STATUS_META[s].labelKey, PAYMENT_RECORD_STATUS_META[s].label)}
        </Tag>
      ),
    },
    {
      title: t('orders.paymentTime', 'Thời gian'),
      key: 'time',
      render: (_: unknown, p) => formatDateTime(p.paidAt ?? p.createdAt),
    },
  ];

  return (
    <AccountShell
      title={`${t('orders.order', 'Đơn hàng')} ${order.id}`}
      subtitle={`${t('orders.placedAt', 'Đặt ngày')} ${formatDateTime(order.createdAt)}`}
      parent={parent}
      actions={<OrderStatusTag status={order.status} />}
    >
      {placedBanner}

      {order.status === 7 ? (
        <Alert
          type="error"
          showIcon
          icon={<FiXCircle />}
          className="order-banner"
          title={t('orders.cancelledTitle', 'Đơn hàng đã hủy')}
          description={order.cancelReason && `${t('orders.cancelReason', 'Lý do')}: ${order.cancelReason}`}
        />
      ) : order.status === 8 ? (
        <Alert
          type="warning"
          showIcon
          icon={<FiRotateCcw />}
          className="order-banner"
          title={t('orders.returnedTitle', 'Đơn hàng đã được trả')}
          description={lastReason && `${t('orders.cancelReason', 'Lý do')}: ${lastReason}`}
        />
      ) : (
        <Steps
          className="order-steps"
          current={flow.indexOf(order.status)}
          items={flow.map((s) => {
            const at = reachedAt(s);
            return {
              title: t(ORDER_STATUS_META[s].labelKey, ORDER_STATUS_META[s].label),
              content: at ? formatDateTime(at) : undefined,
              icon: STEP_ICONS[s],
            };
          })}
        />
      )}

      {pendingRefund && (
        <Alert
          type="info"
          showIcon
          className="order-banner"
          title={t('orders.refundPending', {
            amount: formatCurrency(pendingRefund.amount),
            defaultValue: `Cửa hàng đang hoàn ${formatCurrency(pendingRefund.amount)} cho bạn`,
          })}
          description={t('orders.refundPendingDesc', 'Tiền sẽ về tài khoản / ví đã thanh toán trong 3–7 ngày làm việc.')}
        />
      )}

      <div className="order-actions">
        {!justPlaced && payButton}
        {canCancelOrder(order) && (
          <Button danger onClick={() => setCancelOpen(true)}>
            {t('orders.cancelOrder', 'Hủy đơn hàng')}
          </Button>
        )}
        <Button icon={<FiRefreshCw />} onClick={handleBuyAgain}>
          {t('orders.buyAgain', 'Mua lại')}
        </Button>
      </div>

      <div className="order-info">
        <div>
          <small>{t('orders.receiver', 'Người nhận')}</small>
          <b>{order.shippingAddress.fullName}</b>
          <span>{order.shippingAddress.phone}</span>
          <span>
            {order.shippingAddress.address}, {order.shippingAddress.city}
          </span>
          {order.shippingAddress.note && (
            <span className="muted-line">
              {t('orders.note', 'Ghi chú')}: {order.shippingAddress.note}
            </span>
          )}
        </div>
        <div>
          <small>{t('orders.payment', 'Thanh toán')}</small>
          <b>{t(PAYMENT_METHOD_META[order.paymentMethod].labelKey, PAYMENT_METHOD_META[order.paymentMethod].label)}</b>
          <span>
            <Tag color={PAYMENT_STATUS_META[order.paymentStatus].color} bordered={false}>
              {t(PAYMENT_STATUS_META[order.paymentStatus].labelKey, PAYMENT_STATUS_META[order.paymentStatus].label)}
            </Tag>
          </span>
          {awaitingPayment && online && (
            <Statistic.Timer
              type="countdown"
              className="pay-countdown"
              title={t('orders.payDeadline', 'Thời gian còn lại để thanh toán')}
              value={paymentDeadline(order).getTime()}
              format="mm:ss"
            />
          )}
          {(order.status === 4 || order.status === 5) && (
            <span className="muted-line">
              {t('orders.estimatedDelivery', 'Dự kiến giao')}: {order.estimatedDelivery}
            </span>
          )}
        </div>
      </div>

      <h3>{t('orders.items', 'Sản phẩm')}</h3>
      <div className="order-items">
        {order.items.map((it) => {
          const reviewed = reviewedIds.includes(it.id);
          return (
            <div className="order-item" key={it.id}>
              <img src={it.image} alt="" />
              <span>
                <Link to={`/product/${it.id}`}>{it.name}</Link>
                <small>
                  {formatCurrency(it.price)} × {it.qty}
                  {it.warrantyMonths ? ` · ${t('orders.warranty', 'Bảo hành')} ${it.warrantyMonths} ${t('orders.months', 'tháng')}` : ''}
                </small>
              </span>
              <b className="num">{formatCurrency(it.price * it.qty)}</b>
              {order.status === 6 && (
                <Button size="small" disabled={reviewed} onClick={() => setReviewItem(it)}>
                  {reviewed ? t('review.reviewed', 'Đã đánh giá') : t('review.write', 'Viết đánh giá')}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="order-totals">
        <p>
          <span>{t('cart.subtotal', 'Tạm tính')}</span>
          <b>{formatCurrency(order.subtotal)}</b>
        </p>
        {order.discountAmount > 0 && (
          <p>
            <span>
              {t('checkout.discount', 'Giảm giá')}
              {order.voucherCode && <code>{order.voucherCode}</code>}
            </span>
            <b className="discount">−{formatCurrency(order.discountAmount)}</b>
          </p>
        )}
        <p>
          <span>{t('cart.shipping', 'Vận chuyển')}</span>
          <b>{order.shippingFee > 0 ? formatCurrency(order.shippingFee) : t('checkout.free', 'Miễn phí')}</b>
        </p>
        <p className="grand">
          <span>{t('cart.total', 'Tổng cộng')}</span>
          <b>{formatCurrency(order.totalAmount)}</b>
        </p>
      </div>

      {order.payments.length > 0 && (
        <>
          <h3>{t('orders.payments', 'Các lần thanh toán')}</h3>
          <Table
            rowKey="paymentCode"
            size="small"
            pagination={false}
            columns={paymentColumns}
            dataSource={[...order.payments].reverse()}
            style={{ marginBottom: 24 }}
          />
        </>
      )}

      <h3>{t('orders.timeline', 'Lịch sử đơn hàng')}</h3>
      <Timeline
        className="timeline"
        items={[...order.statusHistory].reverse().map((h, i) => ({
          key: `${h.toStatus}-${h.createdAt}`,
          color: i === 0 ? 'var(--accent)' : 'var(--line-strong)',
          content: (
            <>
              <b>
                {h.fromStatus === null
                  ? t('orders.placed', 'Đặt hàng')
                  : t(ORDER_STATUS_META[h.toStatus].labelKey, ORDER_STATUS_META[h.toStatus].label)}
              </b>
              <time dateTime={h.createdAt}>{formatDateTime(h.createdAt)}</time>
              {h.reason && h.fromStatus !== null && <p>{h.reason}</p>}
            </>
          ),
        }))}
      />

      <Modal
        open={cancelOpen}
        title={t('orders.cancelTitle', { code: order.id, defaultValue: `Hủy đơn hàng ${order.id}` })}
        onCancel={() => setCancelOpen(false)}
        onOk={handleCancel}
        okText={t('orders.confirmCancel', 'Xác nhận hủy')}
        okButtonProps={{ danger: true }}
        cancelText={t('orders.keepOrder', 'Giữ đơn')}
        confirmLoading={cancelOrder.isPending}
      >
        <p style={{ color: 'var(--text-2)', marginTop: 0 }}>
          {t('orders.cancelHint', 'Đơn chưa giao và chưa thanh toán nên có thể hủy ngay, hàng đang giữ sẽ được nhả. Vui lòng cho biết lý do:')}
        </p>
        <Radio.Group
          value={reasonChoice}
          onChange={(e) => setReasonChoice(e.target.value)}
          style={{ display: 'grid', gap: 10 }}
        >
          {CANCEL_REASONS.map((r) => (
            <Radio key={r} value={r}>
              {r}
            </Radio>
          ))}
          <Radio value={OTHER_REASON}>{t('orders.otherReason', 'Lý do khác')}</Radio>
        </Radio.Group>
        {reasonChoice === OTHER_REASON && (
          <Input.TextArea
            style={{ marginTop: 12 }}
            rows={3}
            maxLength={255}
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            placeholder={t('orders.otherReasonPlaceholder', 'Nhập lý do hủy đơn')}
          />
        )}
      </Modal>

      <ReviewFormModal open={Boolean(reviewItem)} product={reviewItem} onClose={() => setReviewItem(null)} />
    </AccountShell>
  );
};
