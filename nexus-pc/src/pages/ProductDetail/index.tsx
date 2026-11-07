import React, { useRef, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Alert, Badge, Button, InputNumber, Divider, Empty, Spin, Table, Tabs, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  StarFilled,
  CheckOutlined,
  TruckOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { FiHeart, FiShoppingCart, FiCpu } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { PriceHistoryChart } from '../../components/product/PriceHistoryChart';
import { ReviewSection } from '../../components/review/ReviewSection';
import { useProductDetail } from '../../hooks/useProductDetail';
import { usePriceHistory } from '../../hooks/useReviews';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useBuilder } from '../../context/BuilderContext';
import { ProductCompat } from '../../types/product';
import { calculateDiscountPercent, formatCurrency, getCategoryName } from '../../utils/format';

const MAX_QTY = 99;

type DetailTab = 'specs' | 'price-history' | 'reviews';
const DETAIL_TABS: DetailTab[] = ['specs', 'price-history', 'reviews'];
const LOW_STOCK = 5;

/** Thông số tương thích hiển thị dạng chip "đường khớp nối" */
const compatChips = (compat?: ProductCompat): Array<{ label: string; value: string }> => {
  if (!compat) return [];
  const chips: Array<{ label: string; value: string }> = [];
  if (compat.socket) chips.push({ label: 'Socket', value: compat.socket });
  if (compat.memoryType) chips.push({ label: 'RAM', value: compat.memoryType });
  if (compat.formFactor) chips.push({ label: 'Form factor', value: compat.formFactor });
  if (compat.tdp) chips.push({ label: 'TDP', value: `${compat.tdp}W` });
  if (compat.wattage) chips.push({ label: 'Công suất', value: `${compat.wattage}W` });
  if (compat.supportedSockets) chips.push({ label: 'Hỗ trợ socket', value: compat.supportedSockets.join(' · ') });
  if (compat.supportedFormFactors) chips.push({ label: 'Mainboard', value: compat.supportedFormFactors.join(' · ') });
  return chips;
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { rig, setPart } = useBuilder();
  const [quantity, setQuantity] = useState<number>(1);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Tab đang mở lấy từ #hash để link "/product/x#reviews" (vd từ thông báo) mở thẳng tab đánh giá
  const hashTab = location.hash.slice(1) as DetailTab;
  const activeTab: DetailTab = DETAIL_TABS.includes(hashTab) ? hashTab : 'specs';

  const openTab = (tab: DetailTab, scroll = false) => {
    navigate({ hash: tab === 'specs' ? '' : tab }, { replace: true });
    if (scroll) tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { data: product, isLoading } = useProductDetail(id);
  const { data: priceHistory = [] } = usePriceHistory(id);

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
  const outOfStock = product.stock <= 0;
  const discount = calculateDiscountPercent(product.price, product.oldPrice);
  const chips = compatChips(product.compat);
  const inBuilder = rig[product.category]?.id === product.id;

  const specRows = [
    { key: 'sku', label: t('productDetail.sku', 'Mã sản phẩm'), value: product.id.toUpperCase(), mono: true },
    { key: 'brand', label: t('compare.brand', 'Thương hiệu'), value: product.brand },
    { key: 'category', label: t('compare.category', 'Danh mục'), value: getCategoryName(product.category) },
    ...chips.map((c) => ({ key: `compat-${c.label}`, label: c.label, value: c.value, mono: true })),
    ...product.specs.map((spec, i) => ({
      key: `spec-${spec}`,
      label: i === 0 ? t('productDetail.features', 'Đặc điểm') : '',
      value: spec,
    })),
    ...(product.warrantyMonths
      ? [{ key: 'warranty', label: t('productDetail.warranty', 'Bảo hành'), value: `${product.warrantyMonths} tháng` }]
      : []),
  ];

  const handleAddToBuilder = () => {
    setPart(product.category, product);
    message.success(t('productDetail.addedToBuilder', 'Đã thêm vào PC Builder'));
    navigate('/builder');
  };

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
          {discount > 0 && (
            <Tag bordered={false} className="badge sale detail-badge">
              -{discount}%
            </Tag>
          )}
          <img src={product.image} alt={product.name} />
        </div>

        <div>
          <small>
            {getCategoryName(product.category)} / {product.brand}
          </small>
          <h1>{product.name}</h1>

          <div className="rating">
            <StarFilled /> {product.rating}
            <Button type="link" size="small" className="linkish" onClick={() => openTab('reviews', true)}>
              ({t('common.reviews', { count: product.reviews, defaultValue: `${product.reviews} đánh giá` })})
            </Button>

            <Badge
              className="stock-badge"
              status={outOfStock ? 'error' : product.stock <= LOW_STOCK ? 'warning' : 'success'}
              text={
                outOfStock
                  ? t('common.outOfStock', 'Hết hàng')
                  : product.stock <= LOW_STOCK
                    ? t('productDetail.lowStock', { count: product.stock, defaultValue: `Chỉ còn ${product.stock} sản phẩm` })
                    : t('productDetail.inStockStatus', 'Còn hàng trong kho')
              }
            />
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

          {chips.length > 0 && (
            <>
              <h3>{t('productDetail.compatSpecs', 'Thông số tương thích')}</h3>
              <div className="compat-chips">
                {chips.map((c) => (
                  <span key={c.label}>
                    <small>{c.label}</small>
                    <b>{c.value}</b>
                  </span>
                ))}
              </div>
            </>
          )}

          <h3>{t('productDetail.keySpecs', 'Thông số nổi bật')}</h3>
          <div className="spec-list">
            {product.specs.map((s) => (
              <span key={s}>
                <CheckOutlined /> {s}
              </span>
            ))}
          </div>

          {outOfStock && (
            <Alert
              type="error"
              className="oos-note"
              title={t('productDetail.outOfStockNote', 'Sản phẩm tạm hết hàng. Bạn có thể lưu vào yêu thích để theo dõi.')}
            />
          )}

          <div className="buyrow">
            <InputNumber
              min={1}
              max={Math.min(MAX_QTY, Math.max(1, product.stock))}
              value={quantity}
              disabled={outOfStock}
              onChange={(val) => setQuantity(val || 1)}
              aria-label="Quantity"
            />
            <Button
              type="primary"
              size="large"
              disabled={outOfStock}
              onClick={() => addToCart(product, quantity)}
              icon={<FiShoppingCart style={{ fontSize: 16 }} />}
            >
              {outOfStock ? t('common.outOfStock', 'Hết hàng') : t('common.addToCart', 'Thêm vào giỏ')}
            </Button>
            <Button
              size="large"
              onClick={() => toggleFavorite(product.id)}
              icon={isLiked ? <FaHeart style={{ color: 'var(--sale)' }} /> : <FiHeart />}
              aria-label="Wishlist toggle"
            />
          </div>

          <Button block size="large" icon={<FiCpu />} onClick={handleAddToBuilder} style={{ marginTop: 10 }}>
            {inBuilder
              ? t('productDetail.inBuilder', 'Đang có trong PC Builder, mở Builder')
              : t('productDetail.addToBuilder', 'Thêm vào PC Builder')}
          </Button>

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

      <div className="detail-tabs-wrap" ref={tabsRef}>
        <Tabs
          className="detail-tabs"
          activeKey={activeTab}
          onChange={(key) => openTab(key as DetailTab)}
          items={[
            {
              key: 'specs',
              label: t('productDetail.specsTab', 'Thông số kỹ thuật'),
              children: (
                <Table<{ key: string; label: string; value: React.ReactNode; mono?: boolean }>
                  className="spec-table"
                  showHeader={false}
                  pagination={false}
                  dataSource={specRows}
                  columns={[
                    { dataIndex: 'label', className: 'spec-label', width: 220 },
                    {
                      dataIndex: 'value',
                      render: (v: React.ReactNode, row) => (row.mono ? <span className="mono">{v}</span> : v),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'price-history',
              label: t('productDetail.priceHistoryTab', 'Lịch sử giá'),
              children: <PriceHistoryChart history={priceHistory} currentPrice={product.price} />,
            },
            {
              key: 'reviews',
              label: `${t('productDetail.reviewsTab', 'Đánh giá')} (${product.reviews})`,
              children: <ReviewSection product={product} />,
            },
          ]}
        />
      </div>
    </main>
  );
};
