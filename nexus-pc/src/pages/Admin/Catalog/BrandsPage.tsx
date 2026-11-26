import React, { useState } from 'react';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Row,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminToolbar } from '../../../components/admin/AdminToolbar';
import { BulkDeleteButton, RowDeleteButton } from '../../../components/admin/DeleteActions';
import {
  useAdminBrands,
  useAdminProducts,
  useCreateBrand,
  useSetBrandsActive,
  useUpdateBrand,
} from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { AdminBrand } from '../../../types/admin';
import { PRODUCT_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';
import { ProductFormModal } from '../Products/ProductFormModal';
import { t } from '../../../i18n/t';

interface BrandFormValues {
  code: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

/** A10: thương hiệu. "Xóa" = tắt (không xóa thật). */
export const BrandsPage: React.FC = () => {
  const { message } = App.useApp();
  const { data: brands = [], isLoading } = useAdminBrands();
  const { data: products = [] } = useAdminProducts();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const setBrandsActive = useSetBrandsActive();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [viewingCode, setViewingCode] = useState<string>();
  const [editing, setEditing] = useState<AdminBrand | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [productSku, setProductSku] = useState<string>();
  const [form] = Form.useForm<BrandFormValues>();

  const viewing = brands.find((b) => b.code === viewingCode);
  const productsOf = (code: string) => products.filter((p) => p.brandCode === code);

  const setActive = (codes: string[], active: boolean) => {
    setBrandsActive.mutate(
      { codes, active },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.brands.brands', 'Đã {{value}} {{count}} thương hiệu', { value: active ? t('admin.common.enabled', 'bật') : t('admin.common.disabled', 'tắt'), count: codes.length }));
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  /** "Xóa" = tắt (không xóa thật), bật lại được */
  const remove = (codes: string[]) => {
    setBrandsActive.mutate(
      { codes, active: false },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.brands.deletedBrands', 'Đã xóa {{count}} thương hiệu', { count: codes.length }));
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  const openForm = (b: AdminBrand | 'new') => {
    form.resetFields();
    if (b !== 'new') form.setFieldsValue(b);
    setViewingCode(undefined);
    setEditing(b);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing === 'new') {
        await createBrand.mutateAsync({ code: v.code, name: v.name, slug: v.slug || null, logoUrl: v.logoUrl || null });
        message.success(t('admin.brands.added', 'Đã thêm {{name}}', { name: v.name }));
      } else if (editing) {
        await updateBrand.mutateAsync({ code: editing.code, body: { name: v.name, slug: v.slug || null, logoUrl: v.logoUrl || null } });
        message.success(t('admin.brands.brandSaved', 'Đã lưu thương hiệu'));
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: 'code', errors: [t('admin.brands.codeAlreadyExists409', 'Mã đã tồn tại (409)')] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminBrand> = [
    {
      title: t('admin.common.brands', 'Thương hiệu'),
      dataIndex: 'name',
      render: (name: string, b) => (
        <Flex gap={10} align="center">
          <Avatar shape="square" size={32} src={b.logoUrl ?? undefined}>
            {name.charAt(0)}
          </Avatar>
          <Typography.Link className="admin-cell-title" onClick={() => setViewingCode(b.code)}>
            {name}
          </Typography.Link>
        </Flex>
      ),
    },
    { title: t('admin.common.code', 'Mã'), dataIndex: 'code', width: 140, render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: 'Slug', dataIndex: 'slug', width: 140 },
    { title: t('admin.common.products', 'Sản phẩm'), key: 'products', width: 100, align: 'right', render: (_, b) => productsOf(b.code).length },
    {
      title: t('admin.common.active', 'Hoạt động'),
      dataIndex: 'isActive',
      width: 100,
      render: (a: number, b) => <Switch size="small" checked={a === 1} onChange={(v) => setActive([b.code], v)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, b) => (
        <Flex gap={4}>
          <Tooltip title={t('admin.common.viewDetails', 'Xem chi tiết')}>
            <Button type="text" size="small" icon={<EyeOutlined />} aria-label={t('admin.common.viewDetails', 'Xem chi tiết')} onClick={() => setViewingCode(b.code)} />
          </Tooltip>
          <Tooltip title={t('admin.common.edit', 'Sửa')}>
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={t('admin.common.edit', 'Sửa')} onClick={() => openForm(b)} />
          </Tooltip>
          <RowDeleteButton
            title={t('admin.brands.deleteBrand', 'Xóa thương hiệu {{name}}?', { name: b.name })}
            description={t('admin.brands.disablesTheBrandExistingData', 'Tắt thương hiệu, dữ liệu cũ giữ nguyên, có thể bật lại.')}
            onConfirm={() => remove([b.code])}
            disabled={!b.isActive}
            disabledReason={t('admin.common.disabled2', 'Đã tắt')}
          />
        </Flex>
      ),
    },
  ];

  const viewingProducts = viewing ? productsOf(viewing.code) : [];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.brands', 'Thương hiệu')}
        subtitle={t('admin.brands.disabledBrandsDoNotAppear', 'Thương hiệu đã tắt không hiện ở bộ lọc trang khách')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            {t('admin.brands.addBrand', 'Thêm thương hiệu')}
          </Button>
        }
      />

      <Card>
        <AdminToolbar
          selectedCount={selectedKeys.length}
          totalCount={brands.length}
          bulkActions={
            <>
              <Button onClick={() => setActive(selectedKeys as string[], true)}>{t('admin.common.enable', 'Bật')}</Button>
              <BulkDeleteButton
                count={selectedKeys.length}
                noun={t('admin.brands.brands2', 'thương hiệu')}
                content={t('admin.brands.theBrandsWillBeDisabled', 'Thương hiệu sẽ bị tắt, dữ liệu cũ giữ nguyên và có thể bật lại.')}
                onConfirm={() => remove(selectedKeys as string[])}
              />
            </>
          }
        />

        <Table
          rowKey="code"
          columns={columns}
          dataSource={brands}
          loading={isLoading}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          rowClassName={(b) => (b.isActive ? '' : 'admin-row-muted')}
          pagination={false}
        />
      </Card>

      <Modal
        centered
        open={!!viewing}
        title={
          viewing && (
            <Flex gap={10} align="center">
              <Avatar shape="square" size={28} src={viewing.logoUrl ?? undefined}>
                {viewing.name.charAt(0)}
              </Avatar>
              {t('admin.common.brands', 'Thương hiệu')} {viewing.name}
            </Flex>
          )
        }
        width={640}
        onCancel={() => setViewingCode(undefined)}
        footer={[
          <Button key="close" onClick={() => setViewingCode(undefined)}>
            {t('admin.common.close', 'Đóng')}
          </Button>,
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => viewing && openForm(viewing)}>
            {t('admin.common.edit', 'Sửa')}
          </Button>,
        ]}
      >
        {viewing && (
          <>
            <Descriptions
              size="small"
              column={2}
              items={[
                { key: 'code', label: t('admin.common.code', 'Mã'), children: <span className="admin-mono">{viewing.code}</span> },
                { key: 'slug', label: 'Slug', children: viewing.slug },
                {
                  key: 'active',
                  label: t('admin.common.status', 'Trạng thái'),
                  children: <Badge status={viewing.isActive ? 'success' : 'default'} text={viewing.isActive ? t('admin.common.active2', 'Đang hoạt động') : t('admin.common.disabled2', 'Đã tắt')} />,
                },
                { key: 'updated', label: t('admin.common.update', 'Cập nhật'), children: viewing.updatedAt ? formatDateTime(viewing.updatedAt) : '–' },
                { key: 'logo', label: 'URL logo', span: 2, children: viewing.logoUrl ?? '–' },
              ]}
            />
            <Divider titlePlacement="start">{t('admin.brands.products', 'Sản phẩm (')}{viewingProducts.length})</Divider>
            {viewingProducts.length ? (
              <List
                size="small"
                dataSource={viewingProducts}
                renderItem={(p) => (
                  <List.Item extra={<Tag color={PRODUCT_STATUS_META[p.status].color}>{PRODUCT_STATUS_META[p.status].label}</Tag>}>
                    <List.Item.Meta
                      avatar={<Avatar shape="square" size={36} src={p.images?.[0]?.url} />}
                      title={<Typography.Link onClick={() => setProductSku(p.sku)}>{p.name}</Typography.Link>}
                      description={
                        <span>
                          <span className="admin-mono">{p.sku}</span> · {formatCurrency(p.price)}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={t('admin.brands.noProductsBelongToThis', 'Chưa có sản phẩm nào thuộc thương hiệu này')} />
            )}
          </>
        )}
      </Modal>

      <Modal
        centered
        open={editing !== null}
        title={editing === 'new' ? t('admin.brands.addBrand', 'Thêm thương hiệu') : t('admin.brands.editBrand', 'Sửa thương hiệu')}
        okText={t('admin.common.save', 'Lưu')}
        cancelText={t('admin.common.cancel', 'Hủy')}
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="code"
                label={t('admin.common.code', 'Mã')}
                normalize={(v: string) => v?.toUpperCase()}
                rules={[
                  { required: true, message: t('admin.common.enterACode', 'Nhập mã') },
                  { pattern: /^[A-Z0-9_]+$/, message: t('admin.common.onlyAZ09', 'Chỉ A-Z, 0-9 và _') },
                ]}
              >
                <Input disabled={editing !== 'new'} className="admin-mono" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label={t('admin.common.name', 'Tên')} rules={[{ required: true, whitespace: true, message: t('admin.common.enterAName', 'Nhập tên') }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="slug"
                label="Slug"
                rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: t('admin.common.lowercaseLettersDigitsAndHyphens', 'Chữ thường, số và dấu gạch ngang') }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="logoUrl" label="URL logo">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <ProductFormModal open={!!productSku} sku={productSku ?? null} onClose={() => setProductSku(undefined)} />
    </>
  );
};
