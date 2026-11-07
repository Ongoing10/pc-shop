import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty, Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { ProductCard } from '../../components/common/ProductCard';
import { ProductGridSkeleton } from '../../components/common/CustomSkeleton';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProducts';

export const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  const { favorites, clearFavorites } = useFavorites();
  const { addItemsToCart } = useCart();
  const { data: products = [], isLoading } = useProducts();

  // Giữ thứ tự mới thích lên trước
  const items = [...favorites]
    .reverse()
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const inStock = items.filter((p) => p.stock > 0);

  return (
    <main className="container page">
      <Breadcrumb items={[t('favorites.title', 'Sản phẩm yêu thích')]} />

      <div className="pagehead">
        <div>
          <h1>{t('favorites.title', 'Sản phẩm yêu thích')}</h1>
          <p>
            {t('favorites.subtitle', 'Lưu trên trình duyệt này, không cần đăng nhập.')}
          </p>
        </div>
        {items.length > 0 && (
          <div className="pagehead-actions">
            <Popconfirm
              title={t('favorites.clearConfirm', 'Bỏ toàn bộ sản phẩm yêu thích?')}
              okText={t('common.remove', 'Xóa')}
              cancelText={t('common.cancel', 'Hủy')}
              okButtonProps={{ danger: true }}
              onConfirm={clearFavorites}
            >
              <Button>{t('favorites.clear', 'Xóa tất cả')}</Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<FiShoppingCart />}
              disabled={inStock.length === 0}
              onClick={() => addItemsToCart(inStock.map((p) => ({ product: p, quantity: 1 })))}
            >
              {t('favorites.addAllToCart', 'Thêm tất cả vào giỏ')}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <ProductGridSkeleton count={4} columns={4} />
      ) : items.length === 0 ? (
        <div className="emptybox">
          <Empty
            image={<FiHeart style={{ fontSize: 40, color: 'var(--muted)' }} aria-hidden="true" />}
            styles={{ image: { height: 'auto', marginBottom: 12 } }}
            description={t('favorites.empty', 'Bấm biểu tượng trái tim trên sản phẩm để lưu vào đây.')}
          >
            <Link to="/products">
              <Button type="primary">{t('common.continueShopping', 'Tiếp tục mua sắm')}</Button>
            </Link>
          </Empty>
        </div>
      ) : (
        <div className="products">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
};
