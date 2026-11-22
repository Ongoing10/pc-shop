import React, { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
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
import {
  useAdminCategories,
  useCommitProductImport,
  useCommitStockImport,
  useValidateProductImport,
  useValidateStockImport,
} from '../../hooks/admin/useAdminApi';
import { adminCatalogService } from '../../services/api/admin/adminCatalogService';
import { adminInventoryService } from '../../services/api/admin/adminInventoryService';
import { saveDownloadedFile } from '../../utils/download';
import { ImportResult, ImportRowError, ImportValidateResult } from '../../types/admin';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n/t';

type ImportKind = 'products' | 'inventory';

interface PrepareValues {
  category?: string;
  mode?: 'CREATE_ONLY' | 'UPSERT';
  referenceCode?: string;
}

type PreviewRow = Record<string, unknown> & { row: number };

const MAX_SIZE = 5 * 1024 * 1024;

const TITLE: Record<ImportKind, string> = {
  get products() { return t('admin.import.importProductsFromExcel', 'Import sản phẩm từ Excel'); },
  get inventory() { return t('admin.import.importStockFromExcel', 'Nhập kho từ Excel'); },
};

/**
 * A04: import Excel 3 bước (chuẩn bị → kiểm tra → ghi), dùng chung cho sản phẩm và phiếu nhập kho.
 * Bước kiểm tra không ghi gì; importId giữ 1 giờ, dùng một lần.
 */
export const ImportExcelModal: React.FC<{ kind: ImportKind; open: boolean; onClose: () => void }> = ({ kind, open, onClose }) => {
  const { message } = App.useApp();
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
    setFileError(undefined);
  };

  const handleValidate = async () => {
    const values = await form.validateFields();
    const file = files[0]?.originFileObj;
    if (!file) {
      setFileError(t('admin.import.chooseAnXlsxFile', 'Chọn file .xlsx'));
      return;
    }
    // Lỗi cả file như backend trả 400
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setFileError(t('admin.import.onlyXlsxFilesAreAccepted', 'Chỉ nhận file .xlsx'));
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError(t('admin.import.fileIsLargerThan5', 'File vượt quá 5 MB'));
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
    { title: t('admin.import.row', 'Dòng'), dataIndex: 'row', width: 70 },
    {
      title: t('admin.common.error', 'Lỗi'),
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
          { title: t('admin.import.row', 'Dòng'), dataIndex: 'row', width: 70 },
          {
            title: t('admin.import.action', 'Thao tác'),
            dataIndex: 'action',
            width: 100,
            render: (a: string) => <Tag color={a === 'CREATE' ? 'green' : 'blue'}>{a === 'CREATE' ? t('admin.import.new', 'Thêm mới') : t('admin.common.update', 'Cập nhật')}</Tag>,
          },
          { title: 'SKU', dataIndex: 'sku', render: (v: string) => <span className="admin-mono">{v}</span> },
          { title: t('admin.common.name', 'Tên'), dataIndex: 'name' },
          { title: t('admin.import.price', 'Giá'), dataIndex: 'price', align: 'right', render: (v: number) => formatCurrency(v) },
          { title: t('admin.common.status', 'Trạng thái'), dataIndex: 'status', width: 100 },
        ]
      : [
          { title: t('admin.import.row', 'Dòng'), dataIndex: 'row', width: 70 },
          { title: t('admin.common.warehouse', 'Kho'), dataIndex: 'warehouse', width: 110, render: (v: string) => <span className="admin-mono">{v}</span> },
          { title: 'SKU', dataIndex: 'sku', render: (v: string) => <span className="admin-mono">{v}</span> },
          { title: t('admin.common.quantity', 'Số lượng'), dataIndex: 'quantity', width: 100, align: 'right' },
        ];

  return (
    <Modal
      open={open}
      title={TITLE[kind]}
      width={{ xs: '100%', md: '90%', xl: 1000 }}
      centered
      maskClosable={false}
      footer={null}
      onCancel={onClose}
      // đóng xong thì về bước 1, lần mở sau bắt đầu lại
      afterClose={() => {
        reset();
        form.resetFields();
      }}
      forceRender
      styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', overflowX: 'hidden' } }}
    >
      <Steps
        current={step}
        className="admin-steps"
        items={[
          { title: t('admin.import.prepareFile', 'Chuẩn bị file'), content: t('admin.import.downloadTemplateChooseFile', 'Tải mẫu, chọn file') },
          { title: t('admin.import.check', 'Kiểm tra'), content: t('admin.import.reviewErrorsAndValidRows', 'Xem lỗi và dòng hợp lệ') },
          { title: t('admin.common.done', 'Hoàn tất'), content: t('admin.import.writeToTheSystem', 'Ghi vào hệ thống') },
        ]}
      />

      {step === 0 && (
        <Row gutter={[24, 16]}>
          <Col xs={24} md={10}>
            <Form form={form} layout="vertical" initialValues={{ mode: 'CREATE_ONLY' }}>
              {kind === 'products' ? (
                <>
                  <Form.Item
                    name="category"
                    label={t('admin.common.category', 'Danh mục')}
                    extra={t('admin.import.eachCategoryHasItsOwn', 'Mỗi danh mục có bộ cột thông số riêng')}
                    rules={[{ required: true, message: t('admin.common.chooseACategory', 'Chọn danh mục') }]}
                  >
                    <Select options={categories.filter((c) => c.specSchema).map((c) => ({ value: c.code, label: c.name }))} />
                  </Form.Item>
                  <Form.Item name="mode" label={t('admin.import.mode', 'Chế độ')}>
                    <Radio.Group>
                      <Flex vertical gap={6}>
                        <Radio value="CREATE_ONLY">{t('admin.import.createOnlyExistingSkuIs', 'Chỉ thêm mới (SKU đã có là lỗi)')}</Radio>
                        <Radio value="UPSERT">{t('admin.import.createOrUpdate', 'Thêm hoặc cập nhật')}</Radio>
                      </Flex>
                    </Radio.Group>
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="referenceCode"
                  label={t('admin.import.receiptNumber', 'Số phiếu nhập')}
                  rules={[
                    { required: true, whitespace: true, message: t('admin.import.enterTheReceiptNumber', 'Nhập số phiếu') },
                    { max: 50, message: t('admin.import.atMost50Characters', 'Tối đa 50 ký tự') },
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
                    {t('admin.import.downloadTemplate', 'Tải file mẫu')}
                  </Button>
                )}
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={14}>
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
              <p className="ant-upload-text">{t('admin.import.dragAnXlsxFileHere', 'Kéo file .xlsx vào đây hoặc bấm để chọn')}</p>
              <p className="ant-upload-hint">{t('admin.import.upTo5Mb1000', 'Tối đa 5 MB, 1000 dòng')}</p>
            </Upload.Dragger>
            {fileError && <Alert type="error" showIcon title={fileError} style={{ marginTop: 12 }} />}
          </Col>
          <Col span={24}>
            <Flex justify="flex-end" style={{ marginTop: 8 }}>
              <Button type="primary" loading={busy} onClick={handleValidate}>
                {t('admin.import.checkFile', 'Kiểm tra file')}
              </Button>
            </Flex>
          </Col>
        </Row>
      )}

      {step === 1 && validation && (
        <Flex vertical gap={16}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic title={t('admin.import.totalRows', 'Tổng số dòng')} value={validation.total_rows} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic title={t('admin.import.valid', 'Hợp lệ')} value={validation.valid_rows} styles={{ content: { color: 'var(--ok)' } }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic title={t('admin.import.withErrors', 'Có lỗi')} value={validation.invalid_rows} styles={{ content: { color: validation.invalid_rows ? 'var(--danger)' : undefined } }} />
              </Card>
            </Col>
          </Row>

          {kind === 'inventory' && validation.invalid_rows > 0 && (
            <Alert
              type="warning"
              showIcon
              title={t('admin.import.stockReceiptsAreAllOr', 'Phiếu nhập kho ghi theo kiểu tất cả hoặc không: sửa hết lỗi trong file rồi kiểm tra lại.')}
            />
          )}

          {validation.errors.length > 0 && (
            <div>
              <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                <Typography.Text strong>{t('admin.import.rowsWithErrors', 'Dòng lỗi')}</Typography.Text>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={downloadResult}
                >
                  {t('admin.import.downloadResultFile', 'Tải file kết quả')}
                </Button>
              </Flex>
              <Table rowKey="row" size="small" columns={errorColumns} dataSource={validation.errors} pagination={false} scroll={{ x: 'max-content' }} />
            </div>
          )}

          <div>
            <Typography.Text strong>{t('admin.import.previewOfValidRowsUp', 'Xem trước dòng hợp lệ (tối đa 20)')}</Typography.Text>
            <Table rowKey="row" size="small" columns={previewColumns} dataSource={validation.preview} pagination={false} scroll={{ x: 'max-content' }} style={{ marginTop: 8 }} />
          </div>

          <Flex justify="space-between">
            <Button onClick={reset}>{t('admin.import.chooseAnotherFile', 'Chọn file khác')}</Button>
            <Button
              type="primary"
              loading={busy}
              disabled={validation.valid_rows === 0 || (kind === 'inventory' && validation.invalid_rows > 0)}
              onClick={handleCommit}
            >
              {t('admin.import.import', 'Nhập')} {validation.valid_rows} {t('admin.import.validRows', 'dòng hợp lệ')}
            </Button>
          </Flex>
        </Flex>
      )}

      {step === 2 && result && (
        <Result
          status="success"
          title={t('admin.import.importFinished', 'Đã nhập xong')}
          subTitle={t('admin.import.createdUpdatedFailedOfRows', 'Thêm mới {{created}} · cập nhật {{updated}} · lỗi {{failed}} trên tổng {{total}} dòng', { created: result.created, updated: result.updated, failed: result.failed, total: result.total_rows })}
          extra={[
            <Button key="again" onClick={reset}>
              {t('admin.import.importAnotherFile', 'Nhập file khác')}
            </Button>,
            <Button key="close" type="primary" onClick={onClose}>
              {t('admin.common.close', 'Đóng')}
            </Button>,
          ]}
        />
      )}
    </Modal>
  );
};
