import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  App,
  Avatar,
  Button,
  Card,
  Dropdown,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { DownloadOutlined, EditOutlined, PlusOutlined, UploadOutlined, DownOutlined, DollarOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import { BulkErrorItem, collectBulkErrors } from '../../../components/admin/bulk';
import { fakeLatency, useAdminData } from '../../../context/AdminDataContext';
import { AdminProduct, ProductStatus } from '../../../types/admin';
import { PRODUCT_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';

const STATUSES = Object.keys(PRODUCT_STATUS_META).map(Number) as ProductStatus[];

interface BulkPriceForm {
  mode: 'percent' | 'amount';
  value: number;
  keepOriginal: boolean;
  reason?: string;
}

/** A02: danh sách sản phẩm (mọi trạng thái), chọn nhiều → đổi trạng thái / đổi giá */
export const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const {
    products: [products, setProducts],
    categories: [categories],
    brands: [brands],
  } = useAdminData();

  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>();
  const [status, setStatus] = useState<ProductStatus>();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [bulkErrors, setBulkErrors] = useState<BulkErrorItem[]>([]);
  const [priceOpen, setPriceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceForm] = Form.useForm<BulkPriceForm>();

  // TODO ghép API: GET /admin/products?status=&category=&q=&page=&size=
  const data = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return products
      .filter((p) => (!category || p.categoryCode === category) && (!status || p.status === status))
      .filter((p) => !keyword || p.name.toLowerCase().includes(keyword) || p.sku.toLowerCase().includes(keyword))
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [products, q, category, status]);

  const selected = products.filter((p) => selectedKeys.includes(p.sku));
  const errorIds = new Set(bulkErrors.map((e) => e.id));
  const categoryName = (code: string) => categories.find((c) => c.code === code)?.name ?? code;
  const brandName = (code: string | null) => (code ? brands.find((b) => b.code === code)?.name ?? code : '–');

  const applyBulkStatus = (next: ProductStatus) => {
    modal.confirm({
      title: `Chuyển ${selected.length} sản phẩm sang "${PRODUCT_STATUS_META[next].label}"?`,
      content:
        next === 3 || next === 4
          ? 'Sản phẩm sẽ biến mất khỏi trang khách và bị gỡ khỏi dữ liệu tư vấn AI.'
          : undefined,
      okText: 'Đồng ý',
      cancelText: 'Hủy',
      onOk: async () => {
        // TODO ghép API: PATCH /admin/products/bulk/status {skus, status}
        await fakeLatency();
        const errors = collectBulkErrors(
          selected,
          (p) => p.sku,
          (p) =>
            p.status === next
              ? 'Đã ở trạng thái này'
              : next === 1 && p.status !== 1
                ? 'Sản phẩm đã công bố không quay về Nháp được'
                : null
        );
        if (errors.length) {
          setBulkErrors(errors);
          return;
        }
        const skus = new Set(selected.map((p) => p.sku));
        const now = new Date().toISOString();
        setProducts((prev) => prev.map((p) => (skus.has(p.sku) ? { ...p, status: next, updatedAt: now } : p)));
        setBulkErrors([]);
        setSelectedKeys([]);
        message.success(`Đã cập nhật ${skus.size} sản phẩm`);
      },
    });
  };

  const applyBulkPrice = async () => {
    const values = await priceForm.validateFields();
    setSaving(true);
    // TODO ghép API: PATCH /admin/products/bulk/price {items: [{sku, price, originalPrice}], reason}
    await fakeLatency();
    const priced = selected.map((p) => {
      const raw = values.mode === 'percent' ? p.price * (1 - values.value / 100) : p.price - values.value;
      return { p, price: Math.round(raw / 1000) * 1000 };
    });
    const errors = collectBulkErrors(
      priced,
      ({ p }) => p.sku,
      ({ p, price }) => (price <= 0 ? 'Giá mới phải lớn hơn 0' : price === p.price ? 'Giá không đổi' : null)
    );
    setSaving(false);
    if (errors.length) {
      setBulkErrors(errors);
      setPriceOpen(false);
      return;
    }
    const map = new Map(priced.map(({ p, price }) => [p.sku, price]));
    const now = new Date().toISOString();
    setProducts((prev) =>
      prev.map((p) =>
        map.has(p.sku)
          ? {
              ...p,
              price: map.get(p.sku)!,
              originalPrice: values.keepOriginal ? p.originalPrice ?? p.price : null,
              updatedAt: now,
            }
          : p
      )
    );
    setBulkErrors([]);
    setSelectedKeys([]);
    setPriceOpen(false);
    message.success(`Đã đổi giá ${map.size} sản phẩm`);
  };

  const handleExport = () => {
    // TODO ghép API: GET /admin/products/export?category=&status= (category bắt buộc)
    message.info(`Sẽ xuất ${data.length} sản phẩm ${categoryName(category!)} ra Excel khi ghép API`);
  };

  const columns: TableColumnsType<AdminProduct> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      fixed: 'left',
      render: (name: string, p) => (
        <Flex gap={12} align="center">
          <Avatar shape="square" size={40} src={p.images?.[0]?.url} />
          <div>
            <Link to={`/admin/products/${p.sku}`} className="admin-cell-title">
              {name}
            </Link>
            <Typography.Text type="secondary" className="admin-mono" style={{ display: 'block' }}>
              {p.sku}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    { title: 'Danh mục', dataIndex: 'categoryCode', width: 130, render: (c: string) => categoryName(c) },
    { title: 'Thương hiệu', dataIndex: 'brandCode', width: 110, render: brandName },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.price - b.price,
      render: (v: number, p) => (
        <div>
          <b>{formatCurrency(v)}</b>
          {p.originalPrice && (
            <Typography.Text type="secondary" delete style={{ display: 'block', fontSize: 12 }}>
              {formatCurrency(p.originalPrice)}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (s: ProductStatus) => <Tag color={PRODUCT_STATUS_META[s].color}>{PRODUCT_STATUS_META[s].label}</Tag>,
    },
    { title: 'Đã bán', dataIndex: 'soldCount', width: 80, align: 'right', render: (v: number | null) => v ?? 0 },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      width: 150,
      render: (v: string | null) => (v ? formatDateTime(v) : '–'),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      fixed: 'right',
      render: (_, p) => (
        <Tooltip title="Sửa">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label="Sửa"
            onClick={() => navigate(`/admin/products/${p.sku}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Sản phẩm"
        subtitle="Thấy cả sản phẩm nháp, đã ẩn và ngừng bán"
        extra={
          <>
            <Tooltip title={category ? undefined : 'Chọn danh mục trước khi xuất (mỗi danh mục một bộ cột thông số)'}>
              <Button icon={<DownloadOutlined />} disabled={!category} onClick={handleExport}>
                Xuất Excel
              </Button>
            </Tooltip>
            <Button icon={<UploadOutlined />} onClick={() => navigate('/admin/products/import')}>
              Import Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/products/new')}>
              Thêm sản phẩm
            </Button>
          </>
        }
      />

      <Card>
        <Flex gap={12} wrap className="admin-filters">
          <Input.Search
            allowClear
            placeholder="Tên hoặc SKU"
            style={{ width: 280 }}
            onSearch={setQ}
            onChange={(e) => !e.target.value && setQ('')}
          />
          <Select
            allowClear
            placeholder="Danh mục"
            style={{ width: 180 }}
            value={category}
            onChange={setCategory}
            options={categories.map((c) => ({ value: c.code, label: c.name }))}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 160 }}
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({ value: s, label: PRODUCT_STATUS_META[s].label }))}
          />
        </Flex>

        <BulkActionBar
          count={selectedKeys.length}
          onClear={() => setSelectedKeys([])}
          errors={bulkErrors}
          onCloseErrors={() => setBulkErrors([])}
        >
          <Dropdown
            trigger={['click']}
            menu={{
              items: STATUSES.map((s) => ({ key: String(s), label: PRODUCT_STATUS_META[s].label })),
              onClick: ({ key }) => applyBulkStatus(Number(key) as ProductStatus),
            }}
          >
            <Button size="small">
              Đổi trạng thái <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            size="small"
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => {
              priceForm.resetFields();
              setPriceOpen(true);
            }}
          >
            Đổi giá
          </Button>
        </BulkActionBar>

        <Table
          rowKey="sku"
          sticky
          scroll={{ x: 1100 }}
          columns={columns}
          dataSource={data}
          rowClassName={(p) => (errorIds.has(p.sku) ? 'admin-row-error' : '')}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} sản phẩm` }}
        />
      </Card>

      <Modal
        open={priceOpen}
        title={`Đổi giá ${selected.length} sản phẩm`}
        okText="Áp dụng"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={applyBulkPrice}
        onCancel={() => setPriceOpen(false)}
        destroyOnHidden
      >
        <Form form={priceForm} layout="vertical" initialValues={{ mode: 'percent', keepOriginal: true }}>
          <Form.Item name="mode" label="Cách tính">
            <Radio.Group
              optionType="button"
              options={[
                { value: 'percent', label: 'Giảm theo %' },
                { value: 'amount', label: 'Giảm số tiền' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle dependencies={['mode']}>
            {({ getFieldValue }) => (
              <Form.Item
                name="value"
                label={getFieldValue('mode') === 'percent' ? 'Giảm bao nhiêu %' : 'Giảm bao nhiêu tiền'}
                rules={[{ required: true, message: 'Nhập mức giảm (số âm để tăng giá)' }]}
                extra="Nhập số âm để tăng giá. Giá mới được làm tròn đến nghìn đồng."
              >
                {getFieldValue('mode') === 'percent' ? (
                  <InputNumber min={-100} max={99} suffix="%" style={{ width: '100%' }} />
                ) : (
                  <InputNumber
                    step={100000}
                    suffix="₫"
                    style={{ width: '100%' }}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                  />
                )}
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="keepOriginal" label="Giá gốc (gạch ngang)">
            <Radio.Group
              options={[
                { value: true, label: 'Giữ giá cũ làm giá gốc' },
                { value: false, label: 'Bỏ giá gốc' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" extra="Ghi vào lịch sử giá, mặc định BULK">
            <Input placeholder="vd: Khuyến mãi Black Friday" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
