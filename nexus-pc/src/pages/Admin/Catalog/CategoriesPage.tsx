import React, { useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
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
import { BulkDeleteButton, RowDeleteButton } from '../../../components/admin/DeleteActions';
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
import { t } from '../../../i18n/t';

const PC_SLOTS = ['CPU', 'MAINBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE', 'COOLER'];

interface CategoryFormValues {
  code: string;
  name: string;
  slug: string;
  pcSlot?: string | null;
  sortOrder?: number | null;
}

const SPEC_TYPE_LABEL: Record<SpecField['type'], string> = {
  get string() { return t('admin.categories.text', 'Chuỗi'); },
  get integer() { return t('admin.categories.integer', 'Số nguyên'); },
  get decimal() { return t('admin.categories.decimal', 'Số thập phân'); },
  get boolean() { return t('admin.categories.yesNo', 'Có/không'); },
  get string_list() { return t('admin.categories.list', 'Danh sách'); },
};

/** Bảng thông số của danh mục: chỉ đọc (chưa có API sửa specSchema) */
const SpecSchemaTable: React.FC<{ schema: SpecField[] | null }> = ({ schema }) => {
  if (!schema) {
    return (
      <Typography.Text type="secondary">
        {t('admin.categories.theCategoryHasNoSpec', 'Danh mục chưa khai bộ thông số. Sản phẩm thuộc danh mục này không được kiểm tra tương thích.')}
      </Typography.Text>
    );
  }
  const columns: TableColumnsType<SpecField> = [
    { title: t('admin.common.key', 'Khóa'), dataIndex: 'key', width: 190, render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: t('admin.common.tags', 'Nhãn'), dataIndex: 'label' },
    {
      title: t('admin.categories.group', 'Nhóm'),
      dataIndex: 'group',
      width: 120,
      render: (g: SpecField['group']) => (g === 'compat' ? <Tag color="volcano">{t('admin.categories.compatibility', 'Tương thích')}</Tag> : <Tag>{t('admin.categories.display', 'Hiển thị')}</Tag>),
    },
    { title: t('admin.categories.type', 'Kiểu'), dataIndex: 'type', width: 110, render: (n: SpecField['type']) => SPEC_TYPE_LABEL[n] },
    { title: t('admin.categories.unit', 'Đơn vị'), dataIndex: 'unit', width: 70, render: (v: string | null) => v ?? '–' },
    { title: t('admin.categories.required', 'Bắt buộc'), dataIndex: 'required', width: 80, render: (v: boolean) => (v ? t('admin.categories.yes', 'Có') : '–') },
    {
      title: t('admin.categories.allowedValues', 'Giá trị cho phép'),
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
          <Typography.Text type="secondary">{t('admin.categories.free', 'Tự do')}</Typography.Text>
        ),
    },
  ];
  return <Table rowKey="key" size="small" columns={columns} dataSource={schema} pagination={false} />;
};

