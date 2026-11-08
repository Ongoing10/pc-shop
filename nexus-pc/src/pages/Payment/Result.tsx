import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Result, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStartPayment } from '../../hooks/useOrders';
import { PaymentResult } from '../../types/order';

const RESULTS: PaymentResult[] = ['success', 'failed', 'refund', 'invalid'];

/**
 * Trang kết quả thanh toán: backend (return URL VNPay / trang giả lập) chuyển về
 * /orders/payment-result?orderCode=&result=success|failed|refund|invalid (pcshop.payment.frontend-return-url).
 * Không tự kết luận từ tham số: đơn hiển thị theo GET /orders/{code} ở trang chi tiết.
 */
export const PaymentResultPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const startPayment = useStartPayment();
  const orderCode = params.get('orderCode');
  const raw = params.get('result') as PaymentResult | null;
  const result: PaymentResult = raw && RESULTS.includes(raw) ? raw : 'invalid';

  const viewOrder = orderCode && (
    <Link key="order" to={`/account/orders/${orderCode}`}>
      <Button type={result === 'failed' ? 'default' : 'primary'} size="large">
        {t('checkout.viewOrder', 'Xem đơn hàng')}
      </Button>
    </Link>
  );

  const retry = () =>
    startPayment.mutate(orderCode!, {
      onSuccess: (init) => {
        if (/^https?:\/\//.test(init.paymentUrl)) window.location.assign(init.paymentUrl);
        else navigate(init.paymentUrl);
      },
      onError: (err: any) => message.error(err?.message || t('common.errorOccurred', 'Có lỗi xảy ra, vui lòng thử lại')),
    });

  const content: Record<PaymentResult, React.ComponentProps<typeof Result>> = {
    success: {
      status: 'success',
      title: t('payment.successTitle', 'Thanh toán thành công'),
      subTitle: t('payment.successDesc', {
        code: orderCode,
        defaultValue: `Đơn ${orderCode} đã được thanh toán, cửa hàng sẽ xác nhận và chuẩn bị hàng.`,
      }),
      extra: [viewOrder],
    },
    failed: {
      status: 'error',
      title: t('payment.failedTitle', 'Thanh toán chưa thành công'),
      subTitle: t('payment.failedDesc', 'Bạn chưa bị trừ tiền. Có thể thử lại trong thời hạn thanh toán (15 phút từ lúc đặt).'),
      extra: [
        orderCode && (
          <Button key="retry" type="primary" size="large" loading={startPayment.isPending} onClick={retry}>
            {t('payment.retry', 'Thử thanh toán lại')}
          </Button>
        ),
        viewOrder,
      ],
    },
    refund: {
      status: 'warning',
      title: t('payment.refundTitle', 'Đơn đã bị hủy trước khi tiền về'),
      subTitle: t('payment.refundDesc', 'Cửa hàng đã ghi nhận số tiền bạn thanh toán và sẽ hoàn lại trong 3–7 ngày làm việc.'),
      extra: [viewOrder],
    },
    invalid: {
      status: 'warning',
      title: t('payment.invalidTitle', 'Không xác nhận được giao dịch'),
      subTitle: t('payment.invalidDesc', 'Thông tin trả về từ cổng thanh toán không hợp lệ. Vui lòng kiểm tra lại đơn hàng của bạn.'),
      extra: [
        <Link key="orders" to="/account/orders">
          <Button type="primary" size="large">
            {t('orders.backToList', 'Về danh sách đơn')}
          </Button>
        </Link>,
      ],
    },
  };

  return (
    <main className="container page">
      <Result {...content[result]} />
    </main>
  );
};
