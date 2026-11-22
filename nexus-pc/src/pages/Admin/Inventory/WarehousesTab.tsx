import React, { useState } from 'react';
import { App, Button, Col, Flex, Form, Input, Modal, Row, Switch, Table, Tooltip, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import { BulkDeleteButton, RowDeleteButton } from '../../../components/admin/DeleteActions';
import {
  useAdminInventory,
  useAdminWarehouses,
  useCreateWarehouse,
  useSetWarehousesActive,
  useUpdateWarehouse,
} from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { useAdminSession } from '../../../context/AdminSessionContext';
import { Warehouse } from '../../../types/admin';
import { t } from '../../../i18n/t';

interface WarehouseFormValues {
  code: string;
  name: string;
  address?: string;
}

export const WarehousesTab: React.FC = () => {
  const { message } = App.useApp();
  const { hasRole } = useAdminSession();
  const isAdmin = hasRole('ADMIN');
  const { data: warehouses = [], isLoading } = useAdminWarehouses();
  const { data: inventories = [] } = useAdminInventory();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const setWarehousesActive = useSetWarehousesActive();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [editing, setEditing] = useState<Warehouse | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<WarehouseFormValues>();

  const openForm = (w: Warehouse | 'new') => {
    form.resetFields();
    if (w !== 'new') form.setFieldsValue({ code: w.code, name: w.name, address: w.address ?? undefined });
    setEditing(w);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing === 'new') {
        await createWarehouse.mutateAsync({ code: v.code, name: v.name, address: v.address ?? null });
        message.success(t('admin.inventory.addedWarehouse', 'Đã thêm kho {{name}}', { name: v.name }));
      } else if (editing) {
        await updateWarehouse.mutateAsync({ id: editing.id, body: { name: v.name, address: v.address ?? null } });
        message.success(t('admin.inventory.warehouseSaved', 'Đã lưu kho'));
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: 'code', errors: [t('admin.inventory.warehouseCodeAlreadyExists409', 'Mã kho đã tồn tại (409)')] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (w: Warehouse, active: boolean) => {
    setWarehousesActive.mutate(
      { ids: [w.id], active },
      {
        onSuccess: () => message.success(active ? t('admin.inventory.enabled', 'Đã bật {{name}}', { name: w.name }) : t('admin.inventory.disabled', 'Đã tắt {{name}}', { name: w.name })),
        onError: (e) => message.error(e.message),
      }
    );
  };

  /** "Xóa" kho = tắt (không xóa thật: tồn kho và lịch sử nhập xuất vẫn tham chiếu) */
  const setActive = (ids: number[], active: boolean, verb = active ? t('admin.common.enabled', 'bật') : t('admin.common.disabled', 'tắt')) => {
    setWarehousesActive.mutate(
      { ids, active },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.inventory.warehouses2', 'Đã {{verb}} {{count}} kho', { verb, count: ids.length }));
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  const columns: TableColumnsType<Warehouse> = [
    { title: t('admin.inventory.warehouseCode', 'Mã kho'), dataIndex: 'code', width: 120, render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: t('admin.inventory.warehouseName', 'Tên kho'), dataIndex: 'name' },
    { title: t('admin.inventory.address', 'Địa chỉ'), dataIndex: 'address', render: (v: string | null) => v ?? '–' },
    {
      title: t('admin.inventory.skusStored', 'Số SKU đang lưu'),
      key: 'skus',
      width: 140,
      align: 'right',
      render: (_, w) => inventories.filter((r) => r.warehouseId === w.id).length,
    },
    {
      title: t('admin.common.active', 'Hoạt động'),
      dataIndex: 'isActive',
      width: 110,
      render: (v: number, w) => (
        <Tooltip title={isAdmin ? undefined : t('admin.inventory.onlyAdministratorsCanEnableDisable', 'Chỉ quản trị viên được bật/tắt kho')}>
          <Switch size="small" checked={v === 1} disabled={!isAdmin} onChange={(c) => toggleActive(w, c)} />
        </Tooltip>
      ),
    },
    ...(isAdmin
      ? [
          {
            title: '',
            key: 'actions',
            width: 80,
            render: (_: unknown, w: Warehouse) => (
              <Flex gap={4}>
                <Tooltip title={t('admin.common.edit', 'Sửa')}>
                  <Button type="text" size="small" icon={<EditOutlined />} aria-label={t('admin.inventory.editWarehouse', 'Sửa kho')} onClick={() => openForm(w)} />
                </Tooltip>
                <RowDeleteButton
                  title={t('admin.inventory.deleteWarehouse', 'Xóa kho {{name}}?', { name: w.name })}
                  description={t('admin.inventory.disablesTheWarehouseNoNew', 'Tắt kho: không nhận phiếu nhập mới, tồn kho và lịch sử giữ nguyên.')}
                  onConfirm={() => setActive([w.id], false, t('admin.inventory.deleted', 'xóa'))}
                  disabled={!w.isActive}
                  disabledReason={t('admin.common.disabled2', 'Đã tắt')}
                />
              </Flex>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Flex justify="space-between" align="center" className="admin-filters">
        <Typography.Text type="secondary">{t('admin.inventory.disabledWarehousesAcceptNoNew', 'Kho đã tắt không nhận phiếu nhập mới nhưng vẫn giữ lịch sử.')}</Typography.Text>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            {t('admin.inventory.addWarehouse', 'Thêm kho')}
          </Button>
        )}
      </Flex>
      <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
        <Button size="small" onClick={() => setActive(selectedKeys as number[], true)}>
          {t('admin.common.enable', 'Bật')}
        </Button>
        <BulkDeleteButton
          count={selectedKeys.length}
          noun="kho"
          content={t('admin.inventory.theWarehouseWillBeDisabled', 'Kho sẽ bị tắt: không nhận phiếu nhập mới, tồn kho và lịch sử giữ nguyên, có thể bật lại.')}
          onConfirm={() => setActive(selectedKeys as number[], false, t('admin.inventory.deleted', 'xóa'))}
        />
      </BulkActionBar>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={warehouses}
        loading={isLoading}
        pagination={false}
        rowSelection={isAdmin ? { selectedRowKeys: selectedKeys, onChange: setSelectedKeys } : undefined}
        rowClassName={(w) => (w.isActive ? '' : 'admin-row-muted')}
      />

      <Modal
        centered
        open={editing !== null}
        title={editing === 'new' ? t('admin.inventory.addWarehouse', 'Thêm kho') : t('admin.inventory.editWarehouse', 'Sửa kho')}
        okText={t('admin.common.save', 'Lưu')}
        cancelText={t('admin.common.cancel', 'Hủy')}
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="code"
                label={t('admin.inventory.warehouseCode', 'Mã kho')}
                normalize={(v: string) => v?.toUpperCase()}
                rules={[
                  { required: true, message: t('admin.inventory.enterTheWarehouseCode', 'Nhập mã kho') },
                  { max: 20, message: t('admin.inventory.atMost20Characters', 'Tối đa 20 ký tự') },
                ]}
              >
                <Input disabled={editing !== 'new'} className="admin-mono" placeholder="vd HCM-02" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item name="name" label={t('admin.inventory.warehouseName', 'Tên kho')} rules={[{ required: true, whitespace: true, message: t('admin.inventory.enterTheWarehouseName', 'Nhập tên kho') }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label={t('admin.inventory.address', 'Địa chỉ')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
