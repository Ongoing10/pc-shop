import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import { MinusCircleOutlined, PlusOutlined, SaveOutlined, DollarOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
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
  const rules = [{ required: field.required, message: `Nhập ${field.label.toLowerCase()}` }];
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
          placeholder={field.options ? 'Chọn một hoặc nhiều' : 'Gõ rồi Enter'}
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

/** A03: tạo / sửa sản phẩm. Ô thông số sinh theo specSchema của danh mục. */
export const ProductFormPage: React.FC = () => {
  const { sku } = useParams<{ sku: string }>();
  const navigate = useNavigate();
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
  const { data: product, isLoading: loadingProduct } = useAdminProduct(sku);
  const [saving, setSaving] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);

  const categoryCode = Form.useWatch('categoryCode', form);
  const category = categories.find((c) => c.code === categoryCode);
  const schema = category?.specSchema ?? null;
  const compatFields = useMemo(() => schema?.filter((f) => f.group === 'compat') ?? [], [schema]);
  const specFields = useMemo(() => schema?.filter((f) => f.group === 'specs') ?? [], [schema]);

  useEffect(() => {
    if (!product) return;
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
    setFiles(
      (product.images ?? []).map((img, i) => ({ uid: `${i}`, name: `anh-${i + 1}`, status: 'done', url: img.url }))
    );
  }, [product, form]);

  if (isEdit && loadingProduct) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (isEdit && !product) {
    return (
      <Result
        status="404"
        title="Không tìm thấy sản phẩm"
        subTitle={`SKU ${sku} không tồn tại.`}
        extra={<Button onClick={() => navigate('/admin/products')}>Về danh sách</Button>}
      />
    );
  }

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
        message.success('Đã lưu thông tin sản phẩm');
      } else {
        const created = await createProduct.mutateAsync({
          ...common,
          sku: values.sku,
          price: values.price!,
          originalPrice: values.originalPrice ?? null,
          status: values.status === 2 ? 2 : 1,
        });
        message.success(`Đã tạo sản phẩm ${created.sku}`);
        navigate(`/admin/products/${created.sku}`, { replace: true });
      }
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) form.setFields([{ name: product ? 'slug' : 'sku', errors: [err.message || 'Đã tồn tại (409)'] }]);
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
        onSuccess: () => message.success(`Đã chuyển sang "${PRODUCT_STATUS_META[status].label}"`),
        onError: (e) => message.error(e.message),
      }
    );
  };

  const submitPrice = async () => {
    if (!product) return;
    const v = await priceForm.validateFields();
    if (v.price === product.price && (v.originalPrice ?? null) === product.originalPrice) {
      priceForm.setFields([{ name: 'price', errors: ['Giá không đổi'] }]);
      return;
    }
    try {
      await setProductPrice.mutateAsync({
        sku: product.sku,
        body: { price: v.price, originalPrice: v.originalPrice ?? null, reason: v.reason || null },
      });
      setPriceOpen(false);
      message.success('Đã đổi giá, lịch sử giá được ghi lại');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  // Đã công bố thì không quay về Nháp
  const statusOptions = (Object.keys(PRODUCT_STATUS_META).map(Number) as ProductStatus[])
    .filter((s) => !(s === 1 && product && product.status !== 1))
    .map((s) => ({ value: s, label: PRODUCT_STATUS_META[s].label }));

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: 'Sản phẩm', link: '/admin/products' }]}
        title={product ? product.name : 'Thêm sản phẩm'}
        subtitle={product ? <span className="admin-mono">{product.sku}</span> : 'Điền thông tin chung trước, ô thông số hiện theo danh mục'}
        extra={
          <>
            <Button onClick={() => navigate('/admin/products')}>Hủy</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>
              {product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{ status: 1, warrantyMonths: 36, tags: [] }}
        scrollToFirstError
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Flex vertical gap={16}>
              <Card title="Thông tin chung">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="sku"
                      label="SKU"
                      normalize={(v: string) => v?.toUpperCase()}
                      rules={[
                        { required: true, message: 'Nhập SKU' },
                        { pattern: /^[A-Z0-9-]+$/, message: 'Chỉ gồm A-Z, 0-9 và dấu gạch ngang' },
                        {
                          validator: (_, v) =>
                            !isEdit && products.some((p) => p.sku === v)
                              ? Promise.reject(new Error('SKU đã tồn tại'))
                              : Promise.resolve(),
                        },
                      ]}
                    >
                      <Input disabled={isEdit} placeholder="vd CPU-I5-14600K" className="admin-mono" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="slug" label="Slug" extra="Để trống sẽ tự sinh từ tên">
                      <Input placeholder="intel-core-i5-14600k" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, whitespace: true, message: 'Nhập tên' }]}>
                      <Input maxLength={200} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="categoryCode" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                      <Select
                        disabled={isEdit}
                        options={categories.map((c) => ({ value: c.code, label: c.name, disabled: !c.isActive }))}
                        placeholder="Chọn danh mục"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="brandCode" label="Thương hiệu">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={brands.map((b) => ({ value: b.code, label: b.name, disabled: !b.isActive }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="shortDescription" label="Mô tả ngắn">
                      <Input.TextArea rows={2} maxLength={300} showCount />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="description" label="Mô tả chi tiết" extra="Nội dung này cũng được đưa vào dữ liệu tư vấn AI">
                      <Input.TextArea rows={6} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="warrantyMonths" label="Bảo hành">
                      <InputNumber min={0} max={120} suffix="tháng" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="tags" label="Nhãn">
                      <Select mode="tags" placeholder="vd gaming, best-seller" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card title={category ? `Thông số ${category.name}` : 'Thông số'}>
                {!category && <Alert type="info" showIcon title="Chọn danh mục để hiện các ô thông số." />}

                {category && schema && (
                  <>
                    <Divider titlePlacement="start" plain>
                      Dùng để kiểm tra tương thích
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
                          Chỉ hiển thị
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
                      title="Danh mục này chưa khai bộ thông số"
                      description="Sản phẩm sẽ không được kiểm tra tương thích. Có thể nhập thông số hiển thị dạng tên / giá trị."
                      style={{ marginBottom: 16 }}
                    />
                    <Form.List name="freeSpecs">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name }) => (
                            <Space key={key} align="baseline" style={{ display: 'flex' }}>
                              <Form.Item name={[name, 'key']} rules={[{ required: true, message: 'Nhập tên' }]}>
                                <Input placeholder="Tên thông số" style={{ width: 220 }} />
                              </Form.Item>
                              <Form.Item name={[name, 'value']}>
                                <Input placeholder="Giá trị" style={{ width: 320 }} />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => remove(name)} aria-label="Xóa dòng" />
                            </Space>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                            Thêm thông số
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </>
                )}
              </Card>
            </Flex>
          </Col>

          <Col xs={24} xl={8}>
            <Flex vertical gap={16}>
              <Card title="Giá & trạng thái">
                {product ? (
                  <>
                    <Descriptions
                      column={1}
                      size="small"
                      items={[
                        { key: 'price', label: 'Giá bán', children: <b>{formatCurrency(product.price)}</b> },
                        {
                          key: 'orig',
                          label: 'Giá gốc',
                          children: product.originalPrice ? formatCurrency(product.originalPrice) : '–',
                        },
                        {
                          key: 'status',
                          label: 'Trạng thái',
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
                        Đổi giá
                      </Button>
                      <Select
                        value={product.status}
                        onChange={changeStatus}
                        options={statusOptions}
                        style={{ width: '100%' }}
                        prefix="Trạng thái:"
                      />
                    </Flex>
                  </>
                ) : (
                  <>
                    <Form.Item
                      name="price"
                      label="Giá bán"
                      rules={[
                        { required: true, message: 'Nhập giá bán' },
                        { type: 'number', min: 1, message: 'Giá phải lớn hơn 0' },
                      ]}
                    >
                      <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="originalPrice"
                      label="Giá gốc (gạch ngang)"
                      dependencies={['price']}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator: (_, v) =>
                            v == null || v > (getFieldValue('price') ?? 0)
                              ? Promise.resolve()
                              : Promise.reject(new Error('Giá gốc phải lớn hơn giá bán')),
                        }),
                      ]}
                    >
                      <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="status" label="Trạng thái khi tạo">
                      <Radio.Group
                        optionType="button"
                        options={[
                          { value: 1, label: 'Nháp' },
                          { value: 2, label: 'Đang bán' },
                        ]}
                      />
                    </Form.Item>
                  </>
                )}
              </Card>

              <Card title="Ảnh sản phẩm" extra={<Typography.Text type="secondary">Ảnh đầu là ảnh chính</Typography.Text>}>
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
                        message.error(`Không tải được ảnh: ${e.message}`);
                      });
                    return false;
                  }}
                  onRemove={(file) => setFiles((prev) => prev.filter((f) => f.uid !== file.uid))}
                >
                  {files.length < 8 && (
                    <button type="button" className="admin-upload-btn">
                      <PlusOutlined />
                      <div>Tải ảnh</div>
                    </button>
                  )}
                </Upload>
              </Card>
            </Flex>
          </Col>
        </Row>
      </Form>

      <Modal
        open={priceOpen}
        title="Đổi giá sản phẩm"
        okText="Lưu giá"
        cancelText="Hủy"
        onOk={submitPrice}
        onCancel={() => setPriceOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form form={priceForm} layout="vertical">
          <Form.Item
            name="price"
            label="Giá bán mới"
            rules={[
              { required: true, message: 'Nhập giá' },
              { type: 'number', min: 1, message: 'Giá phải lớn hơn 0' },
            ]}
          >
            <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="originalPrice" label="Giá gốc (để trống nếu không giảm giá)">
            <InputNumber suffix="₫" step={10000} formatter={moneyFormatter} parser={moneyParser} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" extra="Ghi vào lịch sử giá, mặc định MANUAL">
            <Input maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
