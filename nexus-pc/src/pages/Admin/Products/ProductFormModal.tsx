import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Result,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import { MinusCircleOutlined, PlusOutlined, SaveOutlined, DollarOutlined } from '@ant-design/icons';
import {
  useAdminBrands,
  useAdminCategories,
  useAdminProduct,
  useAdminProducts,
  useCreateProduct,
  useSetProductPrice,
  useSetProductStatus,
  useUpdateProduct,
} from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { mediaService } from '../../../services/api/mediaService';
import { AdminProduct, ProductStatus, SpecField, SpecValue } from '../../../types/admin';
import { PRODUCT_STATUS_META } from '../../../utils/adminStatus';
import { formatCurrency } from '../../../utils/format';
import { t } from '../../../i18n/t';

interface ProductFormValues {
  sku: string;
  name: string;
  slug?: string;
  categoryCode: string;
  brandCode?: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  warrantyMonths?: number | null;
  tags?: string[];
  status?: 1 | 2;
  specs?: Record<string, SpecValue>;
  compat?: Record<string, SpecValue>;
  /** dùng khi danh mục chưa có specSchema */
  freeSpecs?: Array<{ key: string; value: string }>;
}

const moneyFormatter = (v: number | string | undefined) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const moneyParser = (v: string | undefined) => Number((v ?? '').replace(/\./g, ''));

const toSlug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Bỏ các khóa rỗng để không gửi null lên specs/compat */
const compact = (obj?: Record<string, SpecValue>) => {
  if (!obj) return null;
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));
  return entries.length ? Object.fromEntries(entries) : null;
};

/** Ô nhập một thông số theo kiểu khai trong specSchema */
const SpecInput: React.FC<{ field: SpecField }> = ({ field }) => {
  const rules = [{ required: field.required, message: t('admin.productForm.enter', 'Nhập {{value}}', { value: field.label.toLowerCase() }) }];
  const name = [field.group, field.key];
  const suffix = field.unit ?? undefined;

  if (field.type === 'boolean') {
    return (
      <Form.Item name={name} label={field.label} valuePropName="checked">
        <Switch />
      </Form.Item>
    );
  }
  if (field.type === 'string_list') {
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <Select
          mode={field.options ? 'multiple' : 'tags'}
          options={field.options?.map((o) => ({ value: o, label: o }))}
          placeholder={field.options ? t('admin.productForm.chooseOneOrMore', 'Chọn một hoặc nhiều') : t('admin.productForm.typeThenPressEnter', 'Gõ rồi Enter')}
        />
      </Form.Item>
    );
  }
  if (field.type === 'integer' || field.type === 'decimal') {
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <InputNumber
          min={0}
          step={field.type === 'decimal' ? 0.1 : 1}
          precision={field.type === 'integer' ? 0 : undefined}
          suffix={suffix}
          style={{ width: '100%' }}
        />
      </Form.Item>
    );
  }
  if (field.options) {
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <Select allowClear options={field.options.map((o) => ({ value: o, label: o }))} />
      </Form.Item>
    );
  }
  return (
    <Form.Item name={name} label={field.label} rules={rules}>
      <Input suffix={suffix} />
    </Form.Item>
  );
};


interface ProductFormModalProps {
  open: boolean;
  /** SKU sản phẩm cần sửa; null = thêm mới */
  sku: string | null;
  onClose: () => void;
}

