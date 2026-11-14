import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Input, Radio, Button, Result, Steps, Divider, Empty, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { FiShield, FiTag, FiX } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { AddressFormModal } from '../../components/address/AddressFormModal';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCreateOrder } from '../../hooks/useOrders';
import { useAddresses } from '../../hooks/useAddresses';
import { useCheckoutPreview, useValidateVoucher, useVouchers } from '../../hooks/useVouchers';
import { formatAddress } from '../../services/api/addressService';
import { calculateShippingFee, FREE_SHIPPING_THRESHOLD } from '../../services/api/checkoutService';
import { PaymentMethod, VoucherValidation } from '../../types/order';
import { formatCurrency } from '../../utils/format';
import { PAYMENT_METHOD_META, isOnlinePayment } from '../../utils/orderStatus';

export const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, summary } = useCart();
  const [step, setStep] = useState<number>(0);
  // Idempotency-Key của POST /orders: một khóa cho lần vào trang này, bấm lại / mạng chập chờn không tạo đơn thứ hai
  const [requestId] = useState(() => crypto.randomUUID());

  const { data: addresses = [], isLoading: loadingAddresses } = useAddresses(isAuthenticated);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(1);

  const { data: vouchers = [] } = useVouchers();
  const validateVoucher = useValidateVoucher();
  const [voucherInput, setVoucherInput] = useState('');
  const [voucher, setVoucher] = useState<VoucherValidation | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const createOrderMutation = useCreateOrder();

  // Chọn sẵn địa chỉ mặc định khi sổ địa chỉ tải xong
  useEffect(() => {
    if (!addressId && addresses.length > 0) {
      setAddressId((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
    }
  }, [addresses, addressId]);

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const appliedVoucherCode = voucher?.valid ? voucher.code : undefined;
  // Tiền chính thức do server tính từ giỏ (POST /checkout/preview); trong lúc chờ dùng ước tính tại chỗ
  const { data: preview } = useCheckoutPreview(
    { voucherCode: appliedVoucherCode, addressId: addressId ?? undefined },
    isAuthenticated && cart.length > 0
  );
  const estimatedDiscount = voucher?.valid ? voucher.discountAmount : 0;
  const discountAmount = preview?.discountAmount ?? estimatedDiscount;
  const shippingFee =
    preview?.shippingFee ??
    (voucher?.freeShipping
      ? 0
      : calculateShippingFee(Math.max(0, summary.subtotal - estimatedDiscount), selectedAddress?.provinceCode));
  const total = preview?.totalAmount ?? Math.max(0, summary.subtotal - discountAmount + shippingFee);
  const unavailable = cart.filter((item) => item.stock <= 0 || item.qty > item.stock);

  const applyVoucher = (code: string) => {
    if (!code.trim()) return;
    validateVoucher.mutate(
      { code, subtotal: summary.subtotal, categories: cart.map((item) => item.category) },
      {
        onSuccess: (result) => {
          if (result.valid) {
            setVoucher(result);
            setVoucherError(null);
            setVoucherInput('');
            message.success(t('checkout.voucherApplied', { code: result.code, defaultValue: `Đã áp mã ${result.code}` }));
          } else {
            setVoucherError(result.reason ?? t('checkout.voucherInvalid', 'Mã giảm giá không hợp lệ.'));
          }
        },
      }
    );
  };

  const handleNextStep = () => {
    if (step === 0) {
      if (!selectedAddress) {
        message.warning(t('checkout.selectAddressWarning', 'Vui lòng chọn hoặc thêm địa chỉ nhận hàng.'));
        return;
      }
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedAddress) {
      // POST /orders {addressId, voucherCode, paymentMethod, note, expectedTotal} + header Idempotency-Key.
      // Backend tính lại tiền từ giỏ; lệch expectedTotal → 409 (cập nhật lại tóm tắt), hết hàng → 409 OUT_OF_STOCK.
      createOrderMutation.mutate(
        {
          requestId,
          payload: {
            addressId: selectedAddress.id,
            paymentMethod,
            voucherCode: appliedVoucherCode,
            note: note.trim() || undefined,
            expectedTotal: total,
          },
        },
        {
          // Đơn trả về ở trạng thái 1 (đang giữ hàng): trang chi tiết theo dõi đến khi giữ hàng xong
          onSuccess: (order) => {
            // backend đã xóa giỏ khi đặt đơn (useCreateOrder làm mới cache giỏ)
            navigate(`/account/orders/${order.id}?placed=1`, { replace: true });
          },
          onError: (err: any) => {
            message.error(err?.message || t('checkout.placeFailed', 'Không thể hoàn tất đơn hàng, vui lòng thử lại.'));
          },
        }
      );
    }
  };

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

  if (!isAuthenticated) {
    return (
      <main className="container page">
        <Breadcrumb items={[{ label: t('cart.title', 'Giỏ hàng'), link: '/cart' }, t('checkout.title', 'Thanh toán')]} />
        <Result
          className="gate"
          icon={<UserOutlined />}
          title={t('checkout.loginRequired', 'Đăng nhập để thanh toán')}
          subTitle={t(
            'checkout.loginRequiredDesc',
            'Giỏ hàng của bạn được giữ nguyên. Sau khi đăng nhập, bạn chọn địa chỉ từ sổ địa chỉ và theo dõi đơn trong tài khoản.'
          )}
          extra={
            <>
              <Button type="primary" block size="large" onClick={() => navigate('/login?redirect=/checkout')}>
                {t('account.loginNow', 'Đăng nhập ngay')}
              </Button>
              <Link to="/login?tab=register&redirect=/checkout" className="gate-link">
                {t('auth.noAccount', 'Chưa có tài khoản?')} {t('auth.btnRegister', 'Đăng ký')}
              </Link>
            </>
          }
        />
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
            {step === 0 && t('checkout.shipTo', 'Giao đến')}
            {step === 1 && t('checkout.step2', 'Phương thức thanh toán')}
            {step === 2 && t('checkout.step3', 'Xác nhận đơn hàng')}
          </h3>

          {step === 0 && (
            <>
              {!loadingAddresses && addresses.length === 0 ? (
                <div className="emptybox" style={{ padding: 32 }}>
                  <Empty description={t('checkout.noAddress', 'Bạn chưa có địa chỉ nhận hàng')}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddressFormOpen(true)}>
                      {t('address.add', 'Thêm địa chỉ')}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <Radio.Group
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                  className="addr-pick"
                >
                  {addresses.map((a) => (
                    <Radio key={a.id} value={a.id}>
                      <span className="addr-pick-text">
                        <b>
                          {a.receiverName} · {a.receiverPhone}
                          {a.isDefault && <Tag color="orange" style={{ marginLeft: 8 }}>{t('address.default', 'Mặc định')}</Tag>}
                        </b>
                        <span>{formatAddress(a)}</span>
                      </span>
                    </Radio>
                  ))}
                </Radio.Group>
              )}

              {addresses.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddressFormOpen(true)}>
                    {t('address.addNew', 'Thêm địa chỉ mới')}
                  </Button>
                  <Link to="/account/addresses" style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
                    {t('checkout.manageAddresses', 'Quản lý sổ địa chỉ')}
                  </Link>
                </div>
              )}

              <label className="note-field">
                {t('checkout.note', 'Ghi chú đơn hàng (không bắt buộc)')}
                <Input.TextArea
                  rows={2}
                  maxLength={500}
                  placeholder="Ghi chú giao giờ hành chính, gọi trước khi giao..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </>
          )}

          {step === 1 && (
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="payments"
              style={{ display: 'grid', gap: 16 }}
            >
              <Radio value={1}>
                <span style={{ fontWeight: 600 }}>{t('checkout.cod', 'Thanh toán khi nhận hàng (COD)')}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {t('checkout.codDesc', 'Thanh toán bằng tiền mặt khi shipper giao hàng tận nơi.')}
                </div>
              </Radio>

              <Radio value={2}>
                <span style={{ fontWeight: 600 }}>{t('checkout.vnpay', 'Ví VNPay / thẻ ngân hàng')}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {t('checkout.vnpayDesc', 'Thanh toán online qua cổng VNPay: thẻ ATM, Visa/Mastercard, QR.')}
                </div>
              </Radio>

              <Radio value={3}>
                <span style={{ fontWeight: 600 }}>{t('checkout.momo', 'Ví MoMo')}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {t('checkout.momoDesc', 'Quét mã hoặc mở ứng dụng MoMo để thanh toán.')}
                </div>
              </Radio>
            </Radio.Group>
          )}

          {step === 2 && selectedAddress && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 8 }}>
                <b style={{ color: 'var(--accent)', display: 'block', marginBottom: 8 }}>Người nhận:</b>
                <p style={{ margin: '4px 0' }}>{selectedAddress.receiverName} - {selectedAddress.receiverPhone}</p>
                <p style={{ margin: '4px 0', color: 'var(--text-2)' }}>{formatAddress(selectedAddress)}</p>
                {note && <p style={{ margin: '4px 0', color: 'var(--muted)' }}>Ghi chú: {note}</p>}
              </div>

              <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 8 }}>
                <b style={{ color: 'var(--accent)', display: 'block', marginBottom: 8 }}>Phương thức thanh toán:</b>
                <p style={{ margin: '4px 0' }}>
                  {t(PAYMENT_METHOD_META[paymentMethod].labelKey, PAYMENT_METHOD_META[paymentMethod].label)}
                </p>
              </div>

              {unavailable.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  icon={<FiX />}
                  className="order-banner"
                  title={t('checkout.unavailableTitle', 'Một số sản phẩm không đủ hàng')}
                  description={unavailable.map((i) => i.name).join(', ')}
                />
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ok)', fontSize: 13 }}>
                <FiShield />
                <span>
                  {isOnlinePayment(paymentMethod)
                    ? t('checkout.holdOnlineHint', 'Hàng được giữ ngay khi đặt. Bạn có 15 phút để thanh toán, quá hạn đơn tự hủy.')
                    : t('checkout.holdCodHint', 'Hàng được giữ ngay khi đặt, đơn được xác nhận tự động và chuyển sang chuẩn bị giao.')}
                </span>
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
              disabled={step === 2 && unavailable.length > 0}
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
          <div className="summary-lines" style={{ marginTop: 8 }}>
            {cart.map((item) => (
              <p key={item.id}>
                <span style={{ maxWidth: '65%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name} × {item.qty}
                </span>
                <b>{formatCurrency(item.price * item.qty)}</b>
              </p>
            ))}
          </div>

          <Divider />

          <div className="voucher">
            {voucher?.valid ? (
              <div className="voucher-applied">
                <FiTag aria-hidden="true" />
                <span>
                  <b>{voucher.code}</b>
                  <small>{voucher.name}</small>
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<FiX />}
                  onClick={() => setVoucher(null)}
                  aria-label={t('checkout.removeVoucher', 'Bỏ mã giảm giá')}
                />
              </div>
            ) : (
              <>
                <div className="voucher-input">
                  <Input
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setVoucherError(null);
                    }}
                    onPressEnter={() => applyVoucher(voucherInput)}
                    placeholder={t('checkout.voucherPlaceholder', 'Mã giảm giá')}
                    status={voucherError ? 'error' : undefined}
                    aria-label={t('checkout.voucherPlaceholder', 'Mã giảm giá')}
                  />
                  <Button loading={validateVoucher.isPending} onClick={() => applyVoucher(voucherInput)}>
                    {t('checkout.apply', 'Áp dụng')}
                  </Button>
                </div>
                {voucherError && <small className="field-error">{voucherError}</small>}
                {vouchers.length > 0 && (
                  <div className="voucher-suggest">
                    {vouchers.map((v) => (
                      <button key={v.code} type="button" onClick={() => applyVoucher(v.code)} title={v.description}>
                        <b>{v.code}</b>
                        <small>{v.description}</small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <Divider />

          <div className="summary-lines">
            <p>
              <span>{t('cart.subtotal', 'Tạm tính')}</span>
              <b>{formatCurrency(summary.subtotal)}</b>
            </p>
            {discountAmount > 0 && (
              <p>
                <span>{t('checkout.discount', 'Giảm giá')}</span>
                <b className="discount">−{formatCurrency(discountAmount)}</b>
              </p>
            )}
            <p>
              <span>{t('cart.shipping', 'Vận chuyển')}</span>
              <b>{shippingFee > 0 ? formatCurrency(shippingFee) : t('checkout.free', 'Miễn phí')}</b>
            </p>
          </div>
          {shippingFee > 0 && (
            <small className="muted" style={{ marginTop: 0 }}>
              {t('checkout.freeShipHint', {
                amount: formatCurrency(FREE_SHIPPING_THRESHOLD),
                defaultValue: `Miễn phí vận chuyển cho đơn từ ${formatCurrency(FREE_SHIPPING_THRESHOLD)}.`,
              })}
            </small>
          )}

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('cart.total', 'Tổng thanh toán')}:</span>
            <h3 className="orange" style={{ margin: '4px 0 0' }}>{formatCurrency(total)}</h3>
          </div>
        </aside>
      </div>

      <AddressFormModal
        open={addressFormOpen}
        defaultReceiver={user ? { name: user.fullName, phone: user.phone } : undefined}
        onClose={() => setAddressFormOpen(false)}
        onSaved={(saved) => setAddressId(saved.id)}
      />
    </main>
  );
};
