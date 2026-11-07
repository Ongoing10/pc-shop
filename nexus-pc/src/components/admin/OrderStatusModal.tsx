import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, Modal, Radio, Space, Tag, Typography } from 'antd';
import { AdminOrder, OrderStatus } from '../../types/admin';
import { ORDER_STATUS_META, ORDER_STATUS_NEEDS_REASON, ORDER_TRANSITIONS } from '../../utils/adminStatus';
import type { BulkErrorItem } from './bulk';

interface OrderStatusModalProps {
  open: boolean;
  orders: AdminOrder[];
  onCancel: () => void;
  /** trả về lỗi theo đơn (rỗng = thành công, modal tự đóng) */
  onSubmit: (status: OrderStatus, reason: string | null) => Promise<BulkErrorItem[]>;
}

/** Modal đổi trạng thái: chỉ cho chọn bước hợp lệ với MỌI đơn đã chọn; 7/8 bắt buộc lý do */
export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({ open, orders, onCancel, onSubmit }) => {
  const [form] = Form.useForm<{ status: OrderStatus; reason?: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<BulkErrorItem[]>([]);
  const status = Form.useWatch('status', form);

  const allowed = useMemo(() => {
    if (!orders.length) return [];
    return ORDER_TRANSITIONS[orders[0].status].filter((s) => orders.every((o) => ORDER_TRANSITIONS[o.status].includes(s)));
  }, [orders]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setErrors([]);
    }
  }, [open, form]);

  const needsReason = status !== undefined && ORDER_STATUS_NEEDS_REASON.includes(status);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const result = await onSubmit(values.status, values.reason?.trim() || null);
      if (result.length) setErrors(result);
    } finally {
      setSubmitting(false);
    }
  };

  const single = orders.length === 1 ? orders[0] : null;

  return (
    <Modal
      open={open}
      title={single ? `Đổi trạng thái đơn ${single.code}` : `Đổi trạng thái ${orders.length} đơn hàng`}
      okText="Cập nhật"
      cancelText="Hủy"
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      okButtonProps={{ disabled: allowed.length === 0 }}
      destroyOnHidden
    >
      {single && (
        <Typography.Paragraph type="secondary">
          Trạng thái hiện tại:{' '}
          <Tag color={ORDER_STATUS_META[single.status].color}>{ORDER_STATUS_META[single.status].label}</Tag>
        </Typography.Paragraph>
      )}

      {allowed.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          title={
            single
              ? 'Đơn đã ở trạng thái cuối, không đổi được nữa.'
              : 'Các đơn đã chọn không có bước chuyển chung nào. Hãy chọn các đơn cùng trạng thái.'
          }
        />
      ) : (
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="status" label="Chuyển sang" rules={[{ required: true, message: 'Chọn trạng thái mới' }]}>
            <Radio.Group>
              <Space orientation="vertical">
                {allowed.map((s) => (
                  <Radio key={s} value={s}>
                    <Tag color={ORDER_STATUS_META[s].color}>{ORDER_STATUS_META[s].label}</Tag>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="reason"
            label={needsReason ? 'Lý do (bắt buộc)' : 'Ghi chú'}
            rules={[
              { required: needsReason, whitespace: true, message: 'Nhập lý do hủy / trả hàng' },
              { max: 255, message: 'Tối đa 255 ký tự' },
            ]}
          >
            <Input.TextArea rows={3} maxLength={255} showCount placeholder="Ghi vào lịch sử trạng thái của đơn" />
          </Form.Item>
        </Form>
      )}

      {errors.length > 0 && (
        <Alert
          type="error"
          showIcon
          title="Không cập nhật được, chưa có đơn nào bị thay đổi"
          description={
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {errors.map((e) => (
                <li key={e.id}>
                  <b>{e.id}</b>: {e.reason}
                </li>
              ))}
            </ul>
          }
        />
      )}
    </Modal>
  );
};
