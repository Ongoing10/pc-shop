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
import { BulkDeleteButton, RowDeleteButton } from '../../../components/admin/DeleteActions';
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
import { t } from '../../../i18n/t';

type RuleFormValues = Omit<CompatibilityRule, 'id' | 'isActive'>;

const RULE_TYPES: Array<{ value: CompatibilityRule['ruleType']; label: string; hint: string }> = [
  { value: 'EQUALS', get label() { return t('admin.rules.equals', 'Bằng nhau'); }, get hint() { return t('admin.rules.sourceValueTargetValueE', 'giá trị nguồn = giá trị đích (vd socket)'); } },
  { value: 'IN', get label() { return t('admin.rules.isIn', 'Nằm trong'); }, get hint() { return t('admin.rules.sourceValueIsInThe', 'giá trị nguồn thuộc danh sách của đích (vd form factor)'); } },
  { value: 'LTE', get label() { return t('admin.rules.lessThanOrEqual', 'Nhỏ hơn hoặc bằng'); }, get hint() { return t('admin.rules.sourceValueTargetValueE2', 'giá trị nguồn ≤ giá trị đích (vd chiều dài VGA)'); } },
  { value: 'SUM_TDP_LTE_WATTAGE', get label() { return t('admin.rules.totalTdpWattage', 'Tổng TDP ≤ công suất'); }, get hint() { return t('admin.rules.sumOfTheSourceField', 'tổng trường nguồn mọi linh kiện × hệ số ≤ đích'); } },
];

