import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Radio,
  Result,
  Row,
  Select,
  Statistic,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { TableColumnsType, UploadFile } from 'antd';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import {
  useAdminCategories,
  useCommitProductImport,
  useCommitStockImport,
  useValidateProductImport,
  useValidateStockImport,
} from '../../../hooks/admin/useAdminApi';
import { adminCatalogService } from '../../../services/api/admin/adminCatalogService';
import { adminInventoryService } from '../../../services/api/admin/adminInventoryService';
import { saveDownloadedFile } from '../../../utils/download';
import { ImportResult, ImportRowError, ImportValidateResult } from '../../../types/admin';
import { formatCurrency } from '../../../utils/format';

type ImportKind = 'products' | 'inventory';

interface PrepareValues {
  category?: string;
  mode?: 'CREATE_ONLY' | 'UPSERT';
  referenceCode?: string;
}

type PreviewRow = Record<string, unknown> & { row: number };

const MAX_SIZE = 5 * 1024 * 1024;

const CONFIG: Record<ImportKind, { title: string; back: string; backLabel: string; api: string }> = {
  products: {
    title: 'Import sản phẩm từ Excel',
    back: '/admin/products',
    backLabel: 'Sản phẩm',
    api: '/admin/products/import',
  },
  inventory: {
    title: 'Nhập kho từ Excel',
    back: '/admin/inventory',
    backLabel: 'Tồn kho',
    api: '/admin/inventory/import/excel',
  },
};

/**
 * A04: import Excel 3 bước (chuẩn bị → kiểm tra → ghi), dùng chung cho sản phẩm và phiếu nhập kho.
 * Bước kiểm tra không ghi gì; importId giữ 1 giờ, dùng một lần.
 */
