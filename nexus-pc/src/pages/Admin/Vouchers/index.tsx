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
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminToolbar } from '../../../components/admin/AdminToolbar';
import { BulkDeleteButton, RowDeleteButton } from '../../../components/admin/DeleteActions';
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
import { t } from '../../../i18n/t';

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
  v.type === 1 ? t('admin.vouchers.off', 'Giảm {{value}}%', { value: v.value }) : v.type === 2 ? t('admin.vouchers.off2', 'Giảm {{amount}}', { amount: formatCurrency(v.value) }) : t('admin.common.freeShipping', 'Miễn phí vận chuyển');

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
          message.success(t('admin.vouchers.vouchers', 'Đã {{value}} {{count}} voucher', { value: active ? t('admin.common.enabled', 'bật') : t('admin.common.disabled', 'tắt'), count: ids.length }));
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  /** "Xóa" = tắt voucher (không xóa thật: đơn cũ vẫn tham chiếu mã) */
  const remove = (ids: number[]) => {
    setVouchersActive.mutate(
      { ids, active: false },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.vouchers.deletedVouchers', 'Đã xóa {{count}} voucher', { count: ids.length }));
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
        message.success(t('admin.vouchers.createdVoucher', 'Đã tạo voucher {{code}}', { code: created.code }));
      } else if (editing) {
        // version chống ghi đè: lệch → 409 "Voucher đã bị người khác thay đổi"
        await updateVoucher.mutateAsync({ id: editing.id, body: { ...body, version: editing.version } });
        message.success(t('admin.vouchers.voucherSaved', 'Đã lưu voucher'));
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 && editing === 'new') form.setFields([{ name: 'code', errors: [t('admin.vouchers.voucherCodeAlreadyExists', 'Mã voucher đã tồn tại')] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminVoucher> = [
    {
      title: t('admin.common.code', 'Mã'),
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
      title: t('admin.vouchers.nameOffer', 'Tên & ưu đãi'),
      dataIndex: 'name',
      render: (name: string, v) => (
        <div>
          <div className="admin-cell-title">{name}</div>
          <Typography.Text type="secondary">
            {voucherValueText(v)}
            {v.maxDiscountAmount ? t('admin.vouchers.upTo', ', tối đa {{amount}}', { amount: formatCurrency(v.maxDiscountAmount) }) : ''}
            {v.minOrderAmount ? t('admin.vouchers.ordersFrom', ' · đơn từ {{amount}}', { amount: formatCurrency(v.minOrderAmount) }) : ''}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t('admin.common.apply', 'Áp dụng'),
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
          <Typography.Text type="secondary">{t('admin.common.allCategories', 'Mọi danh mục')}</Typography.Text>
        ),
    },
    {
      title: t('admin.vouchers.used', 'Đã dùng'),
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
          <Typography.Text>{v.usedCount ?? 0} {t('admin.vouchers.usesUnlimited', 'lượt · không giới hạn')}</Typography.Text>
        ),
    },
    {
      title: t('admin.common.time', 'Thời gian'),
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
                : t('admin.vouchers.noExpiry', 'Không thời hạn')}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: t('admin.common.enable', 'Bật'),
      dataIndex: 'isActive',
      width: 70,
      render: (a: number, v) => <Switch size="small" checked={a === 1} onChange={(c) => setActive([v.id], c)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, v) => (
        <Flex gap={4}>
          <Tooltip title={t('admin.common.edit', 'Sửa')}>
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={t('admin.common.edit', 'Sửa')} onClick={() => openForm(v)} />
          </Tooltip>
          <RowDeleteButton
            title={t('admin.vouchers.deleteVoucher', 'Xóa voucher {{code}}?', { code: v.code })}
            description={t('admin.vouchers.disablesTheVoucherPastOrders', 'Tắt voucher, đơn cũ giữ nguyên, có thể bật lại.')}
            onConfirm={() => remove([v.id])}
            disabled={!v.isActive}
            disabledReason={t('admin.common.disabled2', 'Đã tắt')}
          />
        </Flex>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Voucher"
        subtitle={t('admin.vouchers.discountCodesAppliedAtCheckout', 'Mã giảm giá áp ở bước thanh toán')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            {t('admin.vouchers.createVoucher', 'Tạo voucher')}
          </Button>
        }
      />

      <Card>
        <AdminToolbar
          filters={
            <Segmented<VoucherPhase | 'all'>
              value={phase}
              onChange={setPhase}
              options={[
                { value: 'all', label: t('admin.common.all', 'Tất cả') },
                { value: 'running', label: t('admin.common.running', 'Đang chạy') },
                { value: 'upcoming', label: t('admin.common.notStarted', 'Chưa bắt đầu') },
                { value: 'expired', label: t('admin.common.expired', 'Hết hạn') },
              ]}
            />
          }
          selectedCount={selectedKeys.length}
          totalCount={data.length}
          bulkActions={
            <>
              <Button onClick={() => setActive(selectedKeys as number[], true)}>{t('admin.common.enable', 'Bật')}</Button>
              <BulkDeleteButton
                count={selectedKeys.length}
                noun="voucher"
                content={t('admin.vouchers.theVouchersWillBeDisabled', 'Voucher sẽ bị tắt, khách không dùng được nữa; đơn cũ giữ nguyên và có thể bật lại.')}
                onConfirm={() => remove(selectedKeys as number[])}
              />
            </>
          }
        />

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
        centered
        open={editing !== null}
        title={editing === 'new' ? t('admin.vouchers.createVoucher', 'Tạo voucher') : t('admin.vouchers.editVoucher', 'Sửa voucher {{value}}', { value: editing?.code ?? '' })}
        width={680}
        okText={t('admin.common.save', 'Lưu')}
        cancelText={t('admin.common.cancel', 'Hủy')}
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" initialValues={{ type: 1, minOrderAmount: 0 }}>
          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="code"
                label={t('admin.common.code', 'Mã')}
                normalize={(v: string) => v?.toUpperCase()}
                rules={[
                  { required: true, message: t('admin.common.enterACode', 'Nhập mã') },
                  { pattern: /^[A-Za-z0-9_-]{3,50}$/, message: t('admin.vouchers.n350CharactersLettersDigits', '3–50 ký tự: chữ, số, _ hoặc -') },
                ]}
              >
                <Input disabled={editing !== 'new'} className="admin-mono" placeholder="vd TET2027" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item name="name" label={t('admin.vouchers.displayName', 'Tên hiển thị')} rules={[{ required: true, whitespace: true, message: t('admin.common.enterAName', 'Nhập tên') }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="type" label={t('admin.vouchers.offerType', 'Loại ưu đãi')}>
                <Radio.Group
                  optionType="button"
                  options={([1, 2, 3] as VoucherType[]).map((n) => ({ value: n, label: VOUCHER_TYPE_LABEL[n] }))}
                />
              </Form.Item>
            </Col>
            {type !== 3 && (
              <Col xs={24} sm={12}>
                <Form.Item
                  name="value"
                  label={type === 1 ? t('admin.vouchers.discountPercentage', 'Phần trăm giảm') : t('admin.vouchers.discountAmount', 'Số tiền giảm')}
                  rules={[
                    { required: true, message: t('admin.vouchers.enterTheDiscount', 'Nhập mức giảm') },
                    { type: 'number', min: 1, max: type === 1 ? 100 : undefined, message: type === 1 ? '1–100%' : t('admin.vouchers.mustBeGreaterThan0', 'Phải lớn hơn 0') },
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
              <Col xs={24} sm={12}>
                <Form.Item name="maxDiscountAmount" label={t('admin.vouchers.maximumDiscount', 'Giảm tối đa')}>
                  <InputNumber suffix="₫" step={50000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12}>
              <Form.Item name="minOrderAmount" label={t('admin.vouchers.minimumOrder', 'Đơn tối thiểu')}>
                <InputNumber suffix="₫" min={0} step={100000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="applicableCategories" label={t('admin.vouchers.applicableCategories', 'Danh mục áp dụng')} extra={t('admin.vouchers.emptyAllCategories', 'Để trống = mọi danh mục')}>
                <Select mode="multiple" allowClear options={categories.map((c) => ({ value: c.code, label: c.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="usageLimit" label={t('admin.vouchers.totalUses', 'Tổng lượt dùng')} extra={t('admin.vouchers.emptyUnlimited', 'Để trống = không giới hạn')}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="perUserLimit" label={t('admin.vouchers.usesPerCustomer', 'Lượt mỗi khách')}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="period" label={t('admin.vouchers.validityPeriod', 'Thời gian hiệu lực')} extra={t('admin.vouchers.vietnamTimeEmptyNoExpiry', 'Giờ Việt Nam. Để trống = không thời hạn')}>
                <RangePicker showTime format="DD/MM/YYYY HH:mm" allowEmpty={[true, true]} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