/** A10: danh mục sản phẩm. "Xóa" = tắt (không xóa thật). */
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
          message.success(t('admin.categories.categories', 'Đã {{value}} {{count}} danh mục', { value: active ? t('admin.common.enabled', 'bật') : t('admin.common.disabled', 'tắt'), count: codes.length }));
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  /** "Xóa" = tắt (không xóa thật), bật lại được */
  const remove = (codes: string[]) => {
    setCategoriesActive.mutate(
      { codes, active: false },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.categories.deletedCategories', 'Đã xóa {{count}} danh mục', { count: codes.length }));
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
        message.success(t('admin.categories.createdCategory', 'Đã tạo danh mục {{name}}', { name: v.name }));
      } else if (editing) {
        await updateCategory.mutateAsync({ code: editing.code, body });
        message.success(t('admin.categories.categorySaved', 'Đã lưu danh mục'));
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: editing === 'new' ? 'code' : 'slug', errors: [t('admin.common.alreadyExists409', 'Đã tồn tại (409)')] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminCategory> = [
    { title: t('admin.common.code', 'Mã'), dataIndex: 'code', width: 130, render: (v: string) => <span className="admin-mono">{v}</span> },
    {
      title: t('admin.common.name', 'Tên'),
      dataIndex: 'name',
      render: (v: string, c) => (
        <Typography.Link className="admin-cell-title" onClick={() => setViewingCode(c.code)}>
          {v}
        </Typography.Link>
      ),
    },
    { title: 'Slug', dataIndex: 'slug', width: 130 },
    { title: t('admin.categories.pcBuilderSlot', 'Ô PC Builder'), dataIndex: 'pcSlot', width: 130, render: (v: string | null) => v ?? '–' },
    { title: t('admin.categories.order', 'Thứ tự'), dataIndex: 'sortOrder', width: 80, align: 'right', render: (v: number | null) => v ?? '–' },
    {
      title: t('admin.common.specs', 'Thông số'),
      dataIndex: 'specSchema',
      width: 110,
      render: (s: SpecField[] | null) => (s ? t('admin.categories.fields', '{{count}} trường', { count: s.length }) : <Tag color="gold">{t('admin.categories.notDefined', 'Chưa khai')}</Tag>),
    },
    { title: t('admin.common.products', 'Sản phẩm'), key: 'products', width: 100, align: 'right', render: (_, c) => productCount(c.code) },
    {
      title: t('admin.common.active', 'Hoạt động'),
      dataIndex: 'isActive',
      width: 100,
      render: (a: number, c) => <Switch size="small" checked={a === 1} onChange={(v) => setActive([c.code], v)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, c) => (
        <Flex gap={4}>
          <Tooltip title={t('admin.common.viewDetails', 'Xem chi tiết')}>
            <Button type="text" size="small" icon={<EyeOutlined />} aria-label={t('admin.common.viewDetails', 'Xem chi tiết')} onClick={() => setViewingCode(c.code)} />
          </Tooltip>
          <Tooltip title={t('admin.common.edit', 'Sửa')}>
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={t('admin.common.edit', 'Sửa')} onClick={() => openForm(c)} />
          </Tooltip>
          <RowDeleteButton
            title={t('admin.categories.deleteCategory', 'Xóa danh mục {{name}}?', { name: c.name })}
            description={t('admin.categories.disablesTheCategoryExistingData', 'Tắt danh mục, dữ liệu cũ giữ nguyên, có thể bật lại.')}
            onConfirm={() => remove([c.code])}
            disabled={!c.isActive}
            disabledReason={t('admin.common.disabled2', 'Đã tắt')}
          />
        </Flex>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.category', 'Danh mục')}
        subtitle={t('admin.categories.deletingDisablesTheCategoryHidden', 'Xóa là tắt danh mục: ẩn khỏi trang khách, dữ liệu cũ vẫn giữ nguyên')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            {t('admin.categories.addCategory', 'Thêm danh mục')}
          </Button>
        }
      />

      <Card>
        <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
          <Button size="small" onClick={() => setActive(selectedKeys as string[], true)}>
            {t('admin.common.enable', 'Bật')}
          </Button>
          <BulkDeleteButton
            count={selectedKeys.length}
            noun={t('admin.categories.categories2', 'danh mục')}
            content={t('admin.categories.theCategoriesWillBeDisabled', 'Danh mục sẽ bị tắt, dữ liệu cũ giữ nguyên và có thể bật lại.')}
            onConfirm={() => remove(selectedKeys as string[])}
          />
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
        centered
        open={!!viewing}
        title={viewing ? t('admin.categories.category', 'Danh mục {{name}}', { name: viewing.name }) : ''}
        width={920}
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
                { key: 'slot', label: t('admin.categories.pcBuilderSlot', 'Ô PC Builder'), children: viewing.pcSlot ?? '–' },
                { key: 'order', label: t('admin.categories.order', 'Thứ tự'), children: viewing.sortOrder ?? '–' },
                {
                  key: 'active',
                  label: t('admin.common.status', 'Trạng thái'),
                  children: <Badge status={viewing.isActive ? 'success' : 'default'} text={viewing.isActive ? t('admin.common.active2', 'Đang hoạt động') : t('admin.common.disabled2', 'Đã tắt')} />,
                },
                { key: 'products', label: t('admin.categories.products', 'Số sản phẩm'), children: productCount(viewing.code) },
                { key: 'updated', label: t('admin.common.update', 'Cập nhật'), children: viewing.updatedAt ? formatDateTime(viewing.updatedAt) : '–' },
              ]}
            />
            <Divider titlePlacement="start">{t('admin.categories.specSchema', 'Bộ thông số')}</Divider>
            <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
              {t('admin.categories.generatesTheFieldsInThe', 'Sinh ô nhập ở form sản phẩm và cột trong file Excel. Chưa có API sửa nên chỉ xem.')}
            </Typography.Paragraph>
            <SpecSchemaTable schema={viewing.specSchema} />
          </>
        )}
      </Modal>

      <Modal
        centered
        open={editing !== null}
        title={editing === 'new' ? t('admin.categories.addCategory', 'Thêm danh mục') : t('admin.categories.editCategory', 'Sửa danh mục')}
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
            <Col span={24}>
              <Form.Item
                name="slug"
                label="Slug"
                rules={[
                  { required: true, message: t('admin.categories.enterASlug', 'Nhập slug') },
                  { pattern: /^[a-z0-9-]+$/, message: t('admin.common.lowercaseLettersDigitsAndHyphens', 'Chữ thường, số và dấu gạch ngang') },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item name="pcSlot" label={t('admin.categories.pcBuilderSlot2', 'Ô trong PC Builder')}>
                <Select allowClear options={PC_SLOTS.map((s) => ({ value: s, label: s }))} placeholder={t('admin.categories.notPartOfPcBuilder', 'Không thuộc PC Builder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="sortOrder" label={t('admin.categories.order', 'Thứ tự')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
