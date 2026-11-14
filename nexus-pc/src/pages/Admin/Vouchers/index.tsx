import React, { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Row,
  Segmented,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import {
  useAdminCategories,
  useAdminVouchers,
  useCreateVoucher,
  useSetVouchersActive,
  useUpdateVoucher,
} from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { AdminVoucher, VoucherType } from '../../../types/admin';
import { VOUCHER_PHASE_META, VOUCHER_TYPE_LABEL, VoucherPhase, voucherPhase } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDate } from '../../../utils/orderStatus';

const { RangePicker } = DatePicker;

interface VoucherFormValues {
  code: string;
  name: string;
  type: VoucherType;
  value?: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  applicableCategories?: string[];
  usageLimit?: number | null;
  perUserLimit?: number | null;
  period?: [Dayjs | null, Dayjs | null] | null;
}

const moneyFormatter = (v: number | string | undefined) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const moneyParser = (v: string | undefined) => Number((v ?? '').replace(/\./g, ''));
/** Giờ VN, không múi giờ: "2026-11-01T00:00:00" */
const toLocalDateTime = (d?: Dayjs | null) => (d ? d.format('YYYY-MM-DDTHH:mm:ss') : null);

const voucherValueText = (v: AdminVoucher) =>
  v.type === 1 ? `Giảm ${v.value}%` : v.type === 2 ? `Giảm ${formatCurrency(v.value)}` : 'Miễn phí vận chuyển';

