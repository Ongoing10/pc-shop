import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import { fakeLatency, useAdminData } from '../../../context/AdminDataContext';
import { AdminBrand } from '../../../types/admin';
import { PRODUCT_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';

interface BrandFormValues {
  code: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

/** A10: thương hiệu. Không có xóa, chỉ bật/tắt. */
export const BrandsPage: React.FC = () => {
  const { message } = App.useApp();
  const {
    brands: [brands, setBrands],
    products: [products],
  } = useAdminData();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [viewingCode, setViewingCode] = useState<string>();
  const [editing, setEditing] = useState<AdminBrand | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<BrandFormValues>();

  // TODO ghép API: GET /admin/brands (kể cả đã tắt)
  const viewing = brands.find((b) => b.code === viewingCode);
  const productsOf = (code: string) => products.filter((p) => p.brandCode === code);

  const setActive = (codes: string[], active: boolean) => {
    // TODO ghép API: PATCH /admin/brands/{code}/active, nhiều dòng: PATCH /admin/brands/bulk/active {codes, isActive}
    const set = new Set(codes);
    setBrands((prev) => prev.map((b) => (set.has(b.code) ? { ...b, isActive: active ? 1 : 0 } : b)));
    setSelectedKeys([]);
    message.success(`Đã ${active ? 'bật' : 'tắt'} ${codes.length} thương hiệu`);
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
    await fakeLatency();
    if (editing === 'new' && brands.some((b) => b.code === v.code)) {
      setSaving(false);
      form.setFields([{ name: 'code', errors: ['Mã đã tồn tại (409)'] }]);
      return;
    }
    const now = new Date().toISOString();
    if (editing === 'new') {
      // TODO ghép API: POST /admin/brands
      setBrands((prev) => [
        ...prev,
        { id: `b${Date.now()}`, code: v.code, name: v.name, slug: v.slug, logoUrl: v.logoUrl || null, isActive: 1, updatedAt: now },
      ]);
      message.success(`Đã thêm ${v.name}`);
    } else if (editing) {
      // TODO ghép API: PUT /admin/brands/{code}
      setBrands((prev) =>
        prev.map((b) => (b.id === editing.id ? { ...b, name: v.name, slug: v.slug, logoUrl: v.logoUrl || null, updatedAt: now } : b))
      );
      message.success('Đã lưu thương hiệu');
    }
    setSaving(false);
    setEditing(null);
  };

  const columns: TableColumnsType<AdminBrand> = [
    {
      title: 'Thương hiệu',
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
    { title: 'Mã', dataIndex: 'code', width: 140, render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: 'Slug', dataIndex: 'slug', width: 140 },
    { title: 'Sản phẩm', key: 'products', width: 100, align: 'right', render: (_, b) => productsOf(b.code).length },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      width: 100,
      render: (a: number, b) => <Switch size="small" checked={a === 1} onChange={(v) => setActive([b.code], v)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 88,
      render: (_, b) => (
        <Flex gap={4}>
          <Tooltip title="Xem chi tiết">
            <Button type="text" size="small" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => setViewingCode(b.code)} />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button type="text" size="small" icon={<EditOutlined />} aria-label="Sửa" onClick={() => openForm(b)} />
          </Tooltip>
        </Flex>
      ),
    },
  ];

  const viewingProducts = viewing ? productsOf(viewing.code) : [];

  return (
    <>
      <AdminPageHeader
        title="Thương hiệu"
        subtitle="Thương hiệu đã tắt không hiện ở bộ lọc trang khách"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            Thêm thương hiệu
          </Button>
        }
      />

      <Card>
        <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
          <Button size="small" onClick={() => setActive(selectedKeys as string[], true)}>
            Bật
          </Button>
          <Button size="small" danger onClick={() => setActive(selectedKeys as string[], false)}>
            Tắt
          </Button>
        </BulkActionBar>

        <Table
          rowKey="code"
          columns={columns}
          dataSource={brands}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          rowClassName={(b) => (b.isActive ? '' : 'admin-row-muted')}
          pagination={false}
        />
      </Card>

      <Modal
        open={!!viewing}
        title={
          viewing && (
            <Flex gap={10} align="center">
              <Avatar shape="square" size={28} src={viewing.logoUrl ?? undefined}>
                {viewing.name.charAt(0)}
              </Avatar>
              Thương hiệu {viewing.name}
            </Flex>
          )
        }
        width={640}
        onCancel={() => setViewingCode(undefined)}
        footer={[
          <Button key="close" onClick={() => setViewingCode(undefined)}>
            Đóng
          </Button>,
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => viewing && openForm(viewing)}>
            Sửa
          </Button>,
        ]}
      >
        {viewing && (
          <>
            <Descriptions
              size="small"
              column={2}
              items={[
                { key: 'code', label: 'Mã', children: <span className="admin-mono">{viewing.code}</span> },
                { key: 'slug', label: 'Slug', children: viewing.slug },
                {
                  key: 'active',
                  label: 'Trạng thái',
                  children: <Badge status={viewing.isActive ? 'success' : 'default'} text={viewing.isActive ? 'Đang hoạt động' : 'Đã tắt'} />,
                },
                { key: 'updated', label: 'Cập nhật', children: viewing.updatedAt ? formatDateTime(viewing.updatedAt) : '–' },
                { key: 'logo', label: 'URL logo', span: 2, children: viewing.logoUrl ?? '–' },
              ]}
            />
            <Divider titlePlacement="start">Sản phẩm ({viewingProducts.length})</Divider>
            {viewingProducts.length ? (
              <List
                size="small"
                dataSource={viewingProducts}
                renderItem={(p) => (
                  <List.Item extra={<Tag color={PRODUCT_STATUS_META[p.status].color}>{PRODUCT_STATUS_META[p.status].label}</Tag>}>
                    <List.Item.Meta
                      avatar={<Avatar shape="square" size={36} src={p.images?.[0]?.url} />}
                      title={<Link to={`/admin/products/${p.sku}`}>{p.name}</Link>}
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
              <Empty description="Chưa có sản phẩm nào thuộc thương hiệu này" />
            )}
          </>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm thương hiệu' : 'Sửa thương hiệu'}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Mã"
            normalize={(v: string) => v?.toUpperCase()}
            rules={[
              { required: true, message: 'Nhập mã' },
              { pattern: /^[A-Z0-9_]+$/, message: 'Chỉ A-Z, 0-9 và _' },
            ]}
          >
            <Input disabled={editing !== 'new'} className="admin-mono" />
          </Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true, message: 'Nhập tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'Chữ thường, số và dấu gạch ngang' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="logoUrl" label="URL logo">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