/** A03: tạo / sửa sản phẩm trong modal. Ô thông số sinh theo specSchema của danh mục. */
export const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, sku, onClose }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProductFormValues>();
  const [priceForm] = Form.useForm<{ price: number; originalPrice?: number | null; reason?: string }>();
  const { data: products = [] } = useAdminProducts();
  const { data: categories = [] } = useAdminCategories();
  const { data: brands = [] } = useAdminBrands();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const setProductStatus = useSetProductStatus();
  const setProductPrice = useSetProductPrice();

  const isEdit = Boolean(sku);
  const { data: product, isLoading: loadingProduct } = useAdminProduct(open && sku ? sku : undefined);
  const [saving, setSaving] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  /** SKU đã đổ vào form: đổi giá/trạng thái làm sản phẩm tải lại thì không ghi đè ô đang sửa */
  const filledFor = useRef<string | null | undefined>(undefined);

  const categoryCode = Form.useWatch('categoryCode', form);
  const category = categories.find((c) => c.code === categoryCode);
  const schema = category?.specSchema ?? null;
  const compatFields = useMemo(() => schema?.filter((f) => f.group === 'compat') ?? [], [schema]);
  const specFields = useMemo(() => schema?.filter((f) => f.group === 'specs') ?? [], [schema]);

  useEffect(() => {
    if (!open) {
      filledFor.current = undefined;
      return;
    }
    if (filledFor.current === sku) return;
    if (!sku) {
      form.resetFields();
      setFiles([]);
      filledFor.current = null;
      return;
    }
    if (!product || product.sku !== sku) return;
    form.resetFields();
    form.setFieldsValue({
      ...product,
      slug: product.slug,
      brandCode: product.brandCode ?? undefined,
      shortDescription: product.shortDescription ?? undefined,
      description: product.description ?? undefined,
      tags: product.tags ?? [],
      specs: product.specs ?? {},
      compat: product.compat ?? {},
    } as ProductFormValues);
    setFiles((product.images ?? []).map((img, i) => ({ uid: `${i}`, name: `anh-${i + 1}`, status: 'done', url: img.url })));
    filledFor.current = sku;
  }, [open, sku, product, form]);

  const handleSave = async (values: ProductFormValues) => {
    setSaving(true);
    const slug = values.slug?.trim() || toSlug(values.name);
    const freeSpecs = values.freeSpecs?.filter((r) => r?.key) ?? [];
    const images = files.map((f, i) => ({
      fileId: (f.response as { fileId?: number } | undefined)?.fileId ?? null,
      url: f.url ?? f.thumbUrl ?? '',
      isPrimary: i === 0,
    }));
    const common = {
      name: values.name.trim(),
      slug,
      categoryCode: values.categoryCode,
      brandCode: values.brandCode ?? null,
      shortDescription: values.shortDescription ?? null,
      description: values.description ?? null,
      warrantyMonths: values.warrantyMonths ?? null,
      tags: values.tags?.length ? values.tags : null,
      images,
      specs: schema ? compact(values.specs) : compact(Object.fromEntries(freeSpecs.map((r) => [r.key, r.value]))),
      compat: schema ? compact(values.compat) : null,
    };

    try {
      if (product) {
        // PUT không nhận giá và trạng thái (đổi bằng API riêng)
        await updateProduct.mutateAsync({ sku: product.sku, body: common });
        message.success(t('admin.productForm.productInformationSaved', 'Đã lưu thông tin sản phẩm'));
      } else {
        const created = await createProduct.mutateAsync({
          ...common,
          sku: values.sku,
          price: values.price!,
          originalPrice: values.originalPrice ?? null,
          status: values.status === 2 ? 2 : 1,
        });
        message.success(t('admin.productForm.createdProduct', 'Đã tạo sản phẩm {{sku}}', { sku: created.sku }));
      }
      onClose();
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: product ? 'slug' : 'sku', errors: [err.message || t('admin.common.alreadyExists409', 'Đã tồn tại (409)')] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (status: ProductStatus) => {
    if (!product) return;
    setProductStatus.mutate(
      { sku: product.sku, status },
      {
        onSuccess: () => message.success(t('admin.productForm.movedTo', 'Đã chuyển sang "{{value}}"', { value: PRODUCT_STATUS_META[status].label })),
        onError: (e) => message.error(e.message),
      }
    );
  };

  const submitPrice = async () => {
    if (!product) return;
    const v = await priceForm.validateFields();
    if (v.price === product.price && (v.originalPrice ?? null) === product.originalPrice) {
      priceForm.setFields([{ name: 'price', errors: [t('admin.productForm.thePriceDidNotChange', 'Giá không đổi')] }]);
      return;
    }
    try {
      await setProductPrice.mutateAsync({
        sku: product.sku,
        body: { price: v.price, originalPrice: v.originalPrice ?? null, reason: v.reason || null },
      });
      setPriceOpen(false);
      message.success(t('admin.productForm.priceChangedPriceHistoryRecorded', 'Đã đổi giá, lịch sử giá được ghi lại'));
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  // Đã công bố thì không quay về Nháp
  const statusOptions = (Object.keys(PRODUCT_STATUS_META).map(Number) as ProductStatus[])
    .filter((s) => !(s === 1 && product && product.status !== 1))
    .map((s) => ({ value: s, label: PRODUCT_STATUS_META[s].label }));

  const loading = isEdit && loadingProduct;
  const notFound = isEdit && !loadingProduct && !product;

  return (
    <>
      <Modal
        open={open}
        title={
          product ? (
            <Flex gap={8} align="baseline" wrap>
              {product.name}
              <Typography.Text type="secondary" className="admin-mono">
                {product.sku}
              </Typography.Text>
            </Flex>
          ) : isEdit ? (
            t('admin.productForm.editProduct', 'Sửa sản phẩm')
          ) : (
            t('admin.common.addProduct', 'Thêm sản phẩm')
          )
        }
        width={{ xs: '100%', md: '92%', xl: 1200 }}
        centered
        maskClosable={false}
        onCancel={onClose}
        forceRender
        footer={
          notFound
            ? null
            : [
                <Button key="cancel" onClick={onClose}>
                  {t('admin.common.cancel', 'Hủy')}
                </Button>,
                <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} disabled={loading} onClick={() => form.submit()}>
                  {isEdit ? t('admin.productForm.saveChanges', 'Lưu thay đổi') : t('admin.productForm.createProduct', 'Tạo sản phẩm')}
                </Button>,
              ]
        }
        styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        {loading && <Spin style={{ display: 'block', margin: '80px auto' }} />}
        {notFound && <Result status="404" title={t('admin.productForm.productNotFound', 'Không tìm thấy sản phẩm')} subTitle={t('admin.productForm.skuDoesNotExist', 'SKU {{sku}} không tồn tại.', { sku })} />}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{ status: 1, warrantyMonths: 36, tags: [] }}
          scrollToFirstError
          style={loading || notFound ? { display: 'none' } : undefined}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Flex vertical gap={16}>
                <Card size="small" title={t('admin.productForm.generalInformation', 'Thông tin chung')}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="sku"
                        label="SKU"
                        normalize={(v: string) => v?.toUpperCase()}
                        rules={[
                          { required: true, message: t('admin.productForm.enterTheSku', 'Nhập SKU') },
                          { pattern: /^[A-Z0-9-]+$/, message: t('admin.productForm.onlyAZ09', 'Chỉ gồm A-Z, 0-9 và dấu gạch ngang') },
                          {
                            validator: (_, v) =>
                              !isEdit && products.some((p) => p.sku === v)
                                ? Promise.reject(new Error(t('admin.productForm.skuAlreadyExists', 'SKU đã tồn tại')))
                                : Promise.resolve(),
                          },
                        ]}
                      >
                        <Input disabled={isEdit} placeholder="vd CPU-I5-14600K" className="admin-mono" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="slug" label="Slug" extra={t('admin.productForm.leaveEmptyToGenerateFrom', 'Để trống sẽ tự sinh từ tên')}>
                        <Input placeholder="intel-core-i5-14600k" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="name" label={t('admin.productForm.productName', 'Tên sản phẩm')} rules={[{ required: true, whitespace: true, message: t('admin.common.enterAName', 'Nhập tên') }]}>
                        <Input maxLength={200} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="categoryCode" label={t('admin.common.category', 'Danh mục')} rules={[{ required: true, message: t('admin.common.chooseACategory', 'Chọn danh mục') }]}>
                        <Select
                          disabled={isEdit}
                          options={categories.map((c) => ({ value: c.code, label: c.name, disabled: !c.isActive }))}
                          placeholder={t('admin.common.chooseACategory', 'Chọn danh mục')}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="brandCode" label={t('admin.common.brands', 'Thương hiệu')}>
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          options={brands.map((b) => ({ value: b.code, label: b.name, disabled: !b.isActive }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="shortDescription" label={t('admin.productForm.shortDescription', 'Mô tả ngắn')}>
                        <Input.TextArea rows={2} maxLength={300} showCount />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="description" label={t('admin.productForm.detailedDescription', 'Mô tả chi tiết')} extra={t('admin.productForm.thisContentIsAlsoFed', 'Nội dung này cũng được đưa vào dữ liệu tư vấn AI')}>
                        <Input.TextArea rows={5} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="warrantyMonths" label={t('admin.common.warranty', 'Bảo hành')}>
                        <InputNumber min={0} max={120} suffix={t('admin.productForm.months', 'tháng')} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="tags" label={t('admin.common.tags', 'Nhãn')}>
                        <Select mode="tags" placeholder="vd gaming, best-seller" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card size="small" title={category ? t('admin.productForm.specs', 'Thông số {{name}}', { name: category.name }) : t('admin.common.specs', 'Thông số')}>
                  {!category && <Alert type="info" showIcon title={t('admin.productForm.chooseACategoryToShow', 'Chọn danh mục để hiện các ô thông số.')} />}

                  {category && schema && (
                    <>
                      <Divider titlePlacement="start" plain>
                        {t('admin.productForm.usedForCompatibilityChecks', 'Dùng để kiểm tra tương thích')}
                      </Divider>
                      <Row gutter={16}>
                        {compatFields.map((f) => (
                          <Col key={f.key} xs={24} md={12} xxl={8}>
                            <SpecInput field={f} />
                          </Col>
                        ))}
                      </Row>
                      {specFields.length > 0 && (
                        <>
                          <Divider titlePlacement="start" plain>
                            {t('admin.productForm.displayOnly', 'Chỉ hiển thị')}
                          </Divider>
                          <Row gutter={16}>
                            {specFields.map((f) => (
                              <Col key={f.key} xs={24} md={12} xxl={8}>
                                <SpecInput field={f} />
                              </Col>
                            ))}
                          </Row>
                        </>
                      )}
                    </>
                  )}

                  {category && !schema && (
                    <>
                      <Alert
                        type="warning"
                        showIcon
                        title={t('admin.productForm.thisCategoryHasNoSpec', 'Danh mục này chưa khai bộ thông số')}
                        description={t('admin.productForm.theProductWillNotBe', 'Sản phẩm sẽ không được kiểm tra tương thích. Có thể nhập thông số hiển thị dạng tên / giá trị.')}
                        style={{ marginBottom: 16 }}
                      />
                      <Form.List name="freeSpecs">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name }) => (
                              <Row key={key} gutter={8} wrap={false}>
                                <Col flex="2">
                                  <Form.Item name={[name, 'key']} rules={[{ required: true, message: t('admin.common.enterAName', 'Nhập tên') }]}>
                                    <Input placeholder={t('admin.productForm.specName', 'Tên thông số')} />
                                  </Form.Item>
                                </Col>
                                <Col flex="3">
                                  <Form.Item name={[name, 'value']}>
                                    <Input placeholder={t('admin.productForm.value', 'Giá trị')} />
                                  </Form.Item>
                                </Col>
                                <Col flex="none">
                                  <Button type="text" icon={<MinusCircleOutlined />} aria-label={t('admin.common.removeLine', 'Xóa dòng')} onClick={() => remove(name)} />
                                </Col>
                              </Row>
                            ))}
                            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                              {t('admin.productForm.addSpec', 'Thêm thông số')}
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </>
                  )}
                </Card>
              </Flex>
            </Col>

            <Col xs={24} lg={8}>
              <Flex vertical gap={16}>
                <Card size="small" title={t('admin.productForm.priceStatus', 'Giá & trạng thái')}>
                  {product ? (
                    <>
                      <Descriptions
                        column={1}
                        size="small"
                        items={[
                          { key: 'price', label: t('admin.common.sellingPrice', 'Giá bán'), children: <b>{formatCurrency(product.price)}</b> },
                          {
                            key: 'orig',
                            label: t('admin.productForm.originalPrice', 'Giá gốc'),
                            children: product.originalPrice ? formatCurrency(product.originalPrice) : '–',
                          },
                          {
                            key: 'status',
                            label: t('admin.common.status', 'Trạng thái'),
                            children: <Tag color={PRODUCT_STATUS_META[product.status].color}>{PRODUCT_STATUS_META[product.status].label}</Tag>,
                          },
                        ]}
                      />
                      <Flex vertical gap={8} style={{ marginTop: 12 }}>
                        <Button
                          block
                          icon={<DollarOutlined />}
                          onClick={() => {
                            priceForm.setFieldsValue({ price: product.price, originalPrice: product.originalPrice, reason: undefined });
                            setPriceOpen(true);
                          }}
                        >
                          {t('admin.common.changePrice', 'Đổi giá')}
                        </Button>
                        <Select
                          value={product.status}
                          onChange={changeStatus}
                          options={statusOptions}
                          style={{ width: '100%' }}
                          prefix={t('admin.productForm.status', 'Trạng thái:')}
                        />
                      </Flex>
                    </>
                  ) : (
                    <Row gutter={16}>
                      <Col xs={24} sm={12} lg={24}>
                        <Form.Item
                          name="price"
                          label={t('admin.common.sellingPrice', 'Giá bán')}
                          rules={[
                            { required: true, message: t('admin.productForm.enterTheSellingPrice', 'Nhập giá bán') },
                            { type: 'number', min: 1, message: t('admin.productForm.priceMustBeGreaterThan', 'Giá phải lớn hơn 0') },
                          ]}
                        >
                          <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} lg={24}>
                        <Form.Item
                          name="originalPrice"
                          label={t('admin.common.originalPriceStruckThrough', 'Giá gốc (gạch ngang)')}
                          dependencies={['price']}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator: (_, v) =>
                                v == null || v > (getFieldValue('price') ?? 0)
                                  ? Promise.resolve()
                                  : Promise.reject(new Error(t('admin.productForm.originalPriceMustBeHigher', 'Giá gốc phải lớn hơn giá bán'))),
                            }),
                          ]}
                        >
                          <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="status" label={t('admin.productForm.statusOnCreation', 'Trạng thái khi tạo')}>
                          <Radio.Group
                            optionType="button"
                            options={[
                              { value: 1, label: t('admin.common.draft', 'Nháp') },
                              { value: 2, label: t('admin.common.onSale', 'Đang bán') },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                </Card>

                <Card size="small" title={t('admin.productForm.productImages', 'Ảnh sản phẩm')} extra={<Typography.Text type="secondary">{t('admin.productForm.theFirstImageIsThe', 'Ảnh đầu là ảnh chính')}</Typography.Text>}>
                  <Upload
                    listType="picture-card"
                    accept="image/*"
                    multiple
                    fileList={files}
                    // Tải ngay lên media-service (bucket products); ảnh lưu kèm fileId để xóa/thay về sau
                    beforeUpload={(file) => {
                      const uid = file.uid;
                      setFiles((prev) => [...prev, { uid, name: file.name, status: 'uploading' }]);
                      mediaService
                        .upload(file, 'products')
                        .then((media) =>
                          setFiles((prev) =>
                            prev.map((f) => (f.uid === uid ? { ...f, status: 'done', url: media.url, response: { fileId: media.id } } : f))
                          )
                        )
                        .catch((e: Error) => {
                          setFiles((prev) => prev.filter((f) => f.uid !== uid));
                          message.error(t('admin.productForm.imageUploadFailed', 'Không tải được ảnh: {{message}}', { message: e.message }));
                        });
                      return false;
                    }}
                    onRemove={(file) => setFiles((prev) => prev.filter((f) => f.uid !== file.uid))}
                  >
                    {files.length < 8 && (
                      <button type="button" className="admin-upload-btn">
                        <PlusOutlined />
                        <div>{t('admin.productForm.uploadImage', 'Tải ảnh')}</div>
                      </button>
                    )}
                  </Upload>
                </Card>
              </Flex>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        centered
        open={priceOpen}
        title={t('admin.productForm.changeProductPrice', 'Đổi giá sản phẩm')}
        okText={t('admin.productForm.savePrice', 'Lưu giá')}
        cancelText={t('admin.common.cancel', 'Hủy')}
        onOk={submitPrice}
        onCancel={() => setPriceOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form form={priceForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="price"
                label={t('admin.productForm.newSellingPrice', 'Giá bán mới')}
                rules={[
                  { required: true, message: t('admin.productForm.enterAPrice', 'Nhập giá') },
                  { type: 'number', min: 1, message: t('admin.productForm.priceMustBeGreaterThan', 'Giá phải lớn hơn 0') },
                ]}
              >
                <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="originalPrice" label={t('admin.productForm.originalPriceEmptyIfNo', 'Giá gốc (trống nếu không giảm)')}>
                <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="reason" label={t('admin.common.reason', 'Lý do')} extra={t('admin.productForm.savedToPriceHistoryManual', 'Ghi vào lịch sử giá, mặc định MANUAL')}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
