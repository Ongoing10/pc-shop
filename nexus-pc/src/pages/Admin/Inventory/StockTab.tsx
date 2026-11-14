import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  App,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  HistoryOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import { useAdminSession } from '../../../context/AdminSessionContext';
import {
  useAdjustStock,
  useAdminInventory,
  useAdminProducts,
  useAdminWarehouses,
  useImportStock,
} from '../../../hooks/admin/useAdminApi';
import { adminInventoryService } from '../../../services/api/admin/adminInventoryService';
import { saveDownloadedFile } from '../../../utils/download';
import { Inventory } from '../../../types/admin';
import { availableQty } from '../../../utils/adminStatus';

interface ImportFormValues {
  warehouseId: number;
  referenceCode?: string;
  note?: string;
  lines: Array<{ sku: string; quantity: number }>;
}

interface AdjustFormValues {
  delta: number;
  note: string;
}

export const StockTab: React.FC<{ onShowHistory: (sku: string) => void }> = ({ onShowHistory }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const { can } = useAdminSession();
  const canWrite = can('inventory:write');
  const { data: inventories = [], isLoading } = useAdminInventory();
  const { data: warehouses = [] } = useAdminWarehouses();
  const { data: products = [] } = useAdminProducts();
  const importStock = useImportStock();
  const adjustStock = useAdjustStock();

  const [warehouseId, setWarehouseId] = useState<number>();
  const [lowStock, setLowStock] = useState(params.get('lowStock') === '1');
  const [q, setQ] = useState(params.get('sku') ?? '');
  const [importOpen, setImportOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<Inventory | null>(null);
  const [saving, setSaving] = useState(false);
  const [importForm] = Form.useForm<ImportFormValues>();
  const [adjustForm] = Form.useForm<AdjustFormValues>();

  const productName = (sku: string) => products.find((p) => p.sku === sku)?.name ?? '(chưa có trong catalog)';
  const warehouseName = (id: number) => warehouses.find((w) => w.id === id)?.name ?? `#${id}`;

  // Tên sản phẩm ghép từ danh sách sản phẩm (inventory-service chỉ trả SKU)
  const data = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return inventories
      .filter((r) => !warehouseId || r.warehouseId === warehouseId)
      .filter((r) => !lowStock || availableQty(r) <= r.minQuantity)
      .filter(
        (r) => !keyword || r.sku.toLowerCase().includes(keyword) || productName(r.sku).toLowerCase().includes(keyword)
      );
  }, [inventories, warehouseId, lowStock, q, products]);

  const submitImport = async () => {
    const v = await importForm.validateFields();
    setSaving(true);
    try {
      await importStock.mutateAsync({
        warehouseId: v.warehouseId,
        referenceCode: v.referenceCode || null,
        note: v.note || null,
        lines: v.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
      });
      setImportOpen(false);
      message.success(`Đã nhập ${v.lines.length} dòng vào ${warehouseName(v.warehouseId)}`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    const v = await adjustForm.validateFields();
    const after = adjusting.quantity + v.delta;
    if (after < adjusting.reservedQuantity) {
      adjustForm.setFields([{ name: 'delta', errors: [`Không được thấp hơn số đang giữ cho đơn (${adjusting.reservedQuantity})`] }]);
      return;
    }
    setSaving(true);
    try {
      await adjustStock.mutateAsync({ sku: adjusting.sku, warehouseId: adjusting.warehouseId, delta: v.delta, note: v.note });
      setAdjusting(null);
      message.success(`Đã điều chỉnh ${adjusting.sku}: ${v.delta > 0 ? '+' : ''}${v.delta}`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<Inventory> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'sku',
      render: (sku: string) => (
        <div>
          <div className="admin-cell-title">{productName(sku)}</div>
          <Typography.Text type="secondary" className="admin-mono">
            {sku}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Kho', dataIndex: 'warehouseId', width: 150, render: warehouseName },
    { title: 'Tồn thực tế', dataIndex: 'quantity', width: 110, align: 'right' },
    { title: 'Đang giữ', dataIndex: 'reservedQuantity', width: 100, align: 'right' },
    {
      title: 'Có thể bán',
      key: 'available',
      width: 110,
      align: 'right',
      sorter: (a, b) => availableQty(a) - availableQty(b),
      render: (_, r) => {
        const v = availableQty(r);
        // đỏ khi ≤ 0, hổ phách khi ≤ ngưỡng
        const color = v <= 0 ? 'red' : v <= r.minQuantity ? 'gold' : undefined;
        return color ? (
          <Tag color={color} style={{ marginInlineEnd: 0 }}>
            {v}
          </Tag>
        ) : (
          <b>{v}</b>
        );
      },
    },
    { title: 'Ngưỡng', dataIndex: 'minQuantity', width: 80, align: 'right' },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_, r) => (
        <Flex gap={4}>
          {canWrite && (
            <Tooltip title="Điều chỉnh tồn">
              <Button
                type="text"
                size="small"
                icon={<SlidersOutlined />}
                aria-label="Điều chỉnh tồn"
                onClick={() => {
                  adjustForm.resetFields();
                  setAdjusting(r);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Lịch sử biến động">
            <Button type="text" size="small" icon={<HistoryOutlined />} aria-label="Lịch sử" onClick={() => onShowHistory(r.sku)} />
          </Tooltip>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Flex gap={12} wrap justify="space-between" className="admin-filters">
        <Flex gap={12} wrap align="center">
          <Input.Search
            allowClear
            placeholder="SKU hoặc tên sản phẩm"
            defaultValue={q}
            style={{ width: 260 }}
            onSearch={setQ}
            onChange={(e) => !e.target.value && setQ('')}
          />
          <Select
            allowClear
            placeholder="Tất cả kho"
            style={{ width: 180 }}
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          />
          <Space>
            <Switch checked={lowStock} onChange={setLowStock} />
            <Typography.Text>Chỉ hàng sắp hết</Typography.Text>
          </Space>
        </Flex>
        <Flex gap={8} wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                saveDownloadedFile(await adminInventoryService.exportInventory({ warehouseId, lowStock: lowStock || undefined }), 'ton-kho.xlsx');
              } catch (e) {
                message.error((e as Error).message);
              }
            }}
          >
            Xuất Excel
          </Button>
          {canWrite && (
            <>
              <Button icon={<FileExcelOutlined />} onClick={() => navigate('/admin/inventory/import')}>
                Nhập từ Excel
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  importForm.resetFields();
                  setImportOpen(true);
                }}
              >
                Tạo phiếu nhập
              </Button>
            </>
          )}
        </Flex>
      </Flex>

      <Table
        rowKey="id"
        sticky
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} dòng` }}
      />

      <Modal
        open={importOpen}
        title="Phiếu nhập kho"
        width={720}
        okText="Nhập kho"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={submitImport}
        onCancel={() => setImportOpen(false)}
        destroyOnHidden
      >
        <Form form={importForm} layout="vertical" initialValues={{ lines: [{}] }}>
          <Flex gap={12}>
            <Form.Item name="warehouseId" label="Kho nhập" rules={[{ required: true, message: 'Chọn kho' }]} style={{ flex: 1 }}>
              <Select options={warehouses.filter((w) => w.isActive).map((w) => ({ value: w.id, label: w.name }))} />
            </Form.Item>
            <Form.Item name="referenceCode" label="Số phiếu" style={{ flex: 1 }}>
              <Input placeholder="vd PN-20261107-01" />
            </Form.Item>
          </Flex>
          <Form.List
            name="lines"
            rules={[
              {
                validator: async (_, lines?: Array<{ sku?: string }>) => {
                  if (!lines?.length) throw new Error('Phiếu cần ít nhất một dòng');
                  if (lines.length > 200) throw new Error('Tối đa 200 dòng mỗi phiếu');
                  const skus = lines.map((l) => l?.sku).filter(Boolean);
                  if (new Set(skus).size !== skus.length) throw new Error('Có SKU bị lặp, hãy gộp số lượng');
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Flex key={key} gap={8} align="baseline">
                    <Form.Item name={[name, 'sku']} rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ flex: 1 }}>
                      <Select
                        showSearch
                        placeholder="Chọn sản phẩm"
                        optionFilterProp="label"
                        options={products.map((p) => ({ value: p.sku, label: `${p.sku} · ${p.name}` }))}
                      />
                    </Form.Item>
                    <Form.Item name={[name, 'quantity']} rules={[{ required: true, message: 'Nhập SL' }]}>
                      <InputNumber min={1} placeholder="SL" style={{ width: 110 }} />
                    </Form.Item>
                    <Button
                      type="text"
                      icon={<MinusCircleOutlined />}
                      aria-label="Xóa dòng"
                      disabled={fields.length === 1}
                      onClick={() => remove(name)}
                    />
                  </Flex>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Thêm dòng
                </Button>
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>
          <Form.Item name="note" label="Ghi chú" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!adjusting}
        title={adjusting ? `Điều chỉnh tồn ${adjusting.sku}` : ''}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={submitAdjust}
        onCancel={() => setAdjusting(null)}
        destroyOnHidden
      >
        {adjusting && (
          <Typography.Paragraph type="secondary">
            {warehouseName(adjusting.warehouseId)} · tồn hiện tại <b>{adjusting.quantity}</b>, đang giữ cho đơn{' '}
            <b>{adjusting.reservedQuantity}</b>
          </Typography.Paragraph>
        )}
        <Form form={adjustForm} layout="vertical">
          <Form.Item
            name="delta"
            label="Tăng / giảm"
            extra="Số dương để tăng, số âm để giảm (vd kiểm kê thiếu)"
            rules={[
              { required: true, message: 'Nhập số lượng thay đổi' },
              { validator: (_, v) => (v === 0 ? Promise.reject(new Error('Phải khác 0')) : Promise.resolve()) },
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Nhập lý do điều chỉnh' }]}>
            <Input.TextArea rows={2} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
