import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, App, Button, Card, Input, Modal, Segmented, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useAdminRefunds } from '../../../hooks/admin/useAdminApi';
import { useAdminSession } from '../../../context/AdminSessionContext';
import { AdminRefund, RefundStatus } from '../../../types/admin';
import { PAYMENT_METHOD_LABEL, REFUND_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { formatDateTime } from '../../../utils/orderStatus';
import { useOrderActions } from '../Orders/useOrderActions';
import { t } from '../../../i18n/t';

type Filter = 'all' | RefundStatus;

/**
 * Yêu cầu hoàn tiền (tự tạo khi hủy/trả đơn đã thu tiền hoặc tiền về sau khi đơn đã hủy).
 * Hệ thống chưa gọi API hoàn tiền của cổng: nhân viên hoàn trên trang quản trị VNPay / MoMo (hoặc trả tiền mặt với COD)
 * rồi bấm "Đã hoàn". Xem: STAFF/ADMIN; đánh dấu: permission order:update-status.
 */
export const RefundsPage: React.FC = () => {
  const { message } = App.useApp();
  const { can } = useAdminSession();
  const { data: refunds = [], isLoading } = useAdminRefunds();
  const { completeRefund } = useOrderActions();
  const [filter, setFilter] = useState<Filter>(1);
  const [target, setTarget] = useState<AdminRefund | null>(null);
  const [providerRefundId, setProviderRefundId] = useState('');
  const [saving, setSaving] = useState(false);

  const data = useMemo(
    () => (filter === 'all' ? refunds : refunds.filter((r) => r.status === filter)).slice().sort((a, b) => b.id - a.id),
    [refunds, filter]
  );
  const pendingCount = refunds.filter((r) => r.status === 1).length;
  const pendingAmount = refunds.filter((r) => r.status === 1).reduce((s, r) => s + r.amount, 0);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await completeRefund(target, providerRefundId.trim() || null);
      message.success(t('admin.refunds.recordedARefundOfFor', 'Đã ghi nhận hoàn {{amount}} cho đơn {{orderCode}}', { amount: formatCurrency(target.amount), orderCode: target.orderCode }));
      setTarget(null);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminRefund> = [
    {
      title: t('admin.common.orders', 'Đơn hàng'),
      dataIndex: 'orderCode',
      render: (code: string) => <Link to={`/admin/orders/${code}`}>{code}</Link>,
    },
    {
      title: t('admin.refunds.paymentAttempt', 'Lần thanh toán'),
      dataIndex: 'paymentCode',
      render: (code: string, r) => (
        <>
          <div className="admin-mono">{code}</div>
          <Typography.Text type="secondary">{PAYMENT_METHOD_LABEL[r.method]}</Typography.Text>
        </>
      ),
    },
    { title: t('admin.common.amount', 'Số tiền'), dataIndex: 'amount', align: 'right', width: 140, render: (v: number) => <b>{formatCurrency(v)}</b> },
    { title: t('admin.common.reason', 'Lý do'), dataIndex: 'reason', render: (v: string | null) => v ?? '–' },
    {
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'status',
      width: 120,
      render: (st: RefundStatus, r) => (
        <>
          <Tag color={REFUND_STATUS_META[st].color}>{REFUND_STATUS_META[st].label}</Tag>
          {r.providerRefundId && <div className="admin-mono">{r.providerRefundId}</div>}
        </>
      ),
    },
    { title: t('admin.refunds.createdAt', 'Tạo lúc'), dataIndex: 'createdAt', width: 150, render: (v: string) => formatDateTime(v) },
    {
      title: '',
      key: 'action',
      width: 110,
      render: (_: unknown, r) =>
        r.status === 1 && can('order:update-status') ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setProviderRefundId('');
              setTarget(r);
            }}
          >
            {t('admin.common.refunded', 'Đã hoàn')}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <AdminPageHeader title={t('admin.common.refunds', 'Hoàn tiền')} subtitle={t('admin.refunds.refundRequestsAreCreatedAutomatically', 'Yêu cầu hoàn tiền tự sinh khi hủy / trả đơn đã thu tiền')} />

      {pendingCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={t('admin.refunds.requestsAwaitingRefundTotal', '{{pendingCount}} yêu cầu chờ hoàn, tổng {{amount}}', { pendingCount, amount: formatCurrency(pendingAmount) })}
          description={t('admin.refunds.refundInThePaymentGateway', 'Hoàn trên trang quản trị của cổng thanh toán (hoặc trả tiền mặt với COD), sau đó bấm Đã hoàn để đóng yêu cầu.')}
        />
      )}

      <Card>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          style={{ marginBottom: 16 }}
          options={[
            { value: 1, label: t('admin.refunds.awaitingRefund', 'Chờ hoàn ({{pendingCount}})', { pendingCount }) },
            { value: 2, label: t('admin.common.refunded', 'Đã hoàn') },
            { value: 'all', label: t('admin.common.all', 'Tất cả') },
          ]}
        />
        <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20, hideOnSinglePage: true }} />
      </Card>

      <Modal
        centered
        open={Boolean(target)}
        title={target ? t('admin.refunds.confirmRefundForOrder', 'Xác nhận đã hoàn tiền đơn {{orderCode}}', { orderCode: target.orderCode }) : ''}
        onCancel={() => setTarget(null)}
        onOk={submit}
        okText={t('admin.common.refunded', 'Đã hoàn')}
        confirmLoading={saving}
      >
        {target && (
          <>
            <p>
              {t('admin.common.refund', 'Hoàn')} <b>{formatCurrency(target.amount)}</b> {t('admin.refunds.forPayment', 'cho lần thanh toán')}{' '}
              <span className="admin-mono">{target.paymentCode}</span> ({PAYMENT_METHOD_LABEL[target.method]}).
            </p>
            <label>
              {t('admin.refunds.gatewayRefundReferenceOptional', 'Mã hoàn tiền phía cổng thanh toán (không bắt buộc)')}
              <Input
                value={providerRefundId}
                maxLength={100}
                onChange={(e) => setProviderRefundId(e.target.value)}
                placeholder={t('admin.refunds.eGTheRefundTransaction', 'Ví dụ mã giao dịch hoàn trên trang VNPay')}
                style={{ marginTop: 6 }}
              />
            </label>
          </>
        )}
      </Modal>
    </>
  );
};
