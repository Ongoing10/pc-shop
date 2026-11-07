import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Divider, Empty, Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiShoppingBag, FiTrash2, FiArrowLeft, FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CompatBadge } from '../../components/builder/CompatibilityPanel';
import { useCart } from '../../context/CartContext';
import { checkCompatibility } from '../../services/api/compatibilityService';
import { calculateShippingFee, FREE_SHIPPING_THRESHOLD } from '../../services/api/checkoutService';
import { formatCurrency } from '../../utils/format';

export const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cart, summary, updateQuantity, removeFromCart, clearCart } = useCart();

  const shippingFee = calculateShippingFee(summary.subtotal);
  const total = summary.subtotal + shippingFee;
  const blocked = cart.some((item) => item.stock <= 0 || item.qty > item.stock);

  // Giỏ có từ 2 linh kiện ráp máy thì kiểm tra luôn tương thích
  const compatibility = useMemo(
    () => checkCompatibility(cart.map((item) => ({ product: item, quantity: item.qty }))),
    [cart]
  );
  const showCompat = new Set(cart.map((i) => i.category)).size >= 2;

  return (
    <main className="container page">
      <Breadcrumb items={[t('cart.title', 'Giỏ hàng')]} />

      <div className="pagehead">
        <div>
          <h1>{t('cart.title', 'Giỏ hàng')}</h1>
          <p>{t('cart.subtitle', 'Kiểm tra lại sản phẩm trước khi thanh toán.')}</p>
        </div>
        {cart.length > 0 && (
          <Popconfirm
            title={t('cart.clearConfirm', 'Xóa toàn bộ sản phẩm trong giỏ?')}
            okText={t('common.remove', 'Xóa')}
            cancelText={t('common.cancel', 'Hủy')}
            okButtonProps={{ danger: true }}
            onConfirm={clearCart}
          >
            <Button icon={<FiTrash2 />}>{t('cart.clear', 'Xóa tất cả')}</Button>
          </Popconfirm>
        )}
      </div>

      <div className="cartlayout">
        <div className="cartbox">
          {cart.length > 0 ? (
            <div className="cartitems">
              {cart.map((item) => {
                const outOfStock = item.stock <= 0;
                const overStock = !outOfStock && item.qty > item.stock;
                return (
                  <div className={`cartitem ${outOfStock ? 'unavailable' : ''}`} key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <span>
                      <Link to={`/product/${item.id}`}>{item.name}</Link>
                      <b>{formatCurrency(item.price)}</b>
                      <QuantityStepper
                        value={item.qty}
                        max={item.stock}
                        itemName={item.name}
                        onChange={(q) => updateQuantity(item.id, q)}
                      />
                      {outOfStock && (
                        <small className="cart-warn error">
                          <FiXCircle aria-hidden="true" /> {t('cart.outOfStock', 'Đã hết hàng, vui lòng xóa khỏi giỏ để thanh toán.')}
                        </small>
                      )}
                      {overStock && (
                        <small className="cart-warn">
                          <FiAlertTriangle aria-hidden="true" />{' '}
                          {t('cart.overStock', { count: item.stock, defaultValue: `Chỉ còn ${item.stock} sản phẩm, vui lòng giảm số lượng.` })}
                        </small>
                      )}
                    </span>
                    <span className="cartitem-total num">{formatCurrency(item.price * item.qty)}</span>
                    <Button
                      type="text"
                      className="cartitem-remove"
                      icon={<FiTrash2 style={{ fontSize: 16 }} />}
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="emptycart">
              <Empty
                image={<FiShoppingBag style={{ fontSize: 44, color: 'var(--muted)' }} />}
                styles={{ image: { height: 'auto', marginBottom: 12 } }}
                description={
                  <>
                    <h2>{t('cart.emptyTitle', 'Giỏ hàng đang trống')}</h2>
                    <p>{t('cart.emptyDesc', 'Khám phá linh kiện và thêm sản phẩm bạn yêu thích.')}</p>
                  </>
                }
              >
                <Link to="/products">
                  <Button type="primary">{t('common.continueShopping', 'Tiếp tục mua sắm')}</Button>
                </Link>
              </Empty>
            </div>
          )}

          {cart.length > 0 && showCompat && (
            <div className="cart-compat">
              <header>
                <b>{t('cart.compatTitle', 'Tương thích của các linh kiện trong giỏ')}</b>
                <CompatBadge result={compatibility} />
              </header>
              {compatibility.issues.length > 0 && (
                <ul className="compat-issues">
                  {compatibility.issues.map((issue) => (
                    <li key={issue.ruleCode} className={issue.severity === 'ERROR' ? 'error' : 'warning'}>
                      {issue.severity === 'ERROR' ? <FiXCircle aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <aside className="summary">
          <h3>{t('cart.orderSummary', 'Tóm tắt đơn hàng')}</h3>
          <div className="summary-lines">
            <p>
              <span>{t('cart.subtotal', 'Tạm tính')}</span>
              <b>{formatCurrency(summary.subtotal)}</b>
            </p>
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

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('cart.total', 'Tổng cộng')}:</span>
            <h2 className="orange" style={{ margin: '4px 0 0' }}>{formatCurrency(total)}</h2>
            <small className="muted" style={{ marginTop: 4 }}>
              {t('cart.voucherHint', 'Nhập mã giảm giá ở bước thanh toán.')}
            </small>
          </div>

          <Button
            block
            type="primary"
            size="large"
            disabled={cart.length === 0 || blocked}
            onClick={() => navigate('/checkout')}
          >
            {t('cart.checkout', 'Tiến hành thanh toán')}
          </Button>

          <Link
            to="/products"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: 'var(--accent)',
              fontSize: 13,
              marginTop: 16,
            }}
          >
            <FiArrowLeft />
            <span>{t('common.continueShopping', 'Tiếp tục mua sắm')}</span>
          </Link>
        </aside>
      </div>
    </main>
  );
};
