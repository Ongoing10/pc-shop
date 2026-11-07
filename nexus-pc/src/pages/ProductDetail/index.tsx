import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, InputNumber, Divider, Empty, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  StarFilled,
  CheckOutlined,
  TruckOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useProductDetail } from '../../hooks/useProductDetail';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { formatCurrency, getCategoryName } from '../../utils/format';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [quantity, setQuantity] = useState<number>(1);

  const { data: product, isLoading } = useProductDetail(id);

  if (isLoading) {
    return (
      <main className="container page" style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container page">
        <Empty description={t('productDetail.notFound', 'Không tìm thấy sản phẩm')}>
          <Link to="/products">
            <Button type="primary">{t('common.continueShopping', 'Tiếp tục mua sắm')}</Button>
          </Link>
        </Empty>
      </main>
    );
  }

  const isLiked = isFavorite(product.id);

  return (
    <main className="container page">
      <Breadcrumb
        items={[
          { label: t('nav.products', 'Sản phẩm'), link: '/products' },
          { label: getCategoryName(product.category), link: `/products?category=${product.category}` },
          product.name,
        ]}
      />

      <div className="detail">
        <div className="detail-image">
          <img src={product.image} alt={product.name} />
        </div>

        <div>
          <small>
            {getCategoryName(product.category)} / {product.brand}
          </small>
          <h1>{product.name}</h1>

          <div className="rating">
            <StarFilled /> {product.rating}　
            <span>({t('common.reviews', { count: product.reviews, defaultValue: `${product.reviews} đánh giá` })})</span>
            　<span className="stock">● {t('productDetail.inStockStatus', 'Còn hàng')} ({product.stock})</span>
          </div>

          <p className="desc">
            {product.description ||
              'Linh kiện hiệu năng cao, tối ưu hóa cho hệ thống PC gaming và workstation hiện đại.'}
          </p>

          <h2>{formatCurrency(product.price)}</h2>
          {product.oldPrice && product.oldPrice > product.price && (
            <del>{formatCurrency(product.oldPrice)}</del>
          )}

          <Divider />

          <h3>{t('productDetail.keySpecs', 'Thông số nổi bật')}</h3>
          <div className="spec-list">
            {product.specs.map((s) => (
              <span key={s}>
                <CheckOutlined /> {s}
              </span>
            ))}
          </div>

          <div className="buyrow">
            <InputNumber
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(val) => setQuantity(val || 1)}
              aria-label="Quantity"
            />
            <Button
              type="primary"
              size="large"
              onClick={() => addToCart(product, quantity)}
              icon={<FiShoppingCart style={{ fontSize: 16 }} />}
            >
              {t('common.addToCart', 'Thêm vào giỏ')}
            </Button>
            <Button
              size="large"
              onClick={() => toggleFavorite(product.id)}
              icon={isLiked ? <FaHeart style={{ color: 'var(--sale)' }} /> : <FiHeart />}
              aria-label="Wishlist toggle"
            />
          </div>

          <p className="service">
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginRight: 20 }}>
              <SafetyCertificateOutlined /> {t('productDetail.genuineWarranty', 'Bảo hành chính hãng')}
              {product.warrantyMonths ? ` ${product.warrantyMonths} tháng` : ''}
            </span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <TruckOutlined /> {t('productDetail.nationwideShip', 'Giao hàng toàn quốc')}
            </span>
          </p>
        </div>
      </div>
    </main>
  );
};
