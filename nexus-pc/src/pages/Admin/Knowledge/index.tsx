import React, { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
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
  Tag,
  Typography,
} from 'antd';
import { CloudUploadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useAdminCategories, useAdminProducts } from '../../../hooks/admin/useAdminApi';

interface KnowledgeFormValues {
  title: string;
  sourceType: 2 | 3 | 4;
  sourceRef?: string;
  content: string;
}

interface ScoredChunk {
  chunkId: number;
  title: string;
  content: string;
  metadata: Record<string, string>;
  vectorScore: number;
  textScore: number;
}

const SOURCE_TYPE_LABEL: Record<1 | 2 | 3 | 4, string> = { 1: 'Sản phẩm', 2: 'Hướng dẫn', 3: 'Chính sách', 4: 'FAQ' };

/** Kích thước chunk như ai-service: ~2000 ký tự, overlap 200 */
const estimateChunks = (len: number) => (len <= 2000 ? (len ? 1 : 0) : Math.ceil((len - 200) / 1800));

/** Màn này thuộc ai-service (chưa ghép, ngoài phạm vi đợt này): giữ độ trễ giả lập để nút có trạng thái loading */
const fakeLatency = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A11: thêm tài liệu cho RAG, đồng bộ sản phẩm, thử truy vấn hybrid */
export const KnowledgePage: React.FC = () => {
  const { message } = App.useApp();
  const { data: products = [] } = useAdminProducts();
  const { data: categories = [] } = useAdminCategories();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const content = Form.useWatch('content', form) ?? '';
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; indexed: number; skipped: number }>();
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ScoredChunk[]>();

  const addDocument = async (v: KnowledgeFormValues) => {
    setSaving(true);
    // TODO ghép API: POST /ai/knowledge {title, sourceType, sourceRef, content} → {documentId, chunkCount, skipped}
    await fakeLatency(900);
    setSaving(false);
    message.success(`Đã thêm "${v.title}" (${estimateChunks(v.content.length)} chunk)`);
    form.resetFields();
  };

  const syncProducts = async () => {
    setSyncing(true);
    // TODO ghép API: POST /ai/knowledge/sync-products (bỏ qua sản phẩm có content_hash không đổi)
    await fakeLatency(1200);
    const active = products.filter((p) => p.status === 2).length;
    setSyncResult({ total: active, indexed: Math.min(3, active), skipped: Math.max(0, active - 3) });
    setSyncing(false);
  };

  const search = async (v: { q: string; category?: string; k: number }) => {
    setSearching(true);
    // TODO ghép API: GET /ai/search?q=&category=&k= (50 ứng viên vector rồi xếp lại 0.7 vector + 0.3 full-text)
    await fakeLatency(600);
    const words = v.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = products
      .filter((p) => p.status === 2 && (!v.category || p.categoryCode === v.category))
      .map((p, i) => {
        const text = `${p.name} ${p.categoryCode} ${p.brandCode}`.toLowerCase();
        const textScore = words.filter((w) => text.includes(w)).length / Math.max(1, words.length);
        return {
          chunkId: i + 1,
          title: p.name,
          content: `${p.name}. ${Object.entries(p.specs ?? {}).map(([k, val]) => `${k}: ${val}`).join(', ')}`,
          metadata: { sku: p.sku, category: p.categoryCode, brand: p.brandCode ?? '' },
          vectorScore: 0.55 + ((i * 37) % 40) / 100,
          textScore,
        };
      })
      .sort((a, b) => 0.7 * b.vectorScore + 0.3 * b.textScore - (0.7 * a.vectorScore + 0.3 * a.textScore))
      .slice(0, v.k);
    setResults(hits);
    setSearching(false);
  };

  return (
    <>
      <AdminPageHeader
        title="Kho tri thức AI"
        subtitle="Dữ liệu cho chatbot tư vấn (RAG). Giá và tồn kho không nằm ở đây, chatbot luôn tra trực tiếp."
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Thêm tài liệu">
            <Form form={form} layout="vertical" onFinish={addDocument} initialValues={{ sourceType: 2 }}>
              <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, whitespace: true, message: 'Nhập tiêu đề' }]}>
                <Input placeholder="vd Hướng dẫn chọn nguồn cho card RTX 40" />
              </Form.Item>
              <Flex gap={16} wrap>
                <Form.Item name="sourceType" label="Loại">
                  <Radio.Group
                    optionType="button"
                    options={([2, 3, 4] as const).map((t) => ({ value: t, label: SOURCE_TYPE_LABEL[t] }))}
                  />
                </Form.Item>
                <Form.Item name="sourceRef" label="Nguồn tham chiếu" style={{ flex: 1, minWidth: 220 }}>
                  <Input placeholder="URL hoặc mã tài liệu (tùy chọn)" />
                </Form.Item>
              </Flex>
              <Form.Item
                name="content"
                label="Nội dung"
                extra={`${content.length.toLocaleString('vi-VN')} ký tự · ước tính ${estimateChunks(content.length)} chunk (~2000 ký tự, chồng 200)`}
                rules={[{ required: true, whitespace: true, message: 'Nhập nội dung' }]}
              >
                <Input.TextArea rows={10} />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<CloudUploadOutlined />} loading={saving}>
                Thêm vào kho tri thức
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Flex vertical gap={16}>
            <Card title="Đồng bộ sản phẩm">
              <Typography.Paragraph type="secondary">
                Mỗi sản phẩm đang bán là một chunk. Sản phẩm có nội dung không đổi sẽ được bỏ qua, không embed lại.
              </Typography.Paragraph>
              <Button icon={<SyncOutlined spin={syncing} />} loading={syncing} onClick={syncProducts}>
                Đồng bộ ngay
              </Button>
              {syncResult && (
                <Descriptions
                  size="small"
                  column={3}
                  style={{ marginTop: 16 }}
                  items={[
                    { key: 'total', label: 'Tổng', children: syncResult.total },
                    { key: 'indexed', label: 'Đã index', children: syncResult.indexed },
                    { key: 'skipped', label: 'Bỏ qua', children: syncResult.skipped },
                  ]}
                />
              )}
            </Card>

            <Alert
              type="info"
              showIcon
              title="Chưa có API liệt kê/xóa tài liệu"
              description="Sản phẩm chuyển sang Ẩn/Ngừng bán sẽ tự bị gỡ khỏi kho tri thức qua sự kiện product.hidden."
            />
          </Flex>
        </Col>

        <Col span={24}>
          <Card title="Thử truy vấn">
            <Form layout="inline" onFinish={search} initialValues={{ k: 5 }} className="admin-filters">
              <Form.Item name="q" rules={[{ required: true, message: 'Nhập câu hỏi' }]}>
                <Input placeholder="vd card chơi game 2K tầm 17 triệu" style={{ width: 360 }} />
              </Form.Item>
              <Form.Item name="category">
                <Select allowClear placeholder="Mọi danh mục" style={{ width: 180 }} options={categories.map((c) => ({ value: c.code, label: c.name }))} />
              </Form.Item>
              <Form.Item name="k" label="Số kết quả">
                <InputNumber min={1} max={20} style={{ width: 80 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={searching}>
                Tìm
              </Button>
            </Form>

            {results === undefined ? (
              <Empty description="Nhập câu hỏi để xem chunk nào được lấy ra" />
            ) : (
              <List
                dataSource={results}
                locale={{ emptyText: 'Không tìm thấy chunk phù hợp' }}
                renderItem={(r) => (
                  <List.Item
                    extra={
                      <Flex vertical gap={4} style={{ width: 180 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Vector {r.vectorScore.toFixed(2)}
                        </Typography.Text>
                        <Progress percent={r.vectorScore * 100} size="small" showInfo={false} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Full-text {r.textScore.toFixed(2)}
                        </Typography.Text>
                        <Progress percent={r.textScore * 100} size="small" showInfo={false} strokeColor="var(--ok)" />
                      </Flex>
                    }
                  >
                    <List.Item.Meta
                      title={r.title}
                      description={
                        <Flex gap={4} wrap>
                          {Object.entries(r.metadata).map(([k, v]) => (
                            <Tag key={k} bordered={false} className="admin-mono">
                              {k}: {v}
                            </Tag>
                          ))}
                        </Flex>
                      }
                    />
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
    </>
  );
};
