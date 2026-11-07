import React, { useState } from 'react';
import { App, Button, Flex, Form, Input, Modal, Switch, Table, Tooltip, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { fakeLatency, useAdminData } from '../../../context/AdminDataContext';
import { useAdminSession } from '../../../context/AdminSessionContext';
import { Warehouse } from '../../../types/admin';

interface WarehouseFormValues {
  code: string;
  name: string;
  address?: string;
}

export const WarehousesTab: React.FC = () => {
  const { message } = App.useApp();
  const { hasRole } = useAdminSession();
  const isAdmin = hasRole('ADMIN');
  const {
    warehouses: [warehouses, setWarehouses],
    inventories: [inventories],
  } = useAdminData();
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
    await fakeLatency();
    if (editing === 'new') {
      // TODO ghép API: POST /admin/warehouses
      if (warehouses.some((w) => w.code === v.code)) {
        setSaving(false);
        form.setFields([{ name: 'code', errors: ['Mã kho đã tồn tại (409)'] }]);
        return;
      }
      setWarehouses((prev) => [...prev, { id: Math.max(0, ...prev.map((w) => w.id)) + 1, code: v.code, name: v.name, address: v.address ?? null, isActive: 1 }]);
      message.success(`Đã thêm kho ${v.name}`);
    } else if (editing) {
      // TODO ghép API: PUT /admin/warehouses/{id}
      setWarehouses((prev) => prev.map((w) => (w.id === editing.id ? { ...w, name: v.name, address: v.address ?? null } : w)));
      message.success('Đã lưu kho');
    }
    setSaving(false);
    setEditing(null);
  };

  const toggleActive = (w: Warehouse, active: boolean) => {
    // TODO ghép API: PATCH /admin/warehouses/{id}/active {isActive}
    setWarehouses((prev) => prev.map((x) => (x.id === w.id ? { ...x, isActive: active ? 1 : 0 } : x)));
    message.success(active ? `Đã bật ${w.name}` : `Đã tắt ${w.name}`);
  };

  const columns: TableColumnsType<Warehouse> = [
    { title: 'Mã kho', dataIndex: 'code', width: 120, render: (v: string) => <span className="admin-mono">{v}</span> },
    { title: 'Tên kho', dataIndex: 'name' },
    { title: 'Địa chỉ', dataIndex: 'address', render: (v: string | null) => v ?? '–' },
    {
      title: 'Số SKU đang lưu',
      key: 'skus',
      width: 140,
      align: 'right',
      render: (_, w) => inventories.filter((r) => r.warehouseId === w.id).length,
    },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      width: 110,
      render: (v: number, w) => (
        <Tooltip title={isAdmin ? undefined : 'Chỉ quản trị viên được bật/tắt kho'}>
          <Switch size="small" checked={v === 1} disabled={!isAdmin} onChange={(c) => toggleActive(w, c)} />
        </Tooltip>
      ),
    },
    ...(isAdmin
      ? [
          {
            title: '',
            key: 'actions',
            width: 56,
            render: (_: unknown, w: Warehouse) => (
              <Button type="text" size="small" icon={<EditOutlined />} aria-label="Sửa kho" onClick={() => openForm(w)} />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Flex justify="space-between" align="center" className="admin-filters">
        <Typography.Text type="secondary">Kho đã tắt không nhận phiếu nhập mới nhưng vẫn giữ lịch sử.</Typography.Text>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            Thêm kho
          </Button>
        )}
      </Flex>
      <Table rowKey="id" columns={columns} dataSource={warehouses} pagination={false} />

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm kho' : 'Sửa kho'}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Mã kho"
            normalize={(v: string) => v?.toUpperCase()}
            rules={[
              { required: true, message: 'Nhập mã kho' },
              { max: 20, message: 'Tối đa 20 ký tự' },
            ]}
          >
            <Input disabled={editing !== 'new'} className="admin-mono" placeholder="vd HCM-02" />
          </Form.Item>
          <Form.Item name="name" label="Tên kho" rules={[{ required: true, whitespace: true, message: 'Nhập tên kho' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
