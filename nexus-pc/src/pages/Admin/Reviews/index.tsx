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
import { useAdminSession } from '../../../context/AdminSessionContext';
import { ProductFormModal } from '../Products/ProductFormModal';
import { t } from '../../../i18n/t';

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
  const { can } = useAdminSession();
  const [productSku, setProductSku] = useState<string>();

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
      message.success(t('admin.reviews.reviews', 'Đã {{value}} {{count}} đánh giá', { value: next === 2 ? t('admin.reviews.approved', 'duyệt') : t('admin.reviews.rejected', 'từ chối'), count: targets.length }));
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
      message.success(t('admin.reviews.replySent', 'Đã gửi trả lời'));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumnsType<AdminReview> = [
    {
      // Cột co giãn: bảng dùng tableLayout fixed nên chữ dài được cắt "..." theo bề rộng còn lại
      title: t('admin.reviews.review', 'Đánh giá'),
      key: 'review',
      render: (_, r) => (
        <div>
          <Flex gap={8} align="center" style={{ minWidth: 0 }}>
            <Rate disabled value={r.rating} className="admin-rate" />
            <Typography.Text strong ellipsis={{ tooltip: r.title }} className="admin-cell-title" style={{ minWidth: 0 }}>
              {r.title ?? t('admin.reviews.noTitle', '(không tiêu đề)')}
            </Typography.Text>
          </Flex>
          <Typography.Text type="secondary" ellipsis style={{ display: 'block' }}>
            {r.content}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t('admin.common.products', 'Sản phẩm'),
      dataIndex: 'sku',
      width: 170,
      ellipsis: { showTitle: false },
      render: (s: string) => (
        <Typography.Text ellipsis={{ tooltip: productName(s) }}>{productName(s)}</Typography.Text>
      ),
    },
    {
      title: t('admin.reviews.author', 'Người viết'),
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
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'status',
      width: 110,
      render: (s: ReviewStatus) => <Tag color={REVIEW_STATUS_META[s].color}>{REVIEW_STATUS_META[s].label}</Tag>,
    },
  ];

  return (
    <>
      <AdminPageHeader title={t('admin.common.reviewModeration', 'Duyệt đánh giá')} subtitle={t('admin.reviews.reviewsAppearOnTheProduct', 'Đánh giá chỉ hiện trên trang sản phẩm sau khi được duyệt')} />

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
                  { value: 1, label: t('admin.reviews.pending', 'Chờ duyệt ({{value}})', { value: counts(1) }) },
                  { value: 2, label: t('admin.common.approved', 'Đã duyệt') },
                  { value: 3, label: t('admin.common.rejected', 'Từ chối') },
                  { value: 'all', label: t('admin.common.all', 'Tất cả') },
                ]}
              />
              <Select
                allowClear
                showSearch
                placeholder={t('admin.reviews.filterByProduct', 'Lọc theo sản phẩm')}
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
                {t('admin.reviews.approve', 'Duyệt')}
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={busy}
                onClick={() => moderate(reviews.filter((r) => selectedKeys.includes(r.id)), 3)}
              >
                {t('admin.common.rejected', 'Từ chối')}
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
                  <Empty description={status === 1 ? t('admin.reviews.noReviewsWaitingForApproval', 'Không còn đánh giá chờ duyệt') : t('admin.reviews.noReviews', 'Không có đánh giá nào')} />
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8} xxl={9}>
          <Card title={t('admin.reviews.reviewDetails', 'Chi tiết đánh giá')} className="admin-sticky-card">
            {!active ? (
              <Empty description={t('admin.reviews.selectAReviewToRead', 'Chọn một đánh giá để xem và trả lời')} />
            ) : (
              <Flex vertical gap={16}>
                <div>
                  <Rate disabled value={active.rating} />
                  <Typography.Title level={5} style={{ margin: '8px 0 4px' }}>
                    {active.title ?? t('admin.reviews.noTitle', '(không tiêu đề)')}
                  </Typography.Title>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{active.content}</Typography.Paragraph>
                </div>

                <Descriptions
                  size="small"
                  column={1}
                  items={[
                    { key: 'status', label: t('admin.common.status', 'Trạng thái'), children: <Tag color={REVIEW_STATUS_META[active.status].color}>{REVIEW_STATUS_META[active.status].label}</Tag> },
                    {
                      key: 'product',
                      label: t('admin.common.products', 'Sản phẩm'),
                      children: can('product:write') ? (
                        <Typography.Link onClick={() => setProductSku(active.sku)}>{productName(active.sku)}</Typography.Link>
                      ) : (
                        productName(active.sku)
                      ),
                    },
                    { key: 'user', label: t('admin.reviews.author', 'Người viết'), children: active.userDisplayName },
                    {
                      key: 'order',
                      label: t('admin.common.orders', 'Đơn hàng'),
                      children: active.orderCode ? <Link to={`/admin/orders/${active.orderCode}`}>{active.orderCode}</Link> : '–',
                    },
                    { key: 'helpful', label: t('admin.reviews.helpfulVotes', 'Lượt hữu ích'), children: active.helpfulCount },
                    { key: 'date', label: t('admin.reviews.writtenOn', 'Ngày viết'), children: formatDateTime(active.createdAt) },
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
                    {t('admin.reviews.approve', 'Duyệt')}
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    disabled={!CAN_REJECT.includes(active.status)}
                    loading={busy}
                    onClick={() => moderate([active], 3)}
                  >
                    {t('admin.common.rejected', 'Từ chối')}
                  </Button>
                </Flex>

                <div>
                  <Typography.Text strong>{t('admin.reviews.storeReply', 'Trả lời của cửa hàng')}</Typography.Text>
                  {active.adminReply && (
                    <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '2px 0 8px' }}>
                      {t('admin.reviews.repliedAt', 'Đã trả lời lúc')} {formatDateTime(active.adminReply.repliedAt)}{t('admin.reviews.sendingAgainReplacesThePrevious', '. Gửi lại sẽ ghi đè câu cũ.')}
                    </Typography.Paragraph>
                  )}
                  <Input.TextArea
                    rows={4}
                    maxLength={2000}
                    showCount
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t('admin.reviews.thankYouForYourReview', 'Cảm ơn bạn đã đánh giá...')}
                    style={{ marginTop: 8 }}
                  />
                  <Button
                    icon={<SendOutlined />}
                    disabled={!reply.trim()}
                    loading={busy}
                    onClick={sendReply}
                    style={{ marginTop: 12 }}
                  >
                    {t('admin.reviews.sendReply', 'Gửi trả lời')}
                  </Button>
                </div>
              </Flex>
            )}
          </Card>
        </Col>
      </Row>
      <ProductFormModal open={!!productSku} sku={productSku ?? null} onClose={() => setProductSku(undefined)} />
    </>
  );
};
