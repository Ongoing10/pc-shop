import React from 'react';
import { Drawer, Button, Empty } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { QuantityStepper } from '../common/QuantityStepper';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';

export const CartDrawer: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeFromCart,
    summary,
  } = useCart();

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiShoppingBag style={{ color: 'var(--accent)', fontSize: 18 }} />
          <span>{t('cart.title', 'Giỏ hàng')}</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>({summary.totalItems})</span>
        </div>
      }
      open={isDrawerOpen}
      onClose={closeDrawer}
      styles={{ wrapper: { width: 460, maxWidth: '100vw' } }}
      footer={
        cart.length > 0 ? (
          <div className="drawer-foot">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('cart.total', 'Tổng cộng')}:</span>
              <b>{formatCurrency(summary.total)}</b>
            </div>
            <Button type="primary" block size="large" onClick={handleCheckout}>
              {t('common.proceedToCheckout', 'Tiến hành thanh toán')}
            </Button>
            <Link
              to="/cart"
              onClick={closeDrawer}
              style={{ textAlign: 'center', color: 'var(--accent)', fontSize: 13 }}
            >
              {t('common.viewCart', 'Xem giỏ hàng chi tiết')}
            </Link>
          </div>
        ) : null
      }
    >
      {cart.length > 0 ? (
        <div className="cartitems">
          {cart.map((item) => (
            <div className="cartitem" key={item.id}>
              <img src={item.image} alt={item.name} />
              <span>
                <Link to={`/product/${item.id}`} onClick={closeDrawer}>
                  {item.name}
                </Link>
                <b>{formatCurrency(item.price)}</b>
                <QuantityStepper
                  value={item.qty}
                  max={item.stock}
                  itemName={item.name}
                  onChange={(q) => updateQuantity(item.id, q)}
                />
              </span>
              <Button
                type="text"
                className="cartitem-remove"
                icon={<FiTrash2 style={{ fontSize: 16 }} />}
                onClick={() => removeFromCart(item.id)}
                aria-label={`Remove ${item.name} from cart`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="emptycart">
          <Empty
            image={<FiShoppingBag style={{ fontSize: 44, color: 'var(--muted)' }} />}
            styles={{ image: { height: 'auto', marginBottom: 12 } }}
            description={
              <>
                <h3>{t('cart.emptyTitle', 'Giỏ hàng đang trống')}</h3>
                <p>{t('cart.emptyDesc', 'Khám phá linh kiện và thêm sản phẩm bạn yêu thích.')}</p>
              </>
            }
          >
            <Button
              type="primary"
              onClick={() => {
                closeDrawer();
                navigate('/products');
              }}
            >
              {t('common.continueShopping', 'Tiếp tục mua sắm')}
            </Button>
          </Empty>
        </div>
      )}
    </Drawer>
  );
};
