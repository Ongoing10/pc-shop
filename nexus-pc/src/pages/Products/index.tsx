import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Input,
  Select,
  Slider,
  Checkbox,
  Divider,
  Drawer,
  Empty,
  Button,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Reveal } from '../../components/common/Reveal';
import { ProductCard } from '../../components/common/ProductCard';
import { ProductGridSkeleton } from '../../components/common/CustomSkeleton';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useDebounce } from '../../hooks/useDebounce';
import { SortOption } from '../../types/product';
import { formatCurrency, getCategoryName } from '../../utils/format';

// Trần của thanh trượt giá = "không giới hạn", để hàng đắt hơn không bị ẩn âm thầm
const PRICE_CEILING = 50000000;

const AVAILABLE_BRANDS = [
  'ASUS',
  'MSI',
  'AMD',
  'Kingston',
  'Samsung',
  'Corsair',
  'NZXT',
  'DeepCool',
  'Thermalright',
];

export const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlCategory = searchParams.get('category') || 'all';
  const urlSearch = searchParams.get('search') || '';
  const urlSort = (searchParams.get('sort') as SortOption) || 'featured';
  const urlMaxPrice = Number(searchParams.get('maxPrice')) || PRICE_CEILING;

  const [category, setCategory] = useState<string>(urlCategory);
  const [searchInput, setSearchInput] = useState<string>(urlSearch);
  const [sort, setSort] = useState<SortOption>(urlSort);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(urlMaxPrice);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 250);

  // Sync state when URL params change
  useEffect(() => {
    setCategory(searchParams.get('category') || 'all');
    setSearchInput(searchParams.get('search') || '');
    setSort((searchParams.get('sort') as SortOption) || 'featured');
    setMaxPrice(Number(searchParams.get('maxPrice')) || PRICE_CEILING);
  }, [searchParams]);

  const { data: categories = [] } = useCategories();

  const { data: products = [], isLoading } = useProducts({
    category,
    search: debouncedSearch,
    sort,
    brands: selectedBrands,
    maxPrice: maxPrice >= PRICE_CEILING ? undefined : maxPrice,
  });

  const activeFilterCount =
    (category !== 'all' ? 1 : 0) + selectedBrands.length + (maxPrice < PRICE_CEILING ? 1 : 0);

  const handleClearFilters = () => {
    setCategory('all');
    setSearchInput('');
    setSelectedBrands([]);
    setMaxPrice(PRICE_CEILING);
    setSort('featured');
    setSearchParams({});
  };

  const handleCategorySelect = (catId: string) => {
    const newCat = category === catId ? 'all' : catId;
    setCategory(newCat);
    const newParams = new URLSearchParams(searchParams);
    if (newCat === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', newCat);
    }
    setSearchParams(newParams);
  };

  const filterPanel = (
    <aside className="filters">
      <b>
        <FilterOutlined /> {t('catalog.filters', 'Bộ lọc')}
        <button onClick={handleClearFilters} type="button">
          {t('catalog.clearFilters', 'Xóa lọc')}
        </button>
      </b>

      <Divider />

      <h2>{t('catalog.categories', 'Danh mục')}</h2>
      <button
        className={category === 'all' ? 'sel' : ''}
        onClick={() => handleCategorySelect('all')}
        type="button"
      >
        {t('common.allProducts', 'Tất cả sản phẩm')}
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          className={category === c.id ? 'sel' : ''}
          onClick={() => handleCategorySelect(c.id)}
          type="button"
        >
          <span>{c.name}</span>
          <span>{c.count}</span>
        </button>
      ))}

      <Divider />

      <h2>{t('catalog.maxPrice', 'Giá tối đa')}</h2>
      <Slider
        min={1000000}
        max={PRICE_CEILING}
        step={500000}
        value={maxPrice}
        onChange={(val) => setMaxPrice(val as number)}
      />
      <small>
        {maxPrice >= PRICE_CEILING
          ? t('catalog.noPriceLimit', 'Không giới hạn')
          : `≤ ${formatCurrency(maxPrice)}`}
      </small>

      <Divider />

      <h2>{t('catalog.brands', 'Thương hiệu')}</h2>
      <Checkbox.Group
        value={selectedBrands}
        onChange={(checked) => setSelectedBrands(checked as string[])}
        options={AVAILABLE_BRANDS.map((b) => ({ label: b, value: b }))}
      />
    </aside>
  );

  return (
    <main className="container page">
      <Breadcrumb items={[t('nav.products', 'Sản phẩm')]} />

      <div className="pagehead">
        <div>
          <h1>
            {category === 'all'
              ? t('common.allProducts', 'Tất cả sản phẩm')
              : getCategoryName(category, categories)}
          </h1>
          <p>{t('sections.exploreComponentsDesc', 'Tìm đúng linh kiện. Hoàn thiện cấu hình theo cách của bạn.')}</p>
        </div>
        <span>{t('catalog.productCount', { count: products.length, defaultValue: `${products.length} sản phẩm` })}</span>
      </div>

      <div className="catalog">
        {filterPanel}

        {/* Products Grid & Toolbar */}
        <div>
          <div className="toolbar">
            <Button className="filter-toggle" icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)}>
              {t('catalog.filters', 'Bộ lọc')}
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('common.searchPlaceholder', 'Tìm sản phẩm...')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              allowClear
              aria-label="Filter products input"
            />
            <Select
              value={sort}
              onChange={(value) => setSort(value as SortOption)}
              options={[
                { value: 'featured', label: t('catalog.sortFeatured', 'Nổi bật nhất') },
                { value: 'price-asc', label: t('catalog.sortPriceAsc', 'Giá: Thấp đến cao') },
                { value: 'price-desc', label: t('catalog.sortPriceDesc', 'Giá: Cao đến thấp') },
                { value: 'discount', label: t('catalog.sortDiscount', 'Đang giảm giá') },
                { value: 'rating', label: t('catalog.sortRating', 'Đánh giá cao nhất') },
              ]}
              aria-label="Sort products selector"
            />
          </div>

          {isLoading ? (
            <ProductGridSkeleton count={6} columns={3} />
          ) : products.length > 0 ? (
            <div className="products three">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 40}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Empty description={t('catalog.noProductsFound', 'Không tìm thấy sản phẩm phù hợp')} />
          )}
        </div>
      </div>

      <Drawer
        title={t('catalog.filters', 'Bộ lọc')}
        placement="bottom"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        styles={{ wrapper: { height: '85vh' } }}
        footer={
          <Button type="primary" block size="large" onClick={() => setFiltersOpen(false)}>
            {t('catalog.showResults', { count: products.length, defaultValue: `Xem ${products.length} sản phẩm` })}
          </Button>
        }
      >
        {filterPanel}
      </Drawer>
    </main>
  );
};
