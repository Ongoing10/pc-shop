import React, { useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import {
  useAdminCategories,
  useAdminRules,
  useCreateRule,
  useSetRulesActive,
  useUpdateRule,
} from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { CompatSeverity, CompatibilityRule } from '../../../types/admin';
import { SEVERITY_META } from '../../../utils/adminStatus';

type RuleFormValues = Omit<CompatibilityRule, 'id' | 'isActive'>;

const RULE_TYPES: Array<{ value: CompatibilityRule['ruleType']; label: string; hint: string }> = [
  { value: 'EQUALS', label: 'Bằng nhau', hint: 'giá trị nguồn = giá trị đích (vd socket)' },
  { value: 'IN', label: 'Nằm trong', hint: 'giá trị nguồn thuộc danh sách của đích (vd form factor)' },
  { value: 'LTE', label: 'Nhỏ hơn hoặc bằng', hint: 'giá trị nguồn ≤ giá trị đích (vd chiều dài VGA)' },
  { value: 'SUM_TDP_LTE_WATTAGE', label: 'Tổng TDP ≤ công suất', hint: 'tổng trường nguồn mọi linh kiện × hệ số ≤ đích' },
];

/** Điều kiện của luật dạng "CPU.socket Bằng nhau → MAINBOARD.socket" */
const RuleCondition: React.FC<{ rule: CompatibilityRule }> = ({ rule }) => (
  <Flex gap={6} align="center" wrap className="admin-rule-cond">
    <Tag bordered={false} className="admin-mono">
      {rule.sourceCategory}.{rule.sourceField}
    </Tag>
    <Typography.Text type="secondary">{RULE_TYPES.find((t) => t.value === rule.ruleType)?.label}</Typography.Text>
    <ArrowRightOutlined />
    <Tag bordered={false} className="admin-mono">
      {rule.targetCategory}.{rule.targetField}
    </Tag>
    {rule.margin && <span>× {rule.margin}</span>}
  </Flex>
);

/** A10: luật tương thích của rule engine (catalog). LLM chỉ diễn giải kết quả, không tự kiểm tra. */
export const RulesPage: React.FC = () => {
  const { message } = App.useApp();
  const { data: rules = [], isLoading } = useAdminRules();
  const { data: categories = [] } = useAdminCategories();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const setRulesActive = useSetRulesActive();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [viewingCode, setViewingCode] = useState<string>();
  const [editing, setEditing] = useState<CompatibilityRule | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<RuleFormValues>();
  const ruleType = Form.useWatch('ruleType', form);

  const viewing = rules.find((r) => r.code === viewingCode);
  const categoryName = (code: string) => (code === '*' ? 'Mọi linh kiện' : categories.find((c) => c.code === code)?.name ?? code);

  const categoryOptions = [
    { value: '*', label: '* (mọi linh kiện)' },
    ...categories.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
  ];

  const setActive = (codes: string[], active: boolean) => {
    setRulesActive.mutate(
      { codes, active },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(`Đã ${active ? 'bật' : 'tắt'} ${codes.length} luật`);
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  const openForm = (r: CompatibilityRule | 'new') => {
    form.resetFields();
    if (r !== 'new') form.setFieldsValue(r);
    setViewingCode(undefined);
    setEditing(r);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    const { code, ...rest } = v;
    const body = { ...rest, margin: v.ruleType === 'SUM_TDP_LTE_WATTAGE' ? v.margin ?? null : null };
    try {
      if (editing === 'new') {
        await createRule.mutateAsync({ code, ...body });
        message.success(`Đã tạo luật ${code}`);
      } else if (editing) {
        await updateRule.mutateAsync({ code: editing.code, body });
        message.success('Đã lưu luật');
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: 'code', errors: ['Mã luật đã tồn tại (409)'] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<CompatibilityRule> = [
    {
      title: 'Luật',
      dataIndex: 'name',
      render: (name: string, r) => (
        <div>
          <Typography.Link className="admin-cell-title" onClick={() => setViewingCode(r.code)}>
            {name}
          </Typography.Link>
          <Typography.Text type="secondary" className="admin-mono" style={{ display: 'block' }}>
            {r.code}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Điều kiện', key: 'cond', render: (_, r) => <RuleCondition rule={r} /> },
    {
      title: 'Mức',
      dataIndex: 'severity',
      width: 100,
      render: (s: CompatSeverity) => <Tag color={SEVERITY_META[s].color}>{SEVERITY_META[s].label}</Tag>,
    },
    {
      title: 'Bật',
      dataIndex: 'isActive',
      width: 70,
      render: (a: number, r) => <Switch size="small" checked={a === 1} onChange={(v) => setActive([r.code], v)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 88,
      render: (_, r) => (
        <Flex gap={4}>
          <Tooltip title="Xem chi tiết">
            <Button type="text" size="small" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => setViewingCode(r.code)} />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button type="text" size="small" icon={<EditOutlined />} aria-label="Sửa" onClick={() => openForm(r)} />
          </Tooltip>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Luật tương thích"
        subtitle={'Mức "Lỗi" làm cấu hình không lắp được; "Cảnh báo" chỉ nhắc nhở'}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            Thêm luật
          </Button>
        }
      />

      <Card>
        <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
          <Button size="small" onClick={() => setActive(selectedKeys as string[], true)}>
            Bật
          </Button>
          <Button size="small" danger onClick={() => setActive(selectedKeys as string[], false)}>
            Tắt
          </Button>
        </BulkActionBar>

        <Table
          rowKey="code"
          columns={columns}
          dataSource={rules}
          loading={isLoading}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          rowClassName={(r) => (r.isActive ? '' : 'admin-row-muted')}
          pagination={false}
        />
      </Card>

      <Modal
        open={!!viewing}
        title={viewing ? viewing.name : ''}
        width={720}
        onCancel={() => setViewingCode(undefined)}
        footer={[
          <Button key="close" onClick={() => setViewingCode(undefined)}>
            Đóng
          </Button>,
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => viewing && openForm(viewing)}>
            Sửa
          </Button>,
        ]}
      >
        {viewing && (
          <Descriptions
            size="small"
            column={1}
            bordered
            items={[
              { key: 'code', label: 'Mã', children: <span className="admin-mono">{viewing.code}</span> },
              { key: 'cond', label: 'Điều kiện', children: <RuleCondition rule={viewing} /> },
              {
                key: 'type',
                label: 'Kiểu so sánh',
                children: (
                  <>
                    {RULE_TYPES.find((t) => t.value === viewing.ruleType)?.label}
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {RULE_TYPES.find((t) => t.value === viewing.ruleType)?.hint}
                    </Typography.Text>
                  </>
                ),
              },
              {
                key: 'source',
                label: 'Nguồn',
                children: `${categoryName(viewing.sourceCategory)} · trường ${viewing.sourceField}`,
              },
              {
                key: 'target',
                label: 'Đích',
                children: `${categoryName(viewing.targetCategory ?? "")} · trường ${viewing.targetField}`,
              },
              ...(viewing.margin ? [{ key: 'margin', label: 'Hệ số an toàn', children: `× ${viewing.margin}` }] : []),
              {
                key: 'severity',
                label: 'Mức độ',
                children: <Tag color={SEVERITY_META[viewing.severity].color}>{SEVERITY_META[viewing.severity].label}</Tag>,
              },
              {
                key: 'active',
                label: 'Trạng thái',
                children: <Badge status={viewing.isActive ? 'success' : 'default'} text={viewing.isActive ? 'Đang bật' : 'Đã tắt'} />,
              },
              {
                key: 'msg',
                label: 'Thông báo khi vi phạm',
                children: (
                  <>
                    <i>{viewing.messageTemplate}</i>
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {'{source} {target}'} = tên linh kiện, {'{sv} {tv}'} = giá trị nguồn / đích
                    </Typography.Text>
                  </>
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm luật tương thích' : 'Sửa luật tương thích'}
        width={720}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" initialValues={{ ruleType: 'EQUALS', severity: 1 }}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="code"
                label="Mã"
                normalize={(v: string) => v?.toUpperCase()}
                rules={[
                  { required: true, message: 'Nhập mã' },
                  { pattern: /^[A-Z0-9_]+$/, message: 'Chỉ A-Z, 0-9 và _' },
                ]}
              >
                <Input disabled={editing !== 'new'} className="admin-mono" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="name" label="Tên luật" rules={[{ required: true, whitespace: true, message: 'Nhập tên' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sourceCategory" label="Danh mục nguồn" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                <Select showSearch options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sourceField" label="Trường nguồn (compat)" rules={[{ required: true, message: 'Nhập trường' }]}>
                <Input className="admin-mono" placeholder="vd socket" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetCategory" label="Danh mục đích" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                <Select showSearch options={categoryOptions.filter((o) => o.value !== '*')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetField" label="Trường đích (compat)" rules={[{ required: true, message: 'Nhập trường' }]}>
                <Input className="admin-mono" placeholder="vd socket" />
              </Form.Item>
            </Col>
            <Col span={ruleType === 'SUM_TDP_LTE_WATTAGE' ? 16 : 24}>
              <Form.Item name="ruleType" label="Kiểu so sánh" extra={RULE_TYPES.find((t) => t.value === ruleType)?.hint}>
                <Select options={RULE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
              </Form.Item>
            </Col>
            {ruleType === 'SUM_TDP_LTE_WATTAGE' && (
              <Col span={8}>
                <Form.Item name="margin" label="Hệ số an toàn" rules={[{ required: true, type: 'number', min: 0.01, message: 'Phải > 0' }]}>
                  <InputNumber step={0.1} style={{ width: '100%' }} placeholder="1.2" />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="severity" label="Mức độ">
                <Radio.Group
                  optionType="button"
                  options={[
                    { value: 1, label: 'Lỗi (không lắp được)' },
                    { value: 2, label: 'Cảnh báo' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="messageTemplate"
                label="Thông báo khi vi phạm"
                extra="Dùng {source} {target} (tên linh kiện), {sv} {tv} (giá trị nguồn/đích)"
                rules={[{ required: true, whitespace: true, message: 'Nhập thông báo' }]}
              >
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