export const ImportExcelPage: React.FC<{ kind: ImportKind }> = ({ kind }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const cfg = CONFIG[kind];
  const { data: categories = [] } = useAdminCategories();
  const validateProducts = useValidateProductImport();
  const validateStock = useValidateStockImport();
  const commitProducts = useCommitProductImport();
  const commitStock = useCommitStockImport();
  const [form] = Form.useForm<PrepareValues>();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<ImportValidateResult<PreviewRow>>();
  const [result, setResult] = useState<ImportResult>();

  const reset = () => {
    setStep(0);
    setValidation(undefined);
    setResult(undefined);
    setFiles([]);
  };

  const handleValidate = async () => {
    const values = await form.validateFields();
    const file = files[0]?.originFileObj;
    if (!file) {
      setFileError('Chọn file .xlsx');
      return;
    }
    // Lỗi cả file như backend trả 400
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setFileError('Chỉ nhận file .xlsx');
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError('File vượt quá 5 MB');
      return;
    }
    setFileError(undefined);
    setBusy(true);
    try {
      // POST {api}/validate (multipart): chỉ kiểm tra, không ghi gì; trả import_id giữ 1 giờ
      const checked =
        kind === 'products'
          ? await validateProducts.mutateAsync({ file, category: values.category!, mode: values.mode ?? 'CREATE_ONLY' })
          : await validateStock.mutateAsync({ file, referenceCode: values.referenceCode || undefined });
      setValidation(checked as unknown as ImportValidateResult<PreviewRow>);
      setStep(1);
    } catch (e) {
      // lỗi cả file (sai định dạng, thiếu cột, quá lớn) backend trả 400
      setFileError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!validation) return;
    setBusy(true);
    try {
      // POST {api} {importId}; 404 = phiên hết hạn hoặc đã import → quay về bước 1
      const committed =
        kind === 'products'
          ? await commitProducts.mutateAsync(validation.import_id)
          : await commitStock.mutateAsync(validation.import_id);
      setResult(committed);
      setStep(2);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async (category?: string) => {
    try {
      const file =
        kind === 'products'
          ? await adminCatalogService.downloadProductTemplate(category!)
          : await adminInventoryService.downloadStockTemplate();
      saveDownloadedFile(file, kind === 'products' ? `mau-san-pham-${category}.xlsx` : 'mau-nhap-kho.xlsx');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const downloadResult = async () => {
    if (!validation) return;
    try {
      const file =
        kind === 'products'
          ? await adminCatalogService.downloadProductImportResult(validation.import_id)
          : await adminInventoryService.downloadStockImportResult(validation.import_id);
      saveDownloadedFile(file, 'ket-qua-import.xlsx');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const errorColumns: TableColumnsType<ImportRowError> = [
    { title: 'Dòng', dataIndex: 'row', width: 70 },
    {
      title: 'Lỗi',
      dataIndex: 'messages',
      render: (m: string[]) => (
        <ul className="admin-errlist">
          {m.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ),
    },
  ];

  const previewColumns: TableColumnsType<PreviewRow> =
    kind === 'products'
      ? [
          { title: 'Dòng', dataIndex: 'row', width: 70 },
          {
            title: 'Thao tác',
            dataIndex: 'action',
            width: 100,
            render: (a: string) => <Tag color={a === 'CREATE' ? 'green' : 'blue'}>{a === 'CREATE' ? 'Thêm mới' : 'Cập nhật'}</Tag>,
          },
          { title: 'SKU', dataIndex: 'sku', render: (v: string) => <span className="admin-mono">{v}</span> },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Giá', dataIndex: 'price', align: 'right', render: (v: number) => formatCurrency(v) },
          { title: 'Trạng thái', dataIndex: 'status', width: 100 },
        ]
      : [
          { title: 'Dòng', dataIndex: 'row', width: 70 },
          { title: 'Kho', dataIndex: 'warehouse', width: 110, render: (v: string) => <span className="admin-mono">{v}</span> },
          { title: 'SKU', dataIndex: 'sku', render: (v: string) => <span className="admin-mono">{v}</span> },
          { title: 'Số lượng', dataIndex: 'quantity', width: 100, align: 'right' },
        ];

  return (
    <>
      <AdminPageHeader crumbs={[{ label: cfg.backLabel, link: cfg.back }]} title={cfg.title} />

      <Card>
        <Steps
          current={step}
          className="admin-steps"
          items={[
            { title: 'Chuẩn bị file', content: 'Tải mẫu, chọn file' },
            { title: 'Kiểm tra', content: 'Xem lỗi và dòng hợp lệ' },
            { title: 'Hoàn tất', content: 'Ghi vào hệ thống' },
          ]}
        />

        {step === 0 && (
          <Row gutter={24}>
            <Col xs={24} lg={10}>
              <Form form={form} layout="vertical" initialValues={{ mode: 'CREATE_ONLY' }}>
                {kind === 'products' ? (
                  <>
                    <Form.Item
                      name="category"
                      label="Danh mục"
                      extra="Mỗi danh mục có bộ cột thông số riêng"
                      rules={[{ required: true, message: 'Chọn danh mục' }]}
                    >
                      <Select options={categories.filter((c) => c.specSchema).map((c) => ({ value: c.code, label: c.name }))} />
                    </Form.Item>
                    <Form.Item name="mode" label="Chế độ">
                      <Radio.Group>
                        <Flex vertical gap={6}>
                          <Radio value="CREATE_ONLY">Chỉ thêm mới (SKU đã có là lỗi)</Radio>
                          <Radio value="UPSERT">Thêm hoặc cập nhật</Radio>
                        </Flex>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : (
                  <Form.Item
                    name="referenceCode"
                    label="Số phiếu nhập"
                    rules={[
                      { required: true, whitespace: true, message: 'Nhập số phiếu' },
                      { max: 50, message: 'Tối đa 50 ký tự' },
                    ]}
                  >
                    <Input placeholder="vd PN-20261107-01" className="admin-mono" />
                  </Form.Item>
                )}
                <Form.Item noStyle dependencies={['category']}>
                  {({ getFieldValue }) => (
                    <Button
                      icon={<DownloadOutlined />}
                      disabled={kind === 'products' && !getFieldValue('category')}
                      onClick={() => downloadTemplate(getFieldValue('category'))}
                    >
                      Tải file mẫu
                    </Button>
                  )}
                </Form.Item>
              </Form>
            </Col>
            <Col xs={24} lg={14}>
              <Upload.Dragger
                accept=".xlsx"
                maxCount={1}
                fileList={files}
                beforeUpload={() => false}
                onChange={({ fileList }) => {
                  setFiles(fileList.slice(-1));
                  setFileError(undefined);
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Kéo file .xlsx vào đây hoặc bấm để chọn</p>
                <p className="ant-upload-hint">Tối đa 5 MB, 1000 dòng</p>
              </Upload.Dragger>
              {fileError && <Alert type="error" showIcon title={fileError} style={{ marginTop: 12 }} />}
            </Col>
            <Col span={24}>
              <Flex justify="flex-end" style={{ marginTop: 8 }}>
                <Button type="primary" loading={busy} onClick={handleValidate}>
                  Kiểm tra file
                </Button>
              </Flex>
            </Col>
          </Row>
        )}

        {step === 1 && validation && (
          <Flex vertical gap={16}>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Tổng số dòng" value={validation.total_rows} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Hợp lệ" value={validation.valid_rows} styles={{ content: { color: 'var(--ok)' } }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Có lỗi" value={validation.invalid_rows} styles={{ content: { color: validation.invalid_rows ? 'var(--danger)' : undefined } }} />
                </Card>
              </Col>
            </Row>

            {kind === 'inventory' && validation.invalid_rows > 0 && (
              <Alert
                type="warning"
                showIcon
                title="Phiếu nhập kho ghi theo kiểu tất cả hoặc không: sửa hết lỗi trong file rồi kiểm tra lại."
              />
            )}

            {validation.errors.length > 0 && (
              <div>
                <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                  <Typography.Text strong>Dòng lỗi</Typography.Text>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={downloadResult}
                  >
                    Tải file kết quả
                  </Button>
                </Flex>
                <Table rowKey="row" size="small" columns={errorColumns} dataSource={validation.errors} pagination={false} />
              </div>
            )}

            <div>
              <Typography.Text strong>Xem trước dòng hợp lệ (tối đa 20)</Typography.Text>
              <Table rowKey="row" size="small" columns={previewColumns} dataSource={validation.preview} pagination={false} style={{ marginTop: 8 }} />
            </div>

            <Flex justify="space-between">
              <Button onClick={reset}>Chọn file khác</Button>
              <Button
                type="primary"
                loading={busy}
                disabled={validation.valid_rows === 0 || (kind === 'inventory' && validation.invalid_rows > 0)}
                onClick={handleCommit}
              >
                Nhập {validation.valid_rows} dòng hợp lệ
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 2 && result && (
          <Result
            status="success"
            title="Đã nhập xong"
            subTitle={`Thêm mới ${result.created} · cập nhật ${result.updated} · lỗi ${result.failed} trên tổng ${result.total_rows} dòng`}
            extra={[
              <Button key="again" onClick={reset}>
                Nhập file khác
              </Button>,
              <Button key="back" type="primary" onClick={() => navigate(cfg.back)}>
                Về trang {cfg.backLabel.toLowerCase()}
              </Button>,
            ]}
          />
        )}
      </Card>
    </>
  );
};