/** A08: quản lý voucher (chỉ ADMIN) */
export const VouchersPage: React.FC = () => {
  const { message } = App.useApp();
  const { data: vouchers = [], isLoading } = useAdminVouchers();
  const { data: categories = [] } = useAdminCategories();
  const createVoucher = useCreateVoucher();
  const updateVoucher = useUpdateVoucher();
  const setVouchersActive = useSetVouchersActive();
  const [phase, setPhase] = useState<VoucherPhase | 'all'>('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [editing, setEditing] = useState<AdminVoucher | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<VoucherFormValues>();
  const type = Form.useWatch('type', form);

  const data = useMemo(
    () => vouchers.filter((v) => phase === 'all' || voucherPhase(v) === phase).sort((a, b) => b.id - a.id),
    [vouchers, phase]
  );

  const openForm = (v: AdminVoucher | 'new') => {
    form.resetFields();
    if (v !== 'new') {
      form.setFieldsValue({
        ...v,
        period: v.startAt || v.endAt ? [v.startAt ? dayjs(v.startAt) : null, v.endAt ? dayjs(v.endAt) : null] : null,
      });
    }
    setEditing(v);
  };

  const setActive = (ids: number[], active: boolean) => {
    setVouchersActive.mutate(
      { ids, active },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(`Đã ${active ? 'bật' : 'tắt'} ${ids.length} voucher`);
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    const body = {
      name: v.name.trim(),
      type: v.type,
      value: v.type === 3 ? 0 : v.value ?? 0,
      maxDiscountAmount: v.type === 1 ? v.maxDiscountAmount ?? null : null,
      minOrderAmount: v.minOrderAmount ?? 0,
      applicableCategories: v.applicableCategories ?? [],
      usageLimit: v.usageLimit ?? null,
      perUserLimit: v.perUserLimit ?? null,
      startAt: toLocalDateTime(v.period?.[0]),
      endAt: toLocalDateTime(v.period?.[1]),
    };
    try {
      if (editing === 'new') {
        const created = await createVoucher.mutateAsync({ ...body, code: v.code.trim() });
        message.success(`Đã tạo voucher ${created.code}`);
      } else if (editing) {
        // version chống ghi đè: lệch → 409 "Voucher đã bị người khác thay đổi"
        await updateVoucher.mutateAsync({ id: editing.id, body: { ...body, version: editing.version } });
        message.success('Đã lưu voucher');
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 && editing === 'new') form.setFields([{ name: 'code', errors: ['Mã voucher đã tồn tại'] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminVoucher> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 150,
      render: (code: string, v) => (
        <div>
          <Tag className="admin-mono" style={{ marginInlineEnd: 0 }}>
            {code}
          </Tag>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
            {VOUCHER_TYPE_LABEL[v.type]}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Tên & ưu đãi',
      dataIndex: 'name',
      render: (name: string, v) => (
        <div>
          <div className="admin-cell-title">{name}</div>
          <Typography.Text type="secondary">
            {voucherValueText(v)}
            {v.maxDiscountAmount ? `, tối đa ${formatCurrency(v.maxDiscountAmount)}` : ''}
            {v.minOrderAmount ? ` · đơn từ ${formatCurrency(v.minOrderAmount)}` : ''}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Áp dụng',
      dataIndex: 'applicableCategories',
      width: 170,
      render: (codes: string[]) =>
        codes.length ? (
          <Flex gap={4} wrap>
            {codes.map((c) => (
              <Tag key={c} bordered={false}>
                {categories.find((x) => x.code === c)?.name ?? c}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">Mọi danh mục</Typography.Text>
        ),
    },
    {
      title: 'Đã dùng',
      key: 'usage',
      width: 160,
      render: (_, v) =>
        v.usageLimit ? (
          <div>
            <Typography.Text style={{ fontSize: 12 }}>
              {v.usedCount ?? 0} / {v.usageLimit}
            </Typography.Text>
            <Progress
              percent={Math.round(((v.usedCount ?? 0) / v.usageLimit) * 100)}
              size="small"
              showInfo={false}
              status={(v.usedCount ?? 0) >= v.usageLimit ? 'exception' : 'normal'}
            />
          </div>
        ) : (
          <Typography.Text>{v.usedCount ?? 0} lượt · không giới hạn</Typography.Text>
        ),
    },
    {
      title: 'Thời gian',
      key: 'period',
      width: 190,
      render: (_, v) => {
        const p = voucherPhase(v);
        return (
          <div>
            <Tag color={VOUCHER_PHASE_META[p].color}>{VOUCHER_PHASE_META[p].label}</Tag>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
              {v.startAt || v.endAt
                ? `${v.startAt ? formatDate(v.startAt) : '…'} → ${v.endAt ? formatDate(v.endAt) : '…'}`
                : 'Không thời hạn'}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: 'Bật',
      dataIndex: 'isActive',
      width: 70,
      render: (a: number, v) => <Switch size="small" checked={a === 1} onChange={(c) => setActive([v.id], c)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      render: (_, v) => <Button type="text" size="small" icon={<EditOutlined />} aria-label="Sửa" onClick={() => openForm(v)} />,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Voucher"
        subtitle="Mã giảm giá áp ở bước thanh toán"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            Tạo voucher
          </Button>
        }
      />

      <Card>
        <Flex className="admin-filters">
          <Segmented<VoucherPhase | 'all'>
            value={phase}
            onChange={setPhase}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'running', label: 'Đang chạy' },
              { value: 'upcoming', label: 'Chưa bắt đầu' },
              { value: 'expired', label: 'Hết hạn' },
            ]}
          />
        </Flex>

        <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
          <Button size="small" onClick={() => setActive(selectedKeys as number[], true)}>
            Bật
          </Button>
          <Button size="small" danger onClick={() => setActive(selectedKeys as number[], false)}>
            Tắt
          </Button>
        </BulkActionBar>

        <Table
          rowKey="id"
          scroll={{ x: 1100 }}
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          rowClassName={(v) => (v.isActive ? '' : 'admin-row-muted')}
          pagination={false}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Tạo voucher' : `Sửa voucher ${editing?.code ?? ''}`}
        width={680}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" initialValues={{ type: 1, minOrderAmount: 0 }}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="code"
                label="Mã"
                normalize={(v: string) => v?.toUpperCase()}
                rules={[
                  { required: true, message: 'Nhập mã' },
                  { pattern: /^[A-Za-z0-9_-]{3,50}$/, message: '3–50 ký tự: chữ, số, _ hoặc -' },
                ]}
              >
                <Input disabled={editing !== 'new'} className="admin-mono" placeholder="vd TET2027" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, whitespace: true, message: 'Nhập tên' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="type" label="Loại ưu đãi">
                <Radio.Group
                  optionType="button"
                  options={([1, 2, 3] as VoucherType[]).map((t) => ({ value: t, label: VOUCHER_TYPE_LABEL[t] }))}
                />
              </Form.Item>
            </Col>
            {type !== 3 && (
              <Col span={12}>
                <Form.Item
                  name="value"
                  label={type === 1 ? 'Phần trăm giảm' : 'Số tiền giảm'}
                  rules={[
                    { required: true, message: 'Nhập mức giảm' },
                    { type: 'number', min: 1, max: type === 1 ? 100 : undefined, message: type === 1 ? '1–100%' : 'Phải lớn hơn 0' },
                  ]}
                >
                  {type === 1 ? (
                    <InputNumber suffix="%" style={{ width: '100%' }} />
                  ) : (
                    <InputNumber suffix="₫" step={50000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                  )}
                </Form.Item>
              </Col>
            )}
            {type === 1 && (
              <Col span={12}>
                <Form.Item name="maxDiscountAmount" label="Giảm tối đa">
                  <InputNumber suffix="₫" step={50000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="minOrderAmount" label="Đơn tối thiểu">
                <InputNumber suffix="₫" min={0} step={100000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="applicableCategories" label="Danh mục áp dụng" extra="Để trống = mọi danh mục">
                <Select mode="multiple" allowClear options={categories.map((c) => ({ value: c.code, label: c.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="usageLimit" label="Tổng lượt dùng" extra="Để trống = không giới hạn">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="perUserLimit" label="Lượt mỗi khách">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="period" label="Thời gian hiệu lực" extra="Giờ Việt Nam. Để trống = không thời hạn">
                <RangePicker showTime format="DD/MM/YYYY HH:mm" allowEmpty={[true, true]} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
