import React from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { BsArrowRight } from 'react-icons/bs';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { useCategories } from '../../hooks/useCategories';

export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useCategories();

  return (
    <main className="container page">
      <Breadcrumb items={[t('nav.components', 'Linh kiện')]} />

      <div className="pagehead">
        <div>
          <h1>{t('sections.exploreComponents', 'Danh mục linh kiện')}</h1>
          <p>{t('categories.subtitle', 'Chọn một danh mục để lọc theo giá và thương hiệu.')}</p>
        </div>
        <Link to="/builder" className="btn btn-ghost">
          {t('sections.promoBuilderCta', 'Mở PC Builder')} <BsArrowRight />
        </Link>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '96px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.id}`} className="cat-tile">
              <CategoryIcon id={c.id} />
              <b>{c.name}</b>
              <small>
                {t('catalog.productCount', { count: c.count, defaultValue: `${c.count} sản phẩm` })} · {c.description}
              </small>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};
