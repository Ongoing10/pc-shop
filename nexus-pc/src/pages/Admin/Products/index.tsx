import React, { useMemo, useState } from 'react';
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
import { ADMIN_TABLE_STICKY, AdminToolbar } from '../../../components/admin/AdminToolbar';
import { BulkErrorItem, bulkErrorsOf } from '../../../components/admin/bulk';
import { BulkDeleteButton, RowDeleteButton } from '../../../components/admin/DeleteActions';
import { ImportExcelModal } from '../../../components/admin/ImportExcelModal';
import {
  useAdminBrands,
  useAdminCategories,
  useAdminProducts,
  useSetProductStatus,
  useSetProductsPrice,
  useSetProductsStatus,
} from '../../../hooks/admin/useAdminApi';
import { adminCatalogService } from '../../../services/api/admin/adminCatalogService';
import { saveDownloadedFile } from '../../../utils/download';
import { AdminProduct, ProductStatus } from '../../../types/admin';
import { PRODUCT_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';
import { ProductFormModal } from './ProductFormModal';
import { t } from '../../../i18n/t';

const STATUSES = Object.keys(PRODUCT_STATUS_META).map(Number) as ProductStatus[];
/** "Xóa" sản phẩm = chuyển Ngừng bán (không xóa thật: đơn hàng cũ vẫn tham chiếu SKU) */
const DELETED_STATUS: ProductStatus = 4;
const deleteNote = () => t('admin.products.theProductMovesToDiscontinued', 'Sản phẩm chuyển sang "Ngừng bán": biến mất khỏi trang khách và bị gỡ khỏi dữ liệu tư vấn AI. Đơn hàng cũ vẫn giữ nguyên.');

interface BulkPriceForm {
  mode: 'percent' | 'amount';
  value: number;
  keepOriginal: boolean;
  reason?: string;
}

/** A02: danh sách sản phẩm (mọi trạng thái), chọn nhiều → đổi trạng thái / đổi giá / xóa. Thêm, sửa, import mở modal. */
export const AdminProductsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { data: products = [], isLoading } = useAdminProducts();
  const { data: categories = [] } = useAdminCategories();
  const { data: brands = [] } = useAdminBrands();
  const setProductsStatus = useSetProductsStatus();
  const setProductsPrice = useSetProductsPrice();
  const setProductStatus = useSetProductStatus();
  /** undefined = đóng, null = thêm mới, chuỗi = SKU đang sửa */
  const [formSku, setFormSku] = useState<string | null>();
  const [importOpen, setImportOpen] = useState(false);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>();
  const [status, setStatus] = useState<ProductStatus>();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [bulkErrors, setBulkErrors] = useState<BulkErrorItem[]>([]);
  const [priceOpen, setPriceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceForm] = Form.useForm<BulkPriceForm>();

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
      centered: true,
      title: t('admin.products.moveProductsTo', 'Chuyển {{count}} sản phẩm sang "{{value}}"?', { count: selected.length, value: PRODUCT_STATUS_META[next].label }),
      content:
        next === 3 || next === 4
          ? t('admin.products.theProductsWillDisappearFrom', 'Sản phẩm sẽ biến mất khỏi trang khách và bị gỡ khỏi dữ liệu tư vấn AI.')
          : undefined,
      okText: t('admin.products.confirm', 'Đồng ý'),
      cancelText: t('admin.common.cancel', 'Hủy'),
      onOk: async () => {
        try {
          await setProductsStatus.mutateAsync({ skus: selected.map((p) => p.sku), status: next });
          setBulkErrors([]);
          setSelectedKeys([]);
          message.success(t('admin.products.updatedProducts', 'Đã cập nhật {{count}} sản phẩm', { count: selected.length }));
        } catch (e) {
          const errors = bulkErrorsOf(e);
          if (errors) setBulkErrors(errors);
          else message.error((e as Error).message);
        }
      },
    });
  };

  const applyBulkPrice = async () => {
    const values = await priceForm.validateFields();
    setSaving(true);
    const priced = selected.map((p) => {
      const raw = values.mode === 'percent' ? p.price * (1 - values.value / 100) : p.price - values.value;
      return { p, price: Math.round(raw / 1000) * 1000 };
    });
    try {
      await setProductsPrice.mutateAsync({
        items: priced.map(({ p, price }) => ({
          sku: p.sku,
          price,
          originalPrice: values.keepOriginal ? p.originalPrice ?? p.price : null,
        })),
        reason: values.reason || null,
      });
      setBulkErrors([]);
      setSelectedKeys([]);
      setPriceOpen(false);
      message.success(t('admin.products.repricedProducts', 'Đã đổi giá {{count}} sản phẩm', { count: priced.length }));
    } catch (e) {
      const errors = bulkErrorsOf(e);
      if (errors) {
        setBulkErrors(errors);
        setPriceOpen(false);
      } else {
        message.error((e as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const deletable = selected.filter((p) => p.status !== DELETED_STATUS);

  const deleteOne = (p: AdminProduct) =>
    setProductStatus.mutateAsync({ sku: p.sku, status: DELETED_STATUS }).then(
      () => message.success(t('admin.products.deleted', 'Đã xóa {{name}}', { name: p.name })),
      (e: Error) => message.error(e.message)
    );

  const deleteSelected = async () => {
    try {
      await setProductsStatus.mutateAsync({ skus: deletable.map((p) => p.sku), status: DELETED_STATUS });
      setBulkErrors([]);
      setSelectedKeys([]);
      message.success(t('admin.products.deletedProducts', 'Đã xóa {{count}} sản phẩm', { count: deletable.length }));
    } catch (e) {
      const errors = bulkErrorsOf(e);
      if (errors) setBulkErrors(errors);
      else message.error((e as Error).message);
    }
  };

  const handleExport = async () => {
    try {
      saveDownloadedFile(await adminCatalogService.exportProducts({ category, status }), `san-pham-${category}.xlsx`);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const columns: TableColumnsType<AdminProduct> = [
    {
      title: t('admin.common.products', 'Sản phẩm'),
      dataIndex: 'name',
      fixed: 'left',
      render: (name: string, p) => (
        <Flex gap={12} align="center">
          <Avatar shape="square" size={40} src={p.images?.[0]?.url} />
          <div>
            <Typography.Link className="admin-cell-title" onClick={() => setFormSku(p.sku)}>
              {name}
            </Typography.Link>
            <Typography.Text type="secondary" className="admin-mono" style={{ display: 'block' }}>
              {p.sku}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    { title: t('admin.common.category', 'Danh mục'), dataIndex: 'categoryCode', width: 130, render: (c: string) => categoryName(c) },
    { title: t('admin.common.brands', 'Thương hiệu'), dataIndex: 'brandCode', width: 110, render: brandName },
    {
      title: t('admin.common.sellingPrice', 'Giá bán'),
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
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'status',
      width: 110,
      render: (s: ProductStatus) => <Tag color={PRODUCT_STATUS_META[s].color}>{PRODUCT_STATUS_META[s].label}</Tag>,
    },
    { title: t('admin.common.sold', 'Đã bán'), dataIndex: 'soldCount', width: 80, align: 'right', render: (v: number | null) => v ?? 0 },
    {
      title: t('admin.common.update', 'Cập nhật'),
      dataIndex: 'updatedAt',
      width: 150,
      render: (v: string | null) => (v ? formatDateTime(v) : '–'),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, p) => (
        <Flex gap={4}>
          <Tooltip title={t('admin.common.edit', 'Sửa')}>
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={t('admin.common.edit', 'Sửa')} onClick={() => setFormSku(p.sku)} />
          </Tooltip>
          <RowDeleteButton
            title={t('admin.products.delete', 'Xóa {{name}}?', { name: p.name })}
            description={<div style={{ maxWidth: 280 }}>{deleteNote()}</div>}
            onConfirm={() => deleteOne(p)}
            disabled={p.status === DELETED_STATUS}
            disabledReason={t('admin.products.alreadyDiscontinued', 'Đã ngừng bán')}
          />
        </Flex>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.products', 'Sản phẩm')}
        subtitle={t('admin.products.includesDraftHiddenAndDiscontinued', 'Thấy cả sản phẩm nháp, đã ẩn và ngừng bán')}
        extra={
          <>
            <Tooltip title={category ? undefined : t('admin.products.chooseACategoryBeforeExporting', 'Chọn danh mục trước khi xuất (mỗi danh mục một bộ cột thông số)')}>
              <Button icon={<DownloadOutlined />} disabled={!category} onClick={handleExport}>
                {t('admin.common.exportExcel', 'Xuất Excel')}
              </Button>
            </Tooltip>
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormSku(null)}>
              {t('admin.common.addProduct', 'Thêm sản phẩm')}
            </Button>
          </>
        }
      />

      <Card>
        <AdminToolbar
          filters={
            <>
              <Input.Search
                allowClear
                placeholder={t('admin.products.nameOrSku', 'Tên hoặc SKU')}
                style={{ width: 280 }}
                onSearch={setQ}
                onChange={(e) => !e.target.value && setQ('')}
              />
              <Select
                allowClear
                placeholder={t('admin.common.category', 'Danh mục')}
                style={{ width: 180 }}
                value={category}
                onChange={setCategory}
                options={categories.map((c) => ({ value: c.code, label: c.name }))}
              />
              <Select
                allowClear
                placeholder={t('admin.common.status', 'Trạng thái')}
                style={{ width: 160 }}
                value={status}
                onChange={setStatus}
                options={STATUSES.map((s) => ({ value: s, label: PRODUCT_STATUS_META[s].label }))}
              />
            </>
          }
          selectedCount={selectedKeys.length}
          totalCount={data.length}
          errors={bulkErrors}
          onCloseErrors={() => setBulkErrors([])}
          bulkActions={
            <>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: STATUSES.map((s) => ({ key: String(s), label: PRODUCT_STATUS_META[s].label })),
                  onClick: ({ key }) => applyBulkStatus(Number(key) as ProductStatus),
                }}
              >
                <Button>
                  {t('admin.common.changeStatus', 'Đổi trạng thái')} <DownOutlined />
                </Button>
              </Dropdown>
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => {
                  priceForm.resetFields();
                  setPriceOpen(true);
                }}
              >
                {t('admin.common.changePrice', 'Đổi giá')}
              </Button>
              <BulkDeleteButton
                count={deletable.length}
                noun={t('admin.products.products', 'sản phẩm')}
                content={
                  <>
                    {deleteNote()}
                    {deletable.length < selected.length && <div>{t('admin.common.skipping', 'Bỏ qua')} {selected.length - deletable.length} {t('admin.products.alreadyDiscontinuedProducts', 'sản phẩm đã ngừng bán.')}</div>}
                  </>
                }
                onConfirm={deleteSelected}
              />
            </>
          }
        />

        <Table
          rowKey="sku"
          sticky={ADMIN_TABLE_STICKY}
          scroll={{ x: 1100 }}
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowClassName={(p) => (errorIds.has(p.sku) ? 'admin-row-error' : '')}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (n) => t('admin.products.products2', '{{count}} sản phẩm', { count: n }) }}
        />
      </Card>

      <Modal
        centered
        open={priceOpen}
        title={t('admin.products.changePriceOfProducts', 'Đổi giá {{count}} sản phẩm', { count: selected.length })}
        okText={t('admin.common.apply', 'Áp dụng')}
        cancelText={t('admin.common.cancel', 'Hủy')}
        confirmLoading={saving}
        onOk={applyBulkPrice}
        onCancel={() => setPriceOpen(false)}
        destroyOnHidden
      >
        <Form form={priceForm} layout="vertical" initialValues={{ mode: 'percent', keepOriginal: true }}>
          <Form.Item name="mode" label={t('admin.products.calculation', 'Cách tính')}>
            <Radio.Group
              optionType="button"
              options={[
                { value: 'percent', label: t('admin.common.percentageOff', 'Giảm theo %') },
                { value: 'amount', label: t('admin.common.amountOff', 'Giảm số tiền') },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle dependencies={['mode']}>
            {({ getFieldValue }) => (
              <Form.Item
                name="value"
                label={getFieldValue('mode') === 'percent' ? t('admin.products.discount', 'Giảm bao nhiêu %') : t('admin.products.discountAmount', 'Giảm bao nhiêu tiền')}
                rules={[{ required: true, message: t('admin.products.enterTheDiscountNegativeTo', 'Nhập mức giảm (số âm để tăng giá)') }]}
                extra={t('admin.products.enterANegativeNumberTo', 'Nhập số âm để tăng giá. Giá mới được làm tròn đến nghìn đồng.')}
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
          <Form.Item name="keepOriginal" label={t('admin.common.originalPriceStruckThrough', 'Giá gốc (gạch ngang)')}>
            <Radio.Group
              options={[
                { value: true, label: t('admin.products.keepTheOldPriceAs', 'Giữ giá cũ làm giá gốc') },
                { value: false, label: t('admin.products.removeTheOriginalPrice', 'Bỏ giá gốc') },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label={t('admin.common.reason', 'Lý do')} extra={t('admin.products.savedToPriceHistoryBulk', 'Ghi vào lịch sử giá, mặc định BULK')}>
            <Input placeholder={t('admin.products.eGBlackFridaySale', 'vd: Khuyến mãi Black Friday')} maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>

      <ProductFormModal open={formSku !== undefined} sku={formSku ?? null} onClose={() => setFormSku(undefined)} />
      <ImportExcelModal kind="products" open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
};
