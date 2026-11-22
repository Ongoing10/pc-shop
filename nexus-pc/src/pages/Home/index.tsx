import React from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { BsArrowRight, BsCheck2, BsCreditCard, BsHeadset, BsShieldCheck, BsTruck } from 'react-icons/bs';
import { ProductCard } from '../../components/common/ProductCard';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { ProductGridSkeleton } from '../../components/common/CustomSkeleton';
import { useCategories } from '../../hooks/useCategories';
import { useFeaturedProducts, useDealProducts } from '../../hooks/useProducts';
import Hero from '../../components/Hero/Hero';
import builderImage from '../../assets/images/builder_showcase_1793798677194.jpg';

const BUDGETS = [
  { max: 3000000, label: 'Dưới 3 triệu', hint: 'RAM, SSD, tản nhiệt' },
  { max: 10000000, label: 'Dưới 10 triệu', hint: 'CPU, mainboard, nguồn' },
  { max: 20000000, label: 'Dưới 20 triệu', hint: 'VGA tầm trung' },
  { max: 0, label: 'Trên 20 triệu', hint: 'VGA & CPU cao cấp', sort: 'price-desc' },
];

const BUILDER_STEPS = ['CPU', 'Mainboard', 'RAM', 'VGA', 'SSD', 'Nguồn', 'Vỏ case', 'Tản nhiệt'];

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: featuredProducts = [], isLoading: loadingFeatured } = useFeaturedProducts(4);
  const { data: dealProducts = [], isLoading: loadingDeals } = useDealProducts(4);

  return (
    <main>
      <Hero />

      <div className="container assurances">
        <div>
          <BsTruck />
          <span>
            <b>{t('benefits.nationwideDelivery', 'Giao hàng toàn quốc')}</b>
            <small>{t('benefits.safePackaging', 'Đóng gói chống sốc')}</small>
          </span>
        </div>
        <div>
          <BsShieldCheck />
          <span>
            <b>{t('benefits.genuine100', 'Chính hãng 100%')}</b>
            <small>{t('benefits.transparentWarranty', 'Bảo hành theo chính sách hãng')}</small>
          </span>
        </div>
        <div>
          <BsHeadset />
          <span>
            <b>{t('benefits.expertConsultation', 'Tư vấn chuyên sâu')}</b>
            <small>{t('benefits.rightBuild', 'Tư vấn cấu hình miễn phí')}</small>
          </span>
        </div>
        <div>
          <BsCreditCard />
          <span>
            <b>{t('benefits.flexiblePayment', 'Thanh toán linh hoạt')}</b>
            <small>{t('benefits.multiMethods', 'COD, chuyển khoản, trả góp')}</small>
          </span>
        </div>
      </div>

      <section className="container section">
        <div className="section-title">
          <h2>{t('sections.exploreComponents', 'Danh mục linh kiện')}</h2>
          <Link to="/products" className="textlink">
            {t('common.viewAll', 'Xem tất cả')} <BsArrowRight />
          </Link>
        </div>

        {loadingCats ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`} className="cat-tile">
                <CategoryIcon id={c.id} />
                <b>{c.name}</b>
                <small>{c.description}</small>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container section">
          <div className="section-title">
            <h2>{t('sections.staffPicks', 'Sản phẩm nổi bật')}</h2>
            <Link to="/products" className="textlink">
              {t('common.viewAll', 'Xem tất cả')} <BsArrowRight />
            </Link>
          </div>

        {loadingFeatured ? (
          <ProductGridSkeleton count={4} columns={4} />
        ) : (
          <div className="products">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="container section">
          <div className="section-title">
            <h2>{t('sections.budgetTitle', 'Mua theo ngân sách')}</h2>
          </div>
          <div className="budget">
            {BUDGETS.map((b) => (
              <Link
                key={b.label}
                to={b.max ? `/products?maxPrice=${b.max}&sort=price-desc` : `/products?sort=${b.sort}`}
              >
                <b>{b.label}</b>
                <small>{b.hint}</small>
              </Link>
            ))}
          </div>
      </section>

      <section className="container section">
          <div className="builder-promo">
            <div>
              <h2>{t('sections.promoBuilderTitle', 'Tự chọn từng linh kiện, thấy tổng tiền ngay')}</h2>
              <p>
                {t(
                  'sections.promoBuilderDesc',
                  'Đi qua 8 vị trí: CPU, mainboard, RAM, VGA, SSD, nguồn, vỏ case, tản nhiệt. Tổng tiền cập nhật sau mỗi lựa chọn, thêm cả cấu hình vào giỏ bằng một lần bấm.'
                )}
              </p>
              <ol aria-label="Các vị trí trong PC Builder">
                {BUILDER_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link to="/builder" className="btn btn-primary">
                {t('sections.promoBuilderCta', 'Mở PC Builder')} <BsArrowRight />
              </Link>
            </div>
            <img src={builderImage} alt="Bộ PC đang lắp ráp với card đồ họa và tản nhiệt" loading="lazy" />
          </div>
      </section>

      <section className="container section">
          <div className="section-title">
            <h2>{t('sections.dealsTitle', 'Đang giảm giá')}</h2>
            <Link to="/products?sort=discount" className="textlink">
              {t('common.viewAll', 'Xem tất cả')} <BsArrowRight />
            </Link>
          </div>

        {loadingDeals ? (
          <ProductGridSkeleton count={4} columns={4} />
        ) : (
          <div className="products">
            {dealProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="container section">
        <div className="trust">
          <h2>{t('sections.trustTitle', 'Mua linh kiện ở NEXUS PC')}</h2>
          <ul>
            <li>
              <BsCheck2 aria-hidden="true" />
              {t('sections.trustItem1', 'Tư vấn theo nhu cầu thực tế & ngân sách')}
            </li>
            <li>
              <BsCheck2 aria-hidden="true" />
              {t('sections.trustItem2', 'Kiểm tra kỹ lưỡng linh kiện trước khi giao')}
            </li>
            <li>
              <BsCheck2 aria-hidden="true" />
              {t('sections.trustItem3', 'Hỗ trợ cài đặt và kiểm tra lỗi sau khi mua')}
            </li>
            <li>
              <BsCheck2 aria-hidden="true" />
              {t('footer.phone', '1900 6868 (8:00 - 21:30)')}
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
};
