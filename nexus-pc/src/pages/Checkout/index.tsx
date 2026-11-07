import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Select, Radio, Button, Steps, Divider, Empty, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CheckCircleFilled } from '@ant-design/icons';
import { FiCheckCircle, FiShield, FiTruck } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useCart } from '../../context/CartContext';
import { useCreateOrder } from '../../hooks/useOrders';
import { PaymentMethod, ShippingAddress } from '../../types/order';
import { formatCurrency } from '../../utils/format';

export const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const { cart, summary, clearCart } = useCart();
  const [step, setStep] = useState<number>(0);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    email: '',
    city: 'Hà Nội',
    address: '',
    note: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  const createOrderMutation = useCreateOrder();

  const handleNextStep = () => {
    if (step === 0) {
      if (!address.fullName.trim() || !address.phone.trim() || !address.address.trim()) {
        message.warning('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Execute order creation via TanStack Query mutation
      createOrderMutation.mutate(
        {
          items: cart,
          shippingAddress: address,
          paymentMethod,
        },
        {
          onSuccess: (order) => {
            setCreatedOrderId(order.id);
            clearCart();
            message.success('Đặt hàng thành công!');
          },
          onError: () => {
            message.error('Không thể hoàn tất đơn hàng, vui lòng thử lại.');
          },
        }
      );
    }
  };

  if (createdOrderId) {
    return (
      <main className="container page">
        <div className="success">
          <CheckCircleFilled style={{ fontSize: 56, color: 'var(--ok)' }} />
          <h1>{t('common.orderSuccess', 'Đặt hàng thành công!')}</h1>
          <div style={{ margin: '14px 0', padding: '12px 20px', background: 'var(--accent-soft)', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Mã đơn hàng: </span>
            <b style={{ color: 'var(--accent)', fontSize: 16 }}>{createdOrderId}</b>
          </div>
          <p>{t('checkout.orderSuccessDesc', 'Cảm ơn bạn đã mua sắm tại NEXUS PC. Đơn hàng của bạn đã được ghi nhận trên hệ thống.')}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <Link to="/">
              <Button type="primary" size="large">
                {t('checkout.backToHome', 'Về trang chủ')}
              </Button>
            </Link>
            <Link to={`/track-order?code=${createdOrderId}`}>
              <Button size="large">
                {t('nav.trackOrder', 'Tra cứu đơn hàng')}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="container page">
        <Empty description={t('checkout.emptyCartCheckout', 'Bạn chưa có sản phẩm nào trong giỏ để thanh toán')}>
          <Link to="/products">
            <Button type="primary">{t('common.continueShopping', 'Mua sắm ngay')}</Button>
          </Link>
        </Empty>
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumb
        items={[
          { label: t('cart.title', 'Giỏ hàng'), link: '/cart' },
          t('checkout.title', 'Thanh toán'),
        ]}
      />

      <div className="pagehead">
        <div>
          <h1>{t('checkout.title', 'Thanh toán')}</h1>
          <p>{t('checkout.subtitle', 'Hoàn tất thông tin nhận hàng và phương thức thanh toán.')}</p>
        </div>
      </div>

      <Steps
        current={step}
        items={[
          { title: t('checkout.step1', 'Thông tin giao hàng') },
          { title: t('checkout.step2', 'Phương thức thanh toán') },
          { title: t('checkout.step3', 'Xác nhận đơn') },
        ]}
        style={{ marginBottom: 30 }}
      />

      <div className="checkout">
        <div className="checkoutform">
          <h3>
            {step === 0 && t('checkout.step1', 'Thông tin người nhận')}
            {step === 1 && t('checkout.step2', 'Phương thức thanh toán')}
            {step === 2 && t('checkout.step3', 'Xác nhận đơn hàng')}
          </h3>

          {step === 0 && (
            <div className="formgrid">
              <label>
                {t('checkout.fullName', 'Họ và tên')} *
                <Input
                  placeholder="Nguyễn Văn A"
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                />
              </label>

              <label>
                {t('checkout.phone', 'Số điện thoại')} *
                <Input
                  placeholder="09xx xxx xxx"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
              </label>

              <label>
                {t('checkout.email', 'Email')}
                <Input
                  placeholder="email@example.com"
                  type="email"
                  value={address.email}
                  onChange={(e) => setAddress({ ...address, email: e.target.value })}
                />
              </label>

              <label>
                {t('checkout.city', 'Tỉnh / Thành phố')} *
                <Select
                  value={address.city}
                  onChange={(city) => setAddress({ ...address, city })}
                  options={[
                    'Hà Nội',
                    'TP. Hồ Chí Minh',
                    'Đà Nẵng',
                    'Hải Phòng',
                    'Cần Thơ',
                    'Bình Dương',
                    'Đồng Nai',
                  ].map((c) => ({ label: c, value: c }))}
                />
              </label>

              <label className="wide">
                {t('checkout.address', 'Địa chỉ nhận hàng')} *
                <Input
                  placeholder="Số nhà, tên đường, phường/xã..."
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                />
              </label>

              <label className="wide">
                {t('checkout.note', 'Ghi chú đơn hàng')}
                <Input
                  placeholder="Ghi chú giao giờ hành chính, gọi trước khi giao..."
                  value={address.note}
                  onChange={(e) => setAddress({ ...address, note: e.target.value })}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="payments"
              style={{ display: 'grid', gap: 16 }}
            >
              <Radio value="cod">
                <span style={{ fontWeight: 600 }}>{t('checkout.cod', 'Thanh toán khi nhận hàng (COD)')}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Thanh toán bằng tiền mặt khi shipper giao hàng tận nơi.
                </div>
              </Radio>

              <Radio value="bank">
                <span style={{ fontWeight: 600 }}>{t('checkout.bank', 'Chuyển khoản qua ngân hàng (QR Code)')}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Mã QR chuyển khoản hiện ra sau khi bạn xác nhận đơn.
                </div>
              </Radio>

              <Radio value="card">
                <span style={{ fontWeight: 600 }}>{t('checkout.card', 'Thẻ ATM nội địa / Visa / Mastercard')}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Bạn sẽ được chuyển tới cổng thanh toán sau khi xác nhận đơn.
                </div>
              </Radio>
            </Radio.Group>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 8 }}>
                <b style={{ color: 'var(--accent)', display: 'block', marginBottom: 8 }}>Người nhận:</b>
                <p style={{ margin: '4px 0' }}>{address.fullName} - {address.phone}</p>
                <p style={{ margin: '4px 0', color: 'var(--text-2)' }}>{address.address}, {address.city}</p>
                {address.note && <p style={{ margin: '4px 0', color: 'var(--muted)' }}>Ghi chú: {address.note}</p>}
              </div>

              <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 8 }}>
                <b style={{ color: 'var(--accent)', display: 'block', marginBottom: 8 }}>Phương thức thanh toán:</b>
                <p style={{ margin: '4px 0' }}>
                  {paymentMethod === 'cod' && t('checkout.cod', 'Thanh toán khi nhận hàng (COD)')}
                  {paymentMethod === 'bank' && t('checkout.bank', 'Chuyển khoản qua ngân hàng (QR Code)')}
                  {paymentMethod === 'card' && t('checkout.card', 'Thẻ ATM nội địa / Visa / Mastercard')}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ok)', fontSize: 13 }}>
                <FiShield />
                <span>Nhân viên NEXUS PC sẽ gọi xác nhận đơn trước khi giao.</span>
              </div>
            </div>
          )}

          <div className="actions">
            {step > 0 && (
              <Button onClick={() => setStep(step - 1)}>
                {t('checkout.back', 'Quay lại')}
              </Button>
            )}
            <Button
              type="primary"
              size="large"
              loading={createOrderMutation.isPending}
              onClick={handleNextStep}
            >
              {step < 2 ? t('checkout.continue', 'Tiếp tục') : t('checkout.confirmOrder', 'Xác nhận đặt hàng')}
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="summary">
          <h3>
            {t('cart.orderSummary', 'Đơn hàng')} ({summary.totalItems})
          </h3>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
            {cart.map((item) => (
              <p key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '8px 0' }}>
                <span style={{ maxWidth: '65%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name} × {item.qty}
                </span>
                <b>{formatCurrency(item.price * item.qty)}</b>
              </p>
            ))}
          </div>

          <Divider />

          <p>
            <span>{t('cart.shipping', 'Vận chuyển')}</span>
            <b className="stock">{t('cart.freeShipping', 'Miễn phí')}</b>
          </p>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('cart.total', 'Tổng thanh toán')}:</span>
            <h3 className="orange" style={{ margin: '4px 0 0' }}>{formatCurrency(summary.total)}</h3>
          </div>
        </aside>
      </div>
    </main>
  );
};
