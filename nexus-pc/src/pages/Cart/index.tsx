import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiShoppingBag, FiTrash2, FiPlus, FiMinus, FiArrowLeft } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';

export const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cart, summary, updateQuantity, removeFromCart } = useCart();

  return (
    <main className="container page">
      <Breadcrumb items={[t('cart.title', 'Giỏ hàng')]} />

      <div className="pagehead">
        <div>
          <h1>{t('cart.title', 'Giỏ hàng')}</h1>
          <p>{t('cart.subtitle', 'Kiểm tra lại sản phẩm trước khi thanh toán.')}</p>
        </div>
      </div>

      <div className="cartlayout">
        <div className="cartbox">
          {cart.length > 0 ? (
            <div className="cartitems">
              {cart.map((item) => (
                <div className="cartitem" key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <span>
                    <Link to={`/product/${item.id}`}>{item.name}</Link>
                    <b>{formatCurrency(item.price)}</b>
                    <div className="qty">
                      <button
                        onClick={() => updateQuantity(item.id, item.qty - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        type="button"
                      >
                        <FiMinus />
                      </button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.qty + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        type="button"
                      >
                        <FiPlus />
                      </button>
                    </div>
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                    type="button"
                  >
                    <FiTrash2 style={{ fontSize: 16 }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptycart">
              <FiShoppingBag style={{ fontSize: 44, color: 'var(--muted)', margin: '0 auto 12px' }} />
              <h2>{t('cart.emptyTitle', 'Giỏ hàng đang trống')}</h2>
              <p>{t('cart.emptyDesc', 'Khám phá linh kiện và thêm sản phẩm bạn yêu thích.')}</p>
              <Link to="/products">
                <Button type="primary" style={{ marginTop: 16 }}>
                  {t('common.continueShopping', 'Tiếp tục mua sắm')}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <aside className="summary">
          <h2>{t('cart.orderSummary', 'Tóm tắt đơn hàng')}</h2>
          <p>
            <span>{t('cart.subtotal', 'Tạm tính')}</span>
            <b>{formatCurrency(summary.subtotal)}</b>
          </p>
          <p>
            <span>{t('cart.shipping', 'Vận chuyển')}</span>
            <b className="stock">{t('cart.freeShipping', 'Miễn phí')}</b>
          </p>

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('cart.total', 'Tổng cộng')}:</span>
            <h2 className="orange" style={{ margin: '4px 0 0' }}>{formatCurrency(summary.total)}</h2>
          </div>

          <Button
            block
            type="primary"
            size="large"
            disabled={cart.length === 0}
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
