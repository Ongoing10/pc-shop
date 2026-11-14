import React, { useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
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
import {
  useAdminCategories,
  useAdminProducts,
  useCreateCategory,
  useSetCategoriesActive,
  useUpdateCategory,
} from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { AdminCategory, SpecField } from '../../../types/admin';
import { formatDateTime } from '../../../utils/orderStatus';

const PC_SLOTS = ['CPU', 'MAINBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE', 'COOLER'];

interface CategoryFormValues {
  code: string;
  name: string;
  slug: string;
  pcSlot?: string | null;
  sortOrder?: number | null;
}

const SPEC_TYPE_LABEL: Record<SpecField['type'], string> = {
  string: 'Chuỗi',
  integer: 'Số nguyên',
  decimal: 'Số thập phân',
  boolean: 'Có/không',
  string_list: 'Danh sách',
};

/** Bảng thông số của danh mục: chỉ đọc (chưa có API sửa specSchema) */
const SpecSchemaTable: React.FC<{ schema: SpecField[] | null }> = ({ schema }) => {
  if (!schema) {
    return (
      <Typography.Text type="secondary">
        Danh mục chưa khai bộ thông số. Sản phẩm thuộc danh mục này không được kiểm tra tương thích.
      </Typography.Text>
    );
  }
  const columns: TableColumnsType<SpecField> = [
    { title: 'Khóa', dataIndex: 'key', width: 190, render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: 'Nhãn', dataIndex: 'label' },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      width: 120,
      render: (g: SpecField['group']) => (g === 'compat' ? <Tag color="volcano">Tương thích</Tag> : <Tag>Hiển thị</Tag>),
    },
    { title: 'Kiểu', dataIndex: 'type', width: 110, render: (t: SpecField['type']) => SPEC_TYPE_LABEL[t] },
    { title: 'Đơn vị', dataIndex: 'unit', width: 70, render: (v: string | null) => v ?? '–' },
    { title: 'Bắt buộc', dataIndex: 'required', width: 80, render: (v: boolean) => (v ? 'Có' : '–') },
    {
      title: 'Giá trị cho phép',
      dataIndex: 'options',
      render: (o: string[] | null) =>
        o ? (
          <Flex gap={4} wrap>
            {o.map((x) => (
              <Tag key={x} bordered={false}>
                {x}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">Tự do</Typography.Text>
        ),
    },
  ];
  return <Table rowKey="key" size="small" columns={columns} dataSource={schema} pagination={false} />;
};

/** A10: danh mục sản phẩm. Không có xóa, chỉ bật/tắt. */
export const CategoriesPage: React.FC = () => {
  const { message } = App.useApp();
  const { data: categories = [], isLoading } = useAdminCategories();
  const { data: products = [] } = useAdminProducts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const setCategoriesActive = useSetCategoriesActive();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [viewingCode, setViewingCode] = useState<string>();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CategoryFormValues>();

  const viewing = categories.find((c) => c.code === viewingCode);
  const productCount = (code: string) => products.filter((p) => p.categoryCode === code).length;

  const setActive = (codes: string[], active: boolean) => {
    setCategoriesActive.mutate(
      { codes, active },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(`Đã ${active ? 'bật' : 'tắt'} ${codes.length} danh mục`);
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  const openForm = (c: AdminCategory | 'new') => {
    form.resetFields();
    if (c !== 'new') form.setFieldsValue(c);
    setViewingCode(undefined);
    setEditing(c);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    const body = { name: v.name, slug: v.slug || null, pcSlot: v.pcSlot ?? null, sortOrder: v.sortOrder ?? null };
    try {
      if (editing === 'new') {
        await createCategory.mutateAsync({ code: v.code, ...body });
        message.success(`Đã tạo danh mục ${v.name}`);
      } else if (editing) {
        await updateCategory.mutateAsync({ code: editing.code, body });
        message.success('Đã lưu danh mục');
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: editing === 'new' ? 'code' : 'slug', errors: ['Đã tồn tại (409)'] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminCategory> = [
    { title: 'Mã', dataIndex: 'code', width: 130, render: (v: string) => <span className="admin-mono">{v}</span> },
    {
      title: 'Tên',
      dataIndex: 'name',
      render: (v: string, c) => (
        <Typography.Link className="admin-cell-title" onClick={() => setViewingCode(c.code)}>
          {v}
        </Typography.Link>
      ),
    },
    { title: 'Slug', dataIndex: 'slug', width: 130 },
    { title: 'Ô PC Builder', dataIndex: 'pcSlot', width: 130, render: (v: string | null) => v ?? '–' },
    { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80, align: 'right', render: (v: number | null) => v ?? '–' },
    {
      title: 'Thông số',
      dataIndex: 'specSchema',
      width: 110,
      render: (s: SpecField[] | null) => (s ? `${s.length} trường` : <Tag color="gold">Chưa khai</Tag>),
    },
    { title: 'Sản phẩm', key: 'products', width: 100, align: 'right', render: (_, c) => productCount(c.code) },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      width: 100,
      render: (a: number, c) => <Switch size="small" checked={a === 1} onChange={(v) => setActive([c.code], v)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 88,
      render: (_, c) => (
        <Flex gap={4}>
          <Tooltip title="Xem chi tiết">
            <Button type="text" size="small" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => setViewingCode(c.code)} />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button type="text" size="small" icon={<EditOutlined />} aria-label="Sửa" onClick={() => openForm(c)} />
          </Tooltip>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Danh mục"
        subtitle="Không có xóa: tắt để ẩn khỏi trang khách, dữ liệu cũ vẫn giữ nguyên"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            Thêm danh mục
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
          dataSource={[...categories].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))}
          loading={isLoading}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          rowClassName={(c) => (c.isActive ? '' : 'admin-row-muted')}
          pagination={false}
        />
      </Card>

      <Modal
        open={!!viewing}
        title={viewing ? `Danh mục ${viewing.name}` : ''}
        width={920}
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
                { key: 'slot', label: 'Ô PC Builder', children: viewing.pcSlot ?? '–' },
                { key: 'order', label: 'Thứ tự', children: viewing.sortOrder ?? '–' },
                {
                  key: 'active',
                  label: 'Trạng thái',
                  children: <Badge status={viewing.isActive ? 'success' : 'default'} text={viewing.isActive ? 'Đang hoạt động' : 'Đã tắt'} />,
                },
                { key: 'products', label: 'Số sản phẩm', children: productCount(viewing.code) },
                { key: 'updated', label: 'Cập nhật', children: viewing.updatedAt ? formatDateTime(viewing.updatedAt) : '–' },
              ]}
            />
            <Divider titlePlacement="start">Bộ thông số</Divider>
            <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
              Sinh ô nhập ở form sản phẩm và cột trong file Excel. Chưa có API sửa nên chỉ xem.
            </Typography.Paragraph>
            <SpecSchemaTable schema={viewing.specSchema} />
          </>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm danh mục' : 'Sửa danh mục'}
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
            rules={[
              { required: true, message: 'Nhập slug' },
              { pattern: /^[a-z0-9-]+$/, message: 'Chữ thường, số và dấu gạch ngang' },
            ]}
          >
            <Input />
          </Form.Item>
          <Flex gap={12}>
            <Form.Item name="pcSlot" label="Ô trong PC Builder" style={{ flex: 1 }}>
              <Select allowClear options={PC_SLOTS.map((s) => ({ value: s, label: s }))} placeholder="Không thuộc PC Builder" />
            </Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự" style={{ width: 120 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>
    </>
  );
};
