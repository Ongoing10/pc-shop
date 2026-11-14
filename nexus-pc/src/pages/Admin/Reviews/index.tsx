import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Input,
  Rate,
  Row,
  Segmented,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { CheckOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import { BulkErrorItem, bulkErrorsOf } from '../../../components/admin/bulk';
import { useAdminProducts, useAdminReviews, useModerateReviews, useReplyReview } from '../../../hooks/admin/useAdminApi';
import { AdminReview, ReviewStatus } from '../../../types/admin';
import { REVIEW_STATUS_META } from '../../../utils/adminStatus';
import { formatDateTime } from '../../../utils/orderStatus';

type StatusFilter = ReviewStatus | 'all';

/** Duyệt từ 1 hoặc 3, từ chối từ 1 hoặc 2 (giống review-service) */
const CAN_APPROVE: ReviewStatus[] = [1, 3];
const CAN_REJECT: ReviewStatus[] = [1, 2];

/** A07: hàng chờ duyệt đánh giá, trả lời khách */
export const ReviewsPage: React.FC = () => {
  const { message } = App.useApp();
  const { data: reviews = [], isLoading } = useAdminReviews();
  const { data: products = [] } = useAdminProducts();
  const moderateReviews = useModerateReviews();
  const replyReview = useReplyReview();

  const [status, setStatus] = useState<StatusFilter>(1);
  const [sku, setSku] = useState<string>();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [reply, setReply] = useState('');
  const [bulkErrors, setBulkErrors] = useState<BulkErrorItem[]>([]);
  const [busy, setBusy] = useState(false);

  const data = useMemo(
    () =>
      reviews
        .filter((r) => status === 'all' || r.status === status)
        .filter((r) => !sku || r.sku === sku)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, status, sku]
  );

  const active = reviews.find((r) => r.id === activeId);
  const productName = (s: string) => products.find((p) => p.sku === s)?.name ?? s;

  // Đổi đánh giá đang xem thì nạp lại câu trả lời cũ (nếu có)
  const activeReply = active?.adminReply?.content ?? '';
  useEffect(() => {
    setReply(activeReply);
  }, [activeId, activeReply]);

  const counts = (s: ReviewStatus) => reviews.filter((r) => r.status === s).length;

  const moderate = async (targets: AdminReview[], next: 2 | 3) => {
    setBusy(true);
    try {
      // PATCH /admin/reviews/bulk/approve|reject {ids}: "tất cả hoặc không", lỗi trả data [{id, reason}]
      await moderateReviews.mutateAsync({ ids: targets.map((r) => r.id), approve: next === 2 });
      setSelectedKeys([]);
      setBulkErrors([]);
      message.success(`Đã ${next === 2 ? 'duyệt' : 'từ chối'} ${targets.length} đánh giá`);
    } catch (e) {
      const errors = bulkErrorsOf(e);
      if (errors) setBulkErrors(errors);
      else message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!active) return;
    setBusy(true);
    try {
      // ghi đè câu trả lời cũ; backend gửi thông báo cho người viết
      await replyReview.mutateAsync({ id: active.id, content: reply.trim() });
      message.success('Đã gửi trả lời');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumnsType<AdminReview> = [
    {
      // Cột co giãn: bảng dùng tableLayout fixed nên chữ dài được cắt "..." theo bề rộng còn lại
      title: 'Đánh giá',
      key: 'review',
      render: (_, r) => (
        <div>
          <Flex gap={8} align="center" style={{ minWidth: 0 }}>
            <Rate disabled value={r.rating} className="admin-rate" />
            <Typography.Text strong ellipsis={{ tooltip: r.title }} className="admin-cell-title" style={{ minWidth: 0 }}>
              {r.title ?? '(không tiêu đề)'}
            </Typography.Text>
          </Flex>
          <Typography.Text type="secondary" ellipsis style={{ display: 'block' }}>
            {r.content}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'sku',
      width: 170,
      ellipsis: { showTitle: false },
      render: (s: string) => (
        <Typography.Text ellipsis={{ tooltip: productName(s) }}>{productName(s)}</Typography.Text>
      ),
    },
    {
      title: 'Người viết',
      dataIndex: 'userDisplayName',
      width: 140,
      // màn < 1600px bảng nằm cạnh khung chi tiết nên hẹp; người viết đã có trong khung chi tiết
      responsive: ['xxl'],
      render: (name: string, r) => (
        <div>
          <div>{name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(r.createdAt)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (s: ReviewStatus) => <Tag color={REVIEW_STATUS_META[s].color}>{REVIEW_STATUS_META[s].label}</Tag>,
    },
  ];

  return (
    <>
      <AdminPageHeader title="Duyệt đánh giá" subtitle="Đánh giá chỉ hiện trên trang sản phẩm sau khi được duyệt" />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16} xxl={15}>
          <Card>
            <Flex gap={12} wrap className="admin-filters">
              <Segmented<StatusFilter>
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setSelectedKeys([]);
                }}
                options={[
                  { value: 1, label: `Chờ duyệt (${counts(1)})` },
                  { value: 2, label: 'Đã duyệt' },
                  { value: 3, label: 'Từ chối' },
                  { value: 'all', label: 'Tất cả' },
                ]}
              />
              <Select
                allowClear
                showSearch
                placeholder="Lọc theo sản phẩm"
                optionFilterProp="label"
                style={{ width: 260 }}
                value={sku}
                onChange={setSku}
                options={products.map((p) => ({ value: p.sku, label: p.name }))}
              />
            </Flex>

            <BulkActionBar
              count={selectedKeys.length}
              onClear={() => setSelectedKeys([])}
              errors={bulkErrors}
              onCloseErrors={() => setBulkErrors([])}
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => moderate(reviews.filter((r) => selectedKeys.includes(r.id)), 2)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={busy}
                onClick={() => moderate(reviews.filter((r) => selectedKeys.includes(r.id)), 3)}
              >
                Từ chối
              </Button>
            </BulkActionBar>

            <Table
              rowKey="id"
              tableLayout="fixed"
              // màn hẹp: cuộn ngang trong Card thay vì tràn ra ngoài
              scroll={{ x: 600 }}
              columns={columns}
              dataSource={data}
              loading={isLoading}
              rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
              rowClassName={(r) => (r.id === activeId ? 'admin-row-active' : '')}
              onRow={(r) => ({ onClick: () => setActiveId(r.id), style: { cursor: 'pointer' } })}
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: (
                  <Empty description={status === 1 ? 'Không còn đánh giá chờ duyệt' : 'Không có đánh giá nào'} />
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8} xxl={9}>
          <Card title="Chi tiết đánh giá" className="admin-sticky-card">
            {!active ? (
              <Empty description="Chọn một đánh giá để xem và trả lời" />
            ) : (
              <Flex vertical gap={16}>
                <div>
                  <Rate disabled value={active.rating} />
                  <Typography.Title level={5} style={{ margin: '8px 0 4px' }}>
                    {active.title ?? '(không tiêu đề)'}
                  </Typography.Title>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{active.content}</Typography.Paragraph>
                </div>

                <Descriptions
                  size="small"
                  column={1}
                  items={[
                    { key: 'status', label: 'Trạng thái', children: <Tag color={REVIEW_STATUS_META[active.status].color}>{REVIEW_STATUS_META[active.status].label}</Tag> },
                    {
                      key: 'product',
                      label: 'Sản phẩm',
                      children: <Link to={`/admin/products/${active.sku}`}>{productName(active.sku)}</Link>,
                    },
                    { key: 'user', label: 'Người viết', children: active.userDisplayName },
                    {
                      key: 'order',
                      label: 'Đơn hàng',
                      children: active.orderCode ? <Link to={`/admin/orders/${active.orderCode}`}>{active.orderCode}</Link> : '–',
                    },
                    { key: 'helpful', label: 'Lượt hữu ích', children: active.helpfulCount },
                    { key: 'date', label: 'Ngày viết', children: formatDateTime(active.createdAt) },
                  ]}
                />

                <Flex gap={8}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    disabled={!CAN_APPROVE.includes(active.status)}
                    loading={busy}
                    onClick={() => moderate([active], 2)}
                  >
                    Duyệt
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    disabled={!CAN_REJECT.includes(active.status)}
                    loading={busy}
                    onClick={() => moderate([active], 3)}
                  >
                    Từ chối
                  </Button>
                </Flex>

                <div>
                  <Typography.Text strong>Trả lời của cửa hàng</Typography.Text>
                  {active.adminReply && (
                    <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '2px 0 8px' }}>
                      Đã trả lời lúc {formatDateTime(active.adminReply.repliedAt)}. Gửi lại sẽ ghi đè câu cũ.
                    </Typography.Paragraph>
                  )}
                  <Input.TextArea
                    rows={4}
                    maxLength={2000}
                    showCount
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Cảm ơn bạn đã đánh giá..."
                    style={{ marginTop: 8 }}
                  />
                  <Button
                    icon={<SendOutlined />}
                    disabled={!reply.trim()}
                    loading={busy}
                    onClick={sendReply}
                    style={{ marginTop: 12 }}
                  >
                    Gửi trả lời
                  </Button>
                </div>
              </Flex>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};
