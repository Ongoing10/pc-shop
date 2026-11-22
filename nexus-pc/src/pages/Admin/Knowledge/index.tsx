import React, { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Progress,
  Radio,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { CloudUploadOutlined, DeleteOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import {
  useAddKnowledge,
  useAdminCategories,
  useKnowledgeDocument,
  useKnowledgeDocuments,
  useKnowledgeSearch,
  useRemoveKnowledge,
  useSyncKnowledgeProducts,
} from '../../../hooks/admin/useAdminApi';
import type * as Api from '../../../types/api';
import { formatDateTime } from '../../../utils/orderStatus';
import { t } from '../../../i18n/t';

interface KnowledgeFormValues {
  title: string;
  sourceType: 2 | 3 | 4;
  sourceRef?: string;
  content: string;
}

const SOURCE_TYPE_LABEL: Record<Api.KnowledgeSourceType, string> = { get 1() { return t('admin.common.products', 'Sản phẩm'); }, get 2() { return t('admin.knowledge.guide', 'Hướng dẫn'); }, get 3() { return t('admin.knowledge.policy', 'Chính sách'); }, 4: 'FAQ' };

const STATUS_META: Record<Api.KnowledgeStatus, { label: string; color: string }> = {
  1: { get label() { return t('admin.knowledge.waitingToIndex', 'Chờ index'); }, color: 'default' },
  2: { get label() { return t('admin.knowledge.indexing', 'Đang index'); }, color: 'processing' },
  3: { get label() { return t('admin.knowledge.indexed', 'Đã index'); }, color: 'green' },
  4: { get label() { return t('admin.common.error', 'Lỗi'); }, color: 'red' },
  5: { get label() { return t('admin.knowledge.removed', 'Đã gỡ'); }, color: 'default' },
};

/** Kích thước chunk như ai-service: ~2000 ký tự, overlap 200 */
const estimateChunks = (len: number) => (len <= 2000 ? (len ? 1 : 0) : Math.ceil((len - 200) / 1800));

const MetadataTags: React.FC<{ metadata: Record<string, unknown> | null }> = ({ metadata }) => (
  <Flex gap={4} wrap>
    {Object.entries(metadata ?? {}).map(([k, v]) => (
      <Tag key={k} bordered={false} className="admin-mono">
        {k}: {String(v)}
      </Tag>
    ))}
  </Flex>
);

/** A11: thêm tài liệu cho RAG, xem/gỡ tài liệu, đồng bộ sản phẩm, thử truy vấn hybrid */
export const KnowledgePage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { data: categories = [] } = useAdminCategories();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const content = Form.useWatch('content', form) ?? '';

  const [query, setQuery] = useState<Api.KnowledgeDocumentQuery>({});
  const { data: documents = [], isLoading } = useKnowledgeDocuments(query);
  const [openId, setOpenId] = useState<number>();
  const { data: detail, isLoading: detailLoading } = useKnowledgeDocument(openId);

  const addKnowledge = useAddKnowledge();
  const removeKnowledge = useRemoveKnowledge();
  const syncProducts = useSyncKnowledgeProducts();
  const search = useKnowledgeSearch();

  const addDocument = async (v: KnowledgeFormValues) => {
    try {
      const r = await addKnowledge.mutateAsync({
        title: v.title,
        sourceType: v.sourceType,
        sourceRef: v.sourceRef?.trim() || null,
        content: v.content,
      });
      if (r.skipped) message.info(t('admin.knowledge.contentUnchangedKeepingTheIndexed', '"{{title}}" không đổi nội dung, giữ nguyên bản đã index', { title: v.title }));
      else message.success(t('admin.knowledge.addedChunks', 'Đã thêm "{{title}}" ({{chunkCount}} chunk)', { title: v.title, chunkCount: r.chunkCount }));
      form.resetFields();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const runSync = async () => {
    try {
      await syncProducts.mutateAsync();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = (doc: Api.KnowledgeDocument) =>
    modal.confirm({
      centered: true,
      title: t('admin.knowledge.removeFromTheKnowledgeBase', 'Gỡ "{{title}}" khỏi kho tri thức?', { title: doc.title }),
      content:
        doc.sourceType === 1
          ? t('admin.knowledge.theProductWillBeAdded', 'Sản phẩm sẽ được đưa lại vào kho ở lần cập nhật hoặc đồng bộ sau. Muốn gỡ hẳn thì ẩn sản phẩm ở trang Sản phẩm.')
          : t('admin.knowledge.theChatbotWillNoLonger', 'Chatbot sẽ không còn dùng được nội dung này. Thêm lại tài liệu nếu cần.'),
      okText: t('admin.knowledge.remove', 'Gỡ'),
      okButtonProps: { danger: true },
      cancelText: t('admin.common.cancel', 'Hủy'),
      onOk: async () => {
        try {
          await removeKnowledge.mutateAsync(doc.id);
          message.success(t('admin.knowledge.documentRemoved', 'Đã gỡ tài liệu'));
          if (openId === doc.id) setOpenId(undefined);
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });

  const runSearch = (v: { q: string; category?: string; k: number }) =>
    search.mutate(v, { onError: (e) => message.error(e.message) });

  const columns: TableColumnsType<Api.KnowledgeDocument> = [
    {
      title: t('admin.knowledge.document', 'Tài liệu'),
      dataIndex: 'title',
      render: (title: string, d) => (
        <Flex vertical>
          <Typography.Text strong>{title}</Typography.Text>
          {d.sourceRef && (
            <Typography.Text type="secondary" className="admin-mono" style={{ fontSize: 12 }}>
              {d.sourceRef}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: t('admin.common.type', 'Loại'),
      dataIndex: 'sourceType',
      width: 120,
      render: (n: Api.KnowledgeSourceType) => <Tag bordered={false}>{SOURCE_TYPE_LABEL[n]}</Tag>,
    },
    {
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'status',
      width: 120,
      render: (s: Api.KnowledgeStatus) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag>,
    },
    { title: 'Chunk', dataIndex: 'chunkCount', width: 80, align: 'right' },
    {
      title: t('admin.knowledge.indexedAt', 'Index lúc'),
      dataIndex: 'indexedAt',
      width: 160,
      render: (at: string | null) => (at ? formatDateTime(at) : '–'),
    },
    {
      key: 'actions',
      width: 56,
      render: (_, d) =>
        d.status !== 5 && (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={t('admin.knowledge.remove2', 'Gỡ {{title}}', { title: d.title })}
            onClick={(e) => {
              e.stopPropagation();
              remove(d);
            }}
          />
        ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.aiKnowledgeBase', 'Kho tri thức AI')}
        subtitle={t('admin.knowledge.dataForTheAdvisorChatbot', 'Dữ liệu cho chatbot tư vấn (RAG). Giá và tồn kho không nằm ở đây, chatbot luôn tra trực tiếp.')}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title={t('admin.knowledge.addDocument', 'Thêm tài liệu')}>
            <Form form={form} layout="vertical" onFinish={addDocument} initialValues={{ sourceType: 2 }}>
              <Form.Item name="title" label={t('admin.knowledge.title', 'Tiêu đề')} rules={[{ required: true, whitespace: true, message: t('admin.knowledge.enterATitle', 'Nhập tiêu đề') }, { max: 255 }]}>
                <Input placeholder={t('admin.knowledge.eGChoosingAPsu', 'vd Hướng dẫn chọn nguồn cho card RTX 40')} />
              </Form.Item>
              <Flex gap={16} wrap>
                <Form.Item name="sourceType" label={t('admin.common.type', 'Loại')}>
                  <Radio.Group
                    optionType="button"
                    options={([2, 3, 4] as const).map((n) => ({ value: n, label: SOURCE_TYPE_LABEL[n] }))}
                  />
                </Form.Item>
                <Form.Item
                  name="sourceRef"
                  label={t('admin.knowledge.documentCode', 'Mã tài liệu')}
                  extra={t('admin.knowledge.ifTheCodeMatchesAn', 'Trùng mã với tài liệu đã có thì nội dung mới thay cho bản cũ')}
                  rules={[{ max: 50 }]}
                  style={{ flex: 1, minWidth: 220 }}
                >
                  <Input placeholder={t('admin.knowledge.eGPolicyWarrantyOptional', 'vd POLICY-WARRANTY (tùy chọn)')} />
                </Form.Item>
              </Flex>
              <Form.Item
                name="content"
                label={t('admin.knowledge.content', 'Nội dung')}
                extra={t('admin.knowledge.charactersAboutChunks2000Characters', '{{count}} ký tự · ước tính {{count2}} chunk (~2000 ký tự, chồng 200)', { count: content.length.toLocaleString('vi-VN'), count2: estimateChunks(content.length) })}
                rules={[{ required: true, whitespace: true, message: t('admin.knowledge.enterTheContent', 'Nhập nội dung') }, { max: 200_000 }]}
              >
                <Input.TextArea rows={10} />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<CloudUploadOutlined />} loading={addKnowledge.isPending}>
                {t('admin.knowledge.addToKnowledgeBase', 'Thêm vào kho tri thức')}
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title={t('admin.knowledge.syncProducts', 'Đồng bộ sản phẩm')}>
            <Typography.Paragraph type="secondary">
              {t('admin.knowledge.productsEnterTheKnowledgeBase', 'Sản phẩm tự vào kho khi được công bố hoặc sửa, và tự ra khi bị ẩn/ngừng bán. Chỉ cần đồng bộ tay khi nạp lần đầu hoặc nghi lỡ cập nhật (vd Kafka tắt lúc sửa sản phẩm). Sản phẩm không đổi nội dung được bỏ qua.')}
            </Typography.Paragraph>
            <Button icon={<SyncOutlined spin={syncProducts.isPending} />} loading={syncProducts.isPending} onClick={runSync}>
              {t('admin.knowledge.syncNow', 'Đồng bộ ngay')}
            </Button>
            {syncProducts.data && (
              <Descriptions
                size="small"
                column={4}
                style={{ marginTop: 16 }}
                items={[
                  { key: 'total', label: t('admin.common.onSale', 'Đang bán'), children: syncProducts.data.total },
                  { key: 'indexed', label: t('admin.knowledge.indexed', 'Đã index'), children: syncProducts.data.indexed },
                  { key: 'skipped', label: t('admin.common.skipping', 'Bỏ qua'), children: syncProducts.data.skipped },
                  { key: 'removed', label: t('admin.knowledge.removed', 'Đã gỡ'), children: syncProducts.data.removed },
                ]}
              />
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card title={t('admin.knowledge.documentsInTheKnowledgeBase', 'Tài liệu trong kho')}>
            <Flex className="admin-filters" gap={8} wrap>
              <Input.Search
                allowClear
                placeholder={t('admin.knowledge.titleOrCodeSku', 'Tiêu đề hoặc mã (SKU)')}
                style={{ width: 280 }}
                onSearch={(q) => setQuery((cur) => ({ ...cur, q: q || undefined }))}
              />
              <Select
                allowClear
                placeholder={t('admin.knowledge.allTypes', 'Mọi loại')}
                style={{ width: 160 }}
                value={query.sourceType}
                onChange={(sourceType) => setQuery((cur) => ({ ...cur, sourceType }))}
                options={([1, 2, 3, 4] as const).map((n) => ({ value: n, label: SOURCE_TYPE_LABEL[n] }))}
              />
              <Select
                allowClear
                placeholder={t('admin.knowledge.inUse', 'Đang dùng')}
                style={{ width: 160 }}
                value={query.status}
                onChange={(status) => setQuery((cur) => ({ ...cur, status }))}
                options={([3, 4, 5] as const).map((s) => ({ value: s, label: STATUS_META[s].label }))}
              />
            </Flex>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={documents}
              loading={isLoading}
              onRow={(d) => ({ onClick: () => setOpenId(d.id), style: { cursor: 'pointer' } })}
              pagination={{ pageSize: 10, showTotal: (n) => t('admin.knowledge.documents', '{{count}} tài liệu', { count: n }) }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title={t('admin.knowledge.tryAQuery', 'Thử truy vấn')}>
            <Form layout="inline" onFinish={runSearch} initialValues={{ k: 5 }} className="admin-filters">
              <Form.Item name="q" rules={[{ required: true, whitespace: true, message: t('admin.knowledge.enterAQuestion', 'Nhập câu hỏi') }]}>
                <Input placeholder={t('admin.knowledge.eGGamingGpuFor', 'vd card chơi game 2K tầm 17 triệu')} style={{ width: 360 }} />
              </Form.Item>
              <Form.Item name="category">
                <Select allowClear placeholder={t('admin.common.allCategories', 'Mọi danh mục')} style={{ width: 180 }} options={categories.map((c) => ({ value: c.code, label: c.name }))} />
              </Form.Item>
              <Form.Item name="k" label={t('admin.knowledge.results', 'Số kết quả')}>
                <InputNumber min={1} max={20} style={{ width: 80 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={search.isPending}>
                {t('admin.knowledge.search', 'Tìm')}
              </Button>
            </Form>

            {search.data === undefined ? (
              <Empty description={t('admin.knowledge.enterAQuestionToSee', 'Nhập câu hỏi để xem chunk nào được lấy ra (50 ứng viên vector, xếp lại 0.7 vector + 0.3 full-text)')} />
            ) : (
              <List
                dataSource={search.data}
                locale={{ emptyText: t('admin.knowledge.noMatchingChunks', 'Không tìm thấy chunk phù hợp') }}
                renderItem={(r) => (
                  <List.Item
                    extra={
                      <Flex vertical gap={4} style={{ width: 180 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {t('admin.knowledge.total', 'Tổng')} {r.score.toFixed(2)} · Vector {r.vectorScore.toFixed(2)}
                        </Typography.Text>
                        <Progress percent={r.vectorScore * 100} size="small" showInfo={false} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Full-text {r.textScore.toFixed(2)}
                        </Typography.Text>
                        <Progress percent={Math.min(1, r.textScore) * 100} size="small" showInfo={false} strokeColor="var(--ok)" />
                      </Flex>
                    }
                  >
                    <List.Item.Meta title={r.title} description={<MetadataTags metadata={r.metadata} />} />
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                      {r.content}
                    </Typography.Paragraph>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Drawer
        open={openId != null}
        size={560}
        title={detail?.document.title ?? t('admin.knowledge.document', 'Tài liệu')}
        loading={detailLoading}
        onClose={() => setOpenId(undefined)}
        extra={
          detail && detail.document.status !== 5 && (
            <Button danger icon={<DeleteOutlined />} onClick={() => remove(detail.document)}>
              {t('admin.knowledge.remove', 'Gỡ')}
            </Button>
          )
        }
      >
        {detail && (
          <>
            <Descriptions
              size="small"
              column={1}
              items={[
                { key: 'type', label: t('admin.common.type', 'Loại'), children: SOURCE_TYPE_LABEL[detail.document.sourceType] },
                { key: 'ref', label: t('admin.common.code', 'Mã'), children: <span className="admin-mono">{detail.document.sourceRef ?? '–'}</span> },
                {
                  key: 'status',
                  label: t('admin.common.status', 'Trạng thái'),
                  children: <Tag color={STATUS_META[detail.document.status].color}>{STATUS_META[detail.document.status].label}</Tag>,
                },
                { key: 'model', label: 'Model embedding', children: detail.document.embeddingModel ?? '–' },
                { key: 'at', label: t('admin.knowledge.indexedAt', 'Index lúc'), children: detail.document.indexedAt ? formatDateTime(detail.document.indexedAt) : '–' },
              ]}
            />
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              {detail.chunks.length} chunk
            </Typography.Title>
            <List
              dataSource={detail.chunks}
              locale={{ emptyText: t('admin.knowledge.noChunksLeftDocumentRemoved', 'Không còn chunk nào (tài liệu đã gỡ)') }}
              renderItem={(c) => (
                <List.Item>
                  <Flex vertical gap={6} style={{ width: '100%' }}>
                    <Flex justify="space-between">
                      <Typography.Text strong>#{c.chunkIndex + 1}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {c.content.length.toLocaleString('vi-VN')} {t('admin.knowledge.characters', 'ký tự · ~')}{c.tokenCount ?? '?'} token
                      </Typography.Text>
                    </Flex>
                    <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }} ellipsis={{ rows: 6, expandable: true, symbol: t('admin.knowledge.showMore', 'Xem thêm') }}>
                      {c.content}
                    </Typography.Paragraph>
                    <MetadataTags metadata={c.metadata} />
                  </Flex>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </>
  );
};
