import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { TbArrowsDiff } from 'react-icons/tb';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useProducts } from '../../hooks/useProducts';
import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { Product } from '../../types/product';
import { formatCurrency, getCategoryName } from '../../utils/format';

interface CompareRow {
  key: string;
  label: string;
  render: (p: Product) => React.ReactNode;
}

export const ComparePage: React.FC = () => {
  const { t } = useTranslation();
  const { compareIds, toggleCompare } = useCompare();
  const { addToCart } = useCart();

  const { data: allProducts = [] } = useProducts();

  const chosenProducts = allProducts.filter((p) => compareIds.includes(p.id));

  // Mỗi hàng là một thuộc tính, mỗi cột là một sản phẩm
  const rows: CompareRow[] = [
    {
      key: 'info',
      label: t('compare.info', 'Thông tin'),
      render: (p) => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <img src={p.image} alt={p.name} className="compare-img" />
          <Link to={`/product/${p.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
            {p.name}
          </Link>
          <Button type="link" danger size="small" onClick={() => toggleCompare(p.id)} style={{ padding: 0, alignSelf: 'flex-start' }}>
            {t('common.remove', 'Xóa')}
          </Button>
        </span>
      ),
    },
    {
      key: 'price',
      label: t('compare.price', 'Giá'),
      render: (p) => <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.price)}</span>,
    },
    { key: 'brand', label: t('compare.brand', 'Thương hiệu'), render: (p) => p.brand },
    { key: 'category', label: t('compare.category', 'Danh mục'), render: (p) => getCategoryName(p.category) },
    {
      key: 'specs',
      label: t('compare.specs', 'Thông số'),
      render: (p) => (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {p.specs.map((spec) => (
            <Tag key={spec} bordered={false} style={{ marginInlineEnd: 0, fontSize: 13 }}>
              {spec}
            </Tag>
          ))}
        </span>
      ),
    },
    {
      key: 'action',
      label: t('compare.action', 'Thao tác'),
      render: (p) => (
        <Button type="primary" size="small" onClick={() => addToCart(p, 1)}>
          {t('common.addToCart', 'Thêm vào giỏ')}
        </Button>
      ),
    },
  ];

  const columns: ColumnsType<CompareRow> = [
    { key: 'label', dataIndex: 'label', width: 150, fixed: 'left', className: 'compare-label' },
    // Cột sản phẩm không đặt width: chia đều phần còn lại như lưới cũ (150px + n × 1fr)
    ...chosenProducts.map((p) => ({
      key: p.id,
      render: (_: unknown, row: CompareRow) => row.render(p),
    })),
  ];

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
          <Empty
            image={<TbArrowsDiff style={{ fontSize: 44, color: 'var(--accent)' }} />}
            styles={{ image: { height: 'auto', marginBottom: 16 } }}
            description={
              <>
                <h3>{t('compare.minItemsHint', 'Chọn ít nhất 2 sản phẩm để so sánh thông số')}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 20px' }}>
                  Vào trang sản phẩm và tích chọn checkbox "So sánh" trên các linh kiện bạn quan tâm.
                </p>
              </>
            }
          >
            <Link to="/products">
              <Button type="primary" size="large">
                {t('compare.exploreProducts', 'Khám phá sản phẩm')}
              </Button>
            </Link>
          </Empty>
        </div>
      ) : (
        <Table<CompareRow>
          className="comparetable"
          bordered
          tableLayout="fixed"
          showHeader={false}
          pagination={false}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 150 + chosenProducts.length * 180 }}
        />
      )}
    </main>
  );
};