/** Điều kiện của luật dạng "CPU.socket Bằng nhau → MAINBOARD.socket" */
const RuleCondition: React.FC<{ rule: CompatibilityRule }> = ({ rule }) => (
  <Flex gap={6} align="center" wrap className="admin-rule-cond">
    <Tag bordered={false} className="admin-mono">
      {rule.sourceCategory}.{rule.sourceField}
    </Tag>
    <Typography.Text type="secondary">{RULE_TYPES.find((n) => n.value === rule.ruleType)?.label}</Typography.Text>
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
  const categoryName = (code: string) => (code === '*' ? t('admin.rules.anyPart', 'Mọi linh kiện') : categories.find((c) => c.code === code)?.name ?? code);

  const categoryOptions = [
    { value: '*', label: t('admin.rules.anyPart2', '* (mọi linh kiện)') },
    ...categories.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
  ];

  const setActive = (codes: string[], active: boolean) => {
    setRulesActive.mutate(
      { codes, active },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.rules.rules', 'Đã {{value}} {{count}} luật', { value: active ? t('admin.common.enabled', 'bật') : t('admin.common.disabled', 'tắt'), count: codes.length }));
        },
        onError: (e) => message.error(e.message),
      }
    );
  };

  /** "Xóa" = tắt (không xóa thật), bật lại được */
  const remove = (codes: string[]) => {
    setRulesActive.mutate(
      { codes, active: false },
      {
        onSuccess: () => {
          setSelectedKeys([]);
          message.success(t('admin.rules.deletedRules', 'Đã xóa {{count}} luật', { count: codes.length }));
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
        message.success(t('admin.rules.createdRule', 'Đã tạo luật {{code}}', { code }));
      } else if (editing) {
        await updateRule.mutateAsync({ code: editing.code, body });
        message.success(t('admin.rules.ruleSaved', 'Đã lưu luật'));
      }
      setEditing(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: 'code', errors: [t('admin.rules.ruleCodeAlreadyExists409', 'Mã luật đã tồn tại (409)')] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<CompatibilityRule> = [
    {
      title: t('admin.rules.rule', 'Luật'),
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
    { title: t('admin.rules.condition', 'Điều kiện'), key: 'cond', render: (_, r) => <RuleCondition rule={r} /> },
    {
      title: t('admin.rules.level', 'Mức'),
      dataIndex: 'severity',
      width: 100,
      render: (s: CompatSeverity) => <Tag color={SEVERITY_META[s].color}>{SEVERITY_META[s].label}</Tag>,
    },
    {
      title: t('admin.common.enable', 'Bật'),
      dataIndex: 'isActive',
      width: 70,
      render: (a: number, r) => <Switch size="small" checked={a === 1} onChange={(v) => setActive([r.code], v)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, r) => (
        <Flex gap={4}>
          <Tooltip title={t('admin.common.viewDetails', 'Xem chi tiết')}>
            <Button type="text" size="small" icon={<EyeOutlined />} aria-label={t('admin.common.viewDetails', 'Xem chi tiết')} onClick={() => setViewingCode(r.code)} />
          </Tooltip>
          <Tooltip title={t('admin.common.edit', 'Sửa')}>
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={t('admin.common.edit', 'Sửa')} onClick={() => openForm(r)} />
          </Tooltip>
          <RowDeleteButton
            title={t('admin.rules.deleteRule', 'Xóa luật {{name}}?', { name: r.name })}
            description={t('admin.rules.disablesTheRuleExistingData', 'Tắt luật, dữ liệu cũ giữ nguyên, có thể bật lại.')}
            onConfirm={() => remove([r.code])}
            disabled={!r.isActive}
            disabledReason={t('admin.common.disabled2', 'Đã tắt')}
          />
        </Flex>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.compatibilityRules', 'Luật tương thích')}
        subtitle={t('admin.rules.errorMakesABuildImpossible', 'Mức "Lỗi" làm cấu hình không lắp được; "Cảnh báo" chỉ nhắc nhở')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm('new')}>
            {t('admin.rules.addRule', 'Thêm luật')}
          </Button>
        }
      />

      <Card>
        <BulkActionBar count={selectedKeys.length} onClear={() => setSelectedKeys([])}>
          <Button size="small" onClick={() => setActive(selectedKeys as string[], true)}>
            {t('admin.common.enable', 'Bật')}
          </Button>
          <BulkDeleteButton
            count={selectedKeys.length}
            noun={t('admin.rules.rules2', 'luật')}
            content={t('admin.rules.theRulesWillBeDisabled', 'Luật sẽ bị tắt, dữ liệu cũ giữ nguyên và có thể bật lại.')}
            onConfirm={() => remove(selectedKeys as string[])}
          />
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
        centered
        open={!!viewing}
        title={viewing ? viewing.name : ''}
        width={720}
        onCancel={() => setViewingCode(undefined)}
        footer={[
          <Button key="close" onClick={() => setViewingCode(undefined)}>
            {t('admin.common.close', 'Đóng')}
          </Button>,
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => viewing && openForm(viewing)}>
            {t('admin.common.edit', 'Sửa')}
          </Button>,
        ]}
      >
        {viewing && (
          <Descriptions
            size="small"
            column={1}
            bordered
            items={[
              { key: 'code', label: t('admin.common.code', 'Mã'), children: <span className="admin-mono">{viewing.code}</span> },
              { key: 'cond', label: t('admin.rules.condition', 'Điều kiện'), children: <RuleCondition rule={viewing} /> },
              {
                key: 'type',
                label: t('admin.rules.comparison', 'Kiểu so sánh'),
                children: (
                  <>
                    {RULE_TYPES.find((n) => n.value === viewing.ruleType)?.label}
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {RULE_TYPES.find((n) => n.value === viewing.ruleType)?.hint}
                    </Typography.Text>
                  </>
                ),
              },
              {
                key: 'source',
                label: t('admin.rules.source', 'Nguồn'),
                children: t('admin.rules.field', '{{value}} · trường {{sourceField}}', { value: categoryName(viewing.sourceCategory), sourceField: viewing.sourceField }),
              },
              {
                key: 'target',
                label: t('admin.rules.target', 'Đích'),
                children: t('admin.rules.field2', '{{value}} · trường {{targetField}}', { value: categoryName(viewing.targetCategory ?? ""), targetField: viewing.targetField }),
              },
              ...(viewing.margin ? [{ key: 'margin', label: t('admin.rules.safetyFactor', 'Hệ số an toàn'), children: `× ${viewing.margin}` }] : []),
              {
                key: 'severity',
                label: t('admin.rules.severity', 'Mức độ'),
                children: <Tag color={SEVERITY_META[viewing.severity].color}>{SEVERITY_META[viewing.severity].label}</Tag>,
              },
              {
                key: 'active',
                label: t('admin.common.status', 'Trạng thái'),
                children: <Badge status={viewing.isActive ? 'success' : 'default'} text={viewing.isActive ? t('admin.rules.enabled', 'Đang bật') : t('admin.common.disabled2', 'Đã tắt')} />,
              },
              {
                key: 'msg',
                label: t('admin.rules.messageOnViolation', 'Thông báo khi vi phạm'),
                children: (
                  <>
                    <i>{viewing.messageTemplate}</i>
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {'{source} {target}'} {t('admin.rules.partName', '= tên linh kiện,')} {'{sv} {tv}'} {t('admin.rules.sourceTargetValue', '= giá trị nguồn / đích')}
                    </Typography.Text>
                  </>
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        centered
        open={editing !== null}
        title={editing === 'new' ? t('admin.rules.addCompatibilityRule', 'Thêm luật tương thích') : t('admin.rules.editCompatibilityRule', 'Sửa luật tương thích')}
        width={720}
        okText={t('admin.common.save', 'Lưu')}
        cancelText={t('admin.common.cancel', 'Hủy')}
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" initialValues={{ ruleType: 'EQUALS', severity: 1 }}>
          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="code"
                label={t('admin.common.code', 'Mã')}
                normalize={(v: string) => v?.toUpperCase()}
                rules={[
                  { required: true, message: t('admin.common.enterACode', 'Nhập mã') },
                  { pattern: /^[A-Z0-9_]+$/, message: t('admin.common.onlyAZ09', 'Chỉ A-Z, 0-9 và _') },
                ]}
              >
                <Input disabled={editing !== 'new'} className="admin-mono" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item name="name" label={t('admin.rules.ruleName', 'Tên luật')} rules={[{ required: true, whitespace: true, message: t('admin.common.enterAName', 'Nhập tên') }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sourceCategory" label={t('admin.rules.sourceCategory', 'Danh mục nguồn')} rules={[{ required: true, message: t('admin.common.chooseACategory', 'Chọn danh mục') }]}>
                <Select showSearch options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sourceField" label={t('admin.rules.sourceFieldCompat', 'Trường nguồn (compat)')} rules={[{ required: true, message: t('admin.rules.enterAField', 'Nhập trường') }]}>
                <Input className="admin-mono" placeholder={t('admin.rules.egSocket', 'vd socket')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="targetCategory" label={t('admin.rules.targetCategory', 'Danh mục đích')} rules={[{ required: true, message: t('admin.common.chooseACategory', 'Chọn danh mục') }]}>
                <Select showSearch options={categoryOptions.filter((o) => o.value !== '*')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="targetField" label={t('admin.rules.targetFieldCompat', 'Trường đích (compat)')} rules={[{ required: true, message: t('admin.rules.enterAField', 'Nhập trường') }]}>
                <Input className="admin-mono" placeholder={t('admin.rules.egSocket', 'vd socket')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={ruleType === 'SUM_TDP_LTE_WATTAGE' ? 16 : 24}>
              <Form.Item name="ruleType" label={t('admin.rules.comparison', 'Kiểu so sánh')} extra={RULE_TYPES.find((n) => n.value === ruleType)?.hint}>
                <Select options={RULE_TYPES.map((n) => ({ value: n.value, label: n.label }))} />
              </Form.Item>
            </Col>
            {ruleType === 'SUM_TDP_LTE_WATTAGE' && (
              <Col xs={24} sm={8}>
                <Form.Item name="margin" label={t('admin.rules.safetyFactor', 'Hệ số an toàn')} rules={[{ required: true, type: 'number', min: 0.01, message: t('admin.rules.mustBe0', 'Phải > 0') }]}>
                  <InputNumber step={0.1} style={{ width: '100%' }} placeholder="1.2" />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="severity" label={t('admin.rules.severity', 'Mức độ')}>
                <Radio.Group
                  optionType="button"
                  options={[
                    { value: 1, label: t('admin.rules.errorCannotAssemble', 'Lỗi (không lắp được)') },
                    { value: 2, label: t('admin.common.warning', 'Cảnh báo') },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="messageTemplate"
                label={t('admin.rules.messageOnViolation', 'Thông báo khi vi phạm')}
                extra={t('admin.rules.useSourceTargetPartNames', 'Dùng {source} {target} (tên linh kiện), {sv} {tv} (giá trị nguồn/đích)')}
                rules={[{ required: true, whitespace: true, message: t('admin.rules.enterAMessage', 'Nhập thông báo') }]}
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
