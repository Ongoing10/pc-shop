import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { TbArrowsDiff } from 'react-icons/tb';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useProducts } from '../../hooks/useProducts';
import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { formatCurrency, getCategoryName } from '../../utils/format';

export const ComparePage: React.FC = () => {
  const { t } = useTranslation();
  const { compareIds, toggleCompare } = useCompare();
  const { addToCart } = useCart();

  const { data: allProducts = [] } = useProducts();

  const chosenProducts = allProducts.filter((p) => compareIds.includes(p.id));

  return (
    <main className="container page">
      <Breadcrumb items={[t('compare.title', 'So sánh sản phẩm')]} />

      <div className="pagehead">
        <div>
          <h1>{t('compare.title', 'So sánh sản phẩm')}</h1>
          <p>{t('compare.subtitle', 'Đặt các lựa chọn cạnh nhau để tìm linh kiện phù hợp nhất.')}</p>
        </div>
      </div>

      {chosenProducts.length < 2 ? (
        <div className="emptybox">
          <TbArrowsDiff style={{ fontSize: 44, color: 'var(--accent)', margin: '0 auto 16px', display: 'block' }} />
          <h3>{t('compare.minItemsHint', 'Chọn ít nhất 2 sản phẩm để so sánh thông số')}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 20px' }}>
            Vào trang sản phẩm và tích chọn checkbox "So sánh" trên các linh kiện bạn quan tâm.
          </p>
          <Link to="/products">
            <Button type="primary" size="large">
              {t('compare.exploreProducts', 'Khám phá sản phẩm')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="comparetable">
          {/* Header Row: Images & Names */}
          <div className="compare-row">
            <b>{t('compare.info', 'Thông tin')}</b>
            {chosenProducts.map((p) => (
              <span key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <img src={p.image} alt={p.name} style={{ borderRadius: 6 }} />
                <Link to={`/product/${p.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {p.name}
                </Link>
                <button
                  onClick={() => toggleCompare(p.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                    padding: 0,
                  }}
                  type="button"
                >
                  {t('common.remove', 'Xóa')}
                </button>
              </span>
            ))}
          </div>

          {/* Price */}
          <div className="compare-row">
            <b>{t('compare.price', 'Giá')}</b>
            {chosenProducts.map((p) => (
              <span key={p.id} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
                {formatCurrency(p.price)}
              </span>
            ))}
          </div>

          {/* Brand */}
          <div className="compare-row">
            <b>{t('compare.brand', 'Thương hiệu')}</b>
            {chosenProducts.map((p) => (
              <span key={p.id}>{p.brand}</span>
            ))}
          </div>

          {/* Category */}
          <div className="compare-row">
            <b>{t('compare.category', 'Danh mục')}</b>
            {chosenProducts.map((p) => (
              <span key={p.id}>{getCategoryName(p.category)}</span>
            ))}
          </div>

          {/* Specs */}
          <div className="compare-row">
            <b>{t('compare.specs', 'Thông số')}</b>
            {chosenProducts.map((p) => (
              <span key={p.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.specs.map((s, idx) => (
                  <span key={idx} style={{ background: 'var(--panel-2)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>
                    {s}
                  </span>
                ))}
              </span>
            ))}
          </div>

          {/* Action */}
          <div className="compare-row">
            <b>{t('compare.action', 'Thao tác')}</b>
            {chosenProducts.map((p) => (
              <span key={p.id}>
                <Button type="primary" size="small" onClick={() => addToCart(p, 1)}>
                  {t('common.addToCart', 'Thêm vào giỏ')}
                </Button>
              </span>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};
