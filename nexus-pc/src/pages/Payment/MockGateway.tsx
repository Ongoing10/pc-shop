import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Descriptions, Flex, Result, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCompletePayment, usePayment } from '../../hooks/useOrders';
import { formatCurrency } from '../../utils/format';
import { PAYMENT_METHOD_META, formatDateTime } from '../../utils/orderStatus';

/**
 * Cổng thanh toán giả lập. Bản thật trang này do ordering-service phục vụ (GET /api/v1/payments/mock/{paymentCode},
 * chỉ khi pcshop.payment.mock-enabled) hoặc là trang VNPay; xong thì backend chuyển về /orders/payment-result.
 */
export const MockGatewayPage: React.FC = () => {
  const { paymentCode } = useParams<{ paymentCode: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading } = usePayment(paymentCode);
  const complete = useCompletePayment();

  const finish = (success: boolean) =>
    complete.mutate(
      { paymentCode: paymentCode!, success },
      {
        onSuccess: ({ orderCode, result }) => {
          const params = new URLSearchParams({ result });
          if (orderCode) params.set('orderCode', orderCode);
          navigate(`/orders/payment-result?${params}`, { replace: true });
        },
      }
    );

  if (isLoading) {
    return (
      <main className="container page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container page">
        <Result status="404" title={t('payment.notFound', 'Không tìm thấy giao dịch')} subTitle={paymentCode} />
      </main>
    );
  }

  const { order, payment } = data;
  return (
    <main className="container page" style={{ maxWidth: 560 }}>
      <Card title={t('payment.mockTitle', 'Cổng thanh toán giả lập')}>
        <Alert
          type="warning"
          showIcon
          title={t('payment.mockWarning', 'Chỉ dùng khi phát triển (chưa cấu hình VNPay / MoMo). Không có tiền thật nào được trừ.')}
          style={{ marginBottom: 16 }}
        />
        <Descriptions
          column={1}
          size="small"
          items={[
            { key: 'code', label: t('orders.paymentCode', 'Mã giao dịch'), children: <code>{payment.paymentCode}</code> },
            { key: 'order', label: t('orders.order', 'Đơn hàng'), children: order.id },
            {
              key: 'method',
              label: t('orders.payment', 'Thanh toán'),
              children: t(PAYMENT_METHOD_META[payment.method].labelKey, PAYMENT_METHOD_META[payment.method].label),
            },
            { key: 'amount', label: t('orders.paymentAmount', 'Số tiền'), children: <b>{formatCurrency(payment.amount)}</b> },
            ...(payment.expiredAt
              ? [{ key: 'exp', label: t('payment.expiresAt', 'Hết hạn lúc'), children: formatDateTime(payment.expiredAt) }]
              : []),
          ]}
        />
        <Flex gap={12} style={{ marginTop: 20 }}>
          <Button type="primary" size="large" loading={complete.isPending} onClick={() => finish(true)}>
            {t('payment.mockSuccess', 'Thanh toán thành công')}
          </Button>
          <Button size="large" danger disabled={complete.isPending} onClick={() => finish(false)}>
            {t('payment.mockFailed', 'Thanh toán thất bại')}
          </Button>
        </Flex>
      </Card>
    </main>
  );
};
